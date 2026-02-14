const SwipeService = require('../services/SwipeService');
const BattleService = require('../services/BattleService'); // Will implement next
const { TOPICS } = require('../config/constants');
const logger = require('../utils/logger');

module.exports = (io, socket) => {
    const user = socket.user;

    // 1. Get Cards
    socket.on('get-cards', () => {
        try {
            const cards = SwipeService.getCards(user.id);
            // Shuffle cards?
            const shuffled = cards.sort(() => 0.5 - Math.random());
            socket.emit('online-users', shuffled);
        } catch (err) {
            logger.error({ err }, 'Error getting cards');
        }
    });

    // 2. Swipe Right
    socket.on('swipe-right', ({ targetId }) => {
        try {
            // Pick random topic for the potential battle
            const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];

            const result = SwipeService.swipeRight(user, targetId, topic);

            if (result.action === 'match') {
                // Mutual match -> Start Battle
                const { player1, player2, topic } = result.data;

                // This relies on BattleService to be implemented
                // For now, we'll try to call it, but it might not exist yet if running strictly phase request
                // But since they are part of same "Phase 3 implementation step" in my head, I should import it.
                // Wait, BattleService is Phase 4.
                // Detailed plan said: "Listen: swipe-right → emit battle-request to target OR battle-start if mutual"
                // I need to be able to start a battle here. 
                // I will stub BattleService for now or implement it in next step.
                // Actually, I'll return 'battle-start' payload directly here or import BattleService.

                if (BattleService.createBattle) {
                    const battleData = BattleService.createBattle(player1, player2, topic);
                    io.to(PresenceService.getSocketId(player1.id)).emit('battle-start', battleData);
                    io.to(PresenceService.getSocketId(player2.id)).emit('battle-start', battleData);
                } else {
                    logger.warn("BattleService not ready, cannot start battle");
                }

            } else if (result.action === 'request') {
                // Send request to target
                const { targetSocketId, data } = result;
                io.to(targetSocketId).emit('battle-request', {
                    requestId: data.requestId,
                    from: data.from,
                    topic: data.topic
                });
            }
        } catch (err) {
            // e.g. user offline
            logger.warn({ err }, 'Swipe right failed');
        }
    });

    // 3. Swipe Left
    socket.on('swipe-left', ({ targetId }) => {
        SwipeService.swipeLeft(user.id, targetId);
    });

    // 4. Accept Battle
    socket.on('accept-battle', ({ requestId }) => {
        try {
            const request = SwipeService.acceptBattle(requestId, user.id);

            // Start Battle
            const player1 = request.from;
            const player2 = user;

            if (BattleService.createBattle) {
                const battleData = BattleService.createBattle(player1, player2, request.topic);

                const s1 = PresenceService.getSocketId(player1.id);
                const s2 = socket.id;

                if (s1) io.to(s1).emit('battle-start', battleData);
                io.to(s2).emit('battle-start', battleData);
            }
        } catch (err) {
            logger.error({ err }, 'Accept battle failed');
        }
    });

    // 5. Decline Battle
    socket.on('decline-battle', ({ requestId }) => {
        const request = SwipeService.declineBattle(requestId, user.id);
        if (request) {
            const senderSocket = PresenceService.getSocketId(request.from.id);
            if (senderSocket) {
                io.to(senderSocket).emit('battle-request-declined', {
                    requestId,
                    by: user.id
                });
            }
        }
    });
};

// Re-require PresenceService inside just to be safe about circular deps if not wary
const PresenceService = require('../services/PresenceService');
