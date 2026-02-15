const BattleService = require('../services/BattleService');
const { MAX_MESSAGE_LENGTH, MESSAGE_COOLDOWN_MS } = require('../config/constants');
const logger = require('../utils/logger');

// Simple in-memory rate limit: Map<userId, lastMessageTime>
const lastMessageTimes = new Map();

module.exports = (io, socket) => {
    const user = socket.user;

    socket.on('send-message', async ({ battleId, text }) => {
        let previousLastTime = 0;
        try {
            // 1. Validation
            if (!text || !text.trim()) return;
            if (text.length > MAX_MESSAGE_LENGTH) {
                socket.emit('rate-limited', { reason: 'message_too_long' });
                return;
            }

            // 2. Rate Limiting
            const lastTime = lastMessageTimes.get(user.id) || 0;
            previousLastTime = lastTime;
            const now = Date.now();
            const cooldownRemaining = MESSAGE_COOLDOWN_MS - (now - lastTime);

            if (cooldownRemaining > 0) {
                socket.emit('rate-limited', {
                    cooldownRemaining,
                    reason: 'message_cooldown'
                });
                return;
            }

            lastMessageTimes.set(user.id, now);

            // 3. Process Message
            await BattleService.sendMessage(battleId, user.id, text);

        } catch (err) {
            if (err?.code === 'message_turn') {
                if (previousLastTime > 0) {
                    lastMessageTimes.set(user.id, previousLastTime);
                } else {
                    lastMessageTimes.delete(user.id);
                }
                socket.emit('rate-limited', {
                    retryAfterMs: 0,
                    reason: 'message_turn'
                });
                return;
            }
            logger.error({ err, battleId }, 'Send message failed');
        }
    });

    socket.on('surrender-battle', ({ battleId }) => {
        try {
            if (!battleId) {
                return;
            }

            BattleService.surrenderBattle(battleId, user.id);
        } catch (err) {
            logger.error({ err, battleId, userId: user.id }, 'Surrender battle failed');
        }
    });

    // Handle disconnect (forfeit)
    socket.on('disconnect', () => {
        BattleService.handleDisconnect(user.id);
    });
};
