const BattleService = require('../services/BattleService');
const { MAX_MESSAGE_LENGTH, MESSAGE_COOLDOWN_MS } = require('../config/constants');
const logger = require('../utils/logger');

// Simple in-memory rate limit: Map<userId, lastMessageTime>
const lastMessageTimes = new Map();

module.exports = (io, socket) => {
    const user = socket.user;

    socket.on('send-message', async ({ battleId, text }) => {
        try {
            // 1. Validation
            if (!text || !text.trim()) return;
            if (text.length > MAX_MESSAGE_LENGTH) {
                socket.emit('rate-limited', { reason: 'message_too_long' });
                return;
            }

            // 2. Rate Limiting
            const lastTime = lastMessageTimes.get(user.id) || 0;
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
            logger.error({ err, battleId }, 'Send message failed');
        }
    });

    // Handle disconnect (forfeit)
    socket.on('disconnect', () => {
        BattleService.handleDisconnect(user.id);
    });
};
