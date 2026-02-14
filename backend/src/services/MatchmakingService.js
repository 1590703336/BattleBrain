const PresenceService = require('./PresenceService');
const BattleService = require('./BattleService');
const { BOT_MATCH_TIMEOUT_MS, TOPICS } = require('../config/constants');
const logger = require('../utils/logger');

class MatchmakingService {
    constructor() {
        // Array<{ userId, socketId, user, joinedAt, timeoutId }>
        this.queue = [];
    }

    joinQueue(userId, socketId, user) {
        if (this.queue.some(p => p.userId === userId)) {
            return; // Already in queue
        }

        logger.debug({ userId }, 'Joined queue');

        const entry = {
            userId,
            socketId,
            user, // Full user profile
            joinedAt: Date.now(),
            timeoutId: setTimeout(() => this.matchWithBot(userId), BOT_MATCH_TIMEOUT_MS)
        };

        this.queue.push(entry);
        this.attemptMatch();
    }

    leaveQueue(userId) {
        const index = this.queue.findIndex(p => p.userId === userId);
        if (index !== -1) {
            clearTimeout(this.queue[index].timeoutId);
            this.queue.splice(index, 1);
            logger.debug({ userId }, 'Left queue');
        }
    }

    attemptMatch() {
        if (this.queue.length < 2) return;

        // Simple FIFO matching: take first two
        // In real app: sort by ELO or level
        const player1 = this.queue.shift();
        const player2 = this.queue.shift();

        // Clear their bot timeouts
        clearTimeout(player1.timeoutId);
        clearTimeout(player2.timeoutId);

        logger.info({ p1: player1.userId, p2: player2.userId }, 'Match found in queue');

        // Create Battle
        const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
        const battleData = BattleService.createBattle(player1.user, player2.user, topic);

        // Notify players (direct socket emit or via handler?)
        // Service shouldn't emit directly usually, but for simplicity here we return data 
        // or we can use the socket IDs we stored to emit via IO if we had access.

        // Better pattern: Return match result or use callback/event emitter
        // But since this is called async inside `joinQueue`, the caller (handler) might have returned already.
        // So we need access to IO or a way to notify.

        const io = require('../socket').getIO(); // Circular dep workaround or passed in

        if (io) {
            io.to(player1.socketId).emit('battle-start', battleData);
            io.to(player2.socketId).emit('battle-start', battleData);
        }
    }

    matchWithBot(userId) {
        const index = this.queue.findIndex(p => p.userId === userId);
        if (index === -1) return; // User left queue

        const player = this.queue.splice(index, 1)[0];
        logger.info({ userId }, 'Matched with Bot');

        // Create Bot User
        const botUser = {
            id: 'bot_ai_001',
            displayName: 'BattleBot 3000',
            avatarUrl: '', // fast-load placeholder
            stats: { totalBattles: 999, wins: 500, losses: 499, winRate: 50 }
        };

        const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
        const battleData = BattleService.createBattle(player.user, botUser, topic);

        const io = require('../socket').getIO();
        if (io) {
            io.to(player.socketId).emit('battle-start', battleData);
        }
    }
}

module.exports = new MatchmakingService();
