const SwipeService = require('../services/SwipeService');
const BattleService = require('../services/BattleService');
const PresenceService = require('../services/PresenceService');
const { SWIPE_AI_MATCH_DELAY_MS, TOPICS } = require('../config/constants');
const logger = require('../utils/logger');

function randomTopic() {
    return TOPICS[Math.floor(Math.random() * TOPICS.length)];
}

module.exports = (io, socket) => {
    const user = socket.user;

    socket.on('get-cards', async () => {
        try {
            const cards = await SwipeService.getCards(user.id);
            socket.emit('online-users', cards);
        } catch (err) {
            logger.error({ err, userId: user.id }, 'Failed to load swipe cards');
        }
    });

    socket.on('swipe-right', async ({ targetId }) => {
        if (!targetId) {
            return;
        }

        try {
            const result = await SwipeService.swipeRight(user, targetId, randomTopic());

            if (result.action === 'timeout') {
                socket.emit('battle-request-timeout', {
                    targetId,
                    reason: result.data.reason || 'offline'
                });
                return;
            }

            if (result.action === 'ai-match') {
                const waitingPayload = {
                    queueId: `swipe_ai_${Date.now()}`,
                    position: 1,
                    etaSec: Math.ceil(SWIPE_AI_MATCH_DELAY_MS / 1000)
                };

                socket.emit('waiting', waitingPayload);

                setTimeout(() => {
                    if (socket.disconnected) {
                        return;
                    }

                    const battleData = BattleService.createBattle(user, result.data.opponent, result.data.topic);
                    socket.emit('battle-start', battleData);
                }, SWIPE_AI_MATCH_DELAY_MS);
                return;
            }

            if (result.action === 'request') {
                const { targetSocketId, data } = result;

                io.to(targetSocketId).emit('battle-request', {
                    requestId: data.requestId,
                    from: data.from,
                    topic: data.topic,
                    expiresInSec: data.expiresInSec
                });

                socket.emit('waiting', {
                    queueId: data.requestId,
                    position: 1,
                    etaSec: data.expiresInSec
                });
            }
        } catch (err) {
            logger.warn({ err, userId: user.id, targetId }, 'Swipe-right failed');
            socket.emit('battle-request-timeout', {
                targetId,
                reason: 'offline'
            });
        }
    });

    socket.on('swipe-left', ({ targetId }) => {
        if (!targetId) {
            return;
        }
        SwipeService.swipeLeft(user.id, targetId);
    });

    socket.on('accept-battle', ({ requestId }) => {
        if (!requestId) {
            return;
        }

        try {
            const result = SwipeService.acceptBattle(requestId, user.id);

            if (result.action === 'timeout') {
                socket.emit('battle-request-timeout', {
                    requestId,
                    targetId: result.data.targetId,
                    reason: result.data.reason
                });
                return;
            }

            const request = result.data;
            const senderSocketId = PresenceService.getSocketId(request.from.id);
            if (!senderSocketId) {
                socket.emit('battle-request-timeout', {
                    requestId,
                    targetId: request.from.id,
                    reason: 'offline'
                });
                return;
            }

            const battleData = BattleService.createBattle(request.from, user, request.topic);
            io.to(senderSocketId).emit('battle-start', battleData);
            socket.emit('battle-start', battleData);
        } catch (err) {
            logger.error({ err, userId: user.id, requestId }, 'Accept battle failed');
            socket.emit('battle-request-timeout', {
                requestId,
                reason: 'timeout'
            });
        }
    });

    socket.on('decline-battle', ({ requestId }) => {
        if (!requestId) {
            return;
        }

        const request = SwipeService.declineBattle(requestId, user.id);
        if (!request) {
            return;
        }

        const senderSocketId = PresenceService.getSocketId(request.from.id);
        if (!senderSocketId) {
            return;
        }

        io.to(senderSocketId).emit('battle-request-declined', {
            requestId,
            by: user.id
        });
    });

    socket.on('disconnect', () => {
        SwipeService.handleUserOffline(user.id);
    });
};
