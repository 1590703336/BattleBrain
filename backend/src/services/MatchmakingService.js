const BattleService = require('./BattleService');
const AIService = require('./AIService');
const User = require('../models/User');
const { BOT_MATCH_TIMEOUT_MS } = require('../config/constants');
const logger = require('../utils/logger');

const QUEUE_ETA_STEP_SEC = 3;
const TOPIC_GENERATION_MIN_WAIT_MS = 900;

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

class MatchmakingService {
    constructor() {
        // Array<{ userId, socketId, user, joinedAt, timeoutId }>
        this.queue = [];
    }

    joinQueue(userId, socketId, user) {
        const existing = this.queue.find((entry) => entry.userId === userId);
        if (existing) {
            existing.socketId = socketId;
            existing.user = user;
            const payload = this.getWaitingPayload(userId);
            if (payload) {
                this.emitWaitingToUser(existing.socketId, payload);
            }
            return payload;
        }

        logger.debug({ userId }, 'Joined queue');

        const entry = {
            userId,
            socketId,
            user,
            joinedAt: Date.now(),
            timeoutId: setTimeout(() => {
                this.matchWithBot(userId).catch((err) => {
                    logger.error({ err, userId }, 'Failed to match with bot');
                });
            }, BOT_MATCH_TIMEOUT_MS)
        };

        this.queue.push(entry);
        const waitingPayload = this.getWaitingPayload(userId);
        this.broadcastQueueWaiting();
        this.attemptMatch().catch((err) => {
            logger.error({ err }, 'Queue match attempt failed');
        });
        return waitingPayload;
    }

    leaveQueue(userId) {
        const index = this.queue.findIndex((entry) => entry.userId === userId);
        if (index === -1) {
            return;
        }

        clearTimeout(this.queue[index].timeoutId);
        this.queue.splice(index, 1);
        logger.debug({ userId }, 'Left queue');
        this.broadcastQueueWaiting();
    }

    getWaitingPayload(userId) {
        const index = this.queue.findIndex((entry) => entry.userId === userId);
        if (index === -1) {
            return null;
        }

        const entry = this.queue[index];
        const position = index + 1;
        const etaSec = this.computeEtaSec(position);

        return {
            queueId: `q_${userId}_${entry.joinedAt}`,
            position,
            etaSec
        };
    }

    computeEtaSec(position) {
        if (position <= 1) {
            return Math.ceil(BOT_MATCH_TIMEOUT_MS / 1000);
        }
        return Math.max(2, (position - 1) * QUEUE_ETA_STEP_SEC);
    }

    emitWaitingToUser(socketId, payload) {
        const io = require('../socket').getIO();
        io.to(socketId).emit('waiting', payload);
    }

    broadcastQueueWaiting() {
        const io = require('../socket').getIO();
        this.queue.forEach((entry) => {
            const payload = this.getWaitingPayload(entry.userId);
            if (payload) {
                io.to(entry.socketId).emit('waiting', payload);
            }
        });
    }

    async attemptMatch() {
        if (this.queue.length < 2) {
            return;
        }

        const player1 = this.queue.shift();
        const player2 = this.queue.shift();

        clearTimeout(player1.timeoutId);
        clearTimeout(player2.timeoutId);

        logger.info({ p1: player1.userId, p2: player2.userId }, 'Match found in queue');

        const io = require('../socket').getIO();
        const topicEtaSec = Math.ceil(TOPIC_GENERATION_MIN_WAIT_MS / 1000);
        io.to(player1.socketId).emit('waiting', { queueId: `topic_${Date.now()}`, position: 1, etaSec: topicEtaSec });
        io.to(player2.socketId).emit('waiting', { queueId: `topic_${Date.now()}_2`, position: 1, etaSec: topicEtaSec });

        const [topic] = await Promise.all([
            AIService.generateBattleTopic({
                playerA: player1.user?.displayName || player1.user?.name || 'Player A',
                playerB: player2.user?.displayName || player2.user?.name || 'Player B'
            }),
            wait(TOPIC_GENERATION_MIN_WAIT_MS)
        ]);
        const battleData = BattleService.createBattle(player1.user, player2.user, topic);

        io.to(player1.socketId).emit('battle-start', BattleService.buildBattleStartPayloadForPlayer(battleData, player1.userId));
        io.to(player2.socketId).emit('battle-start', BattleService.buildBattleStartPayloadForPlayer(battleData, player2.userId));

        this.broadcastQueueWaiting();
    }

    async getOrCreateQueueBotUser() {
        const email = 'queue.bot@battlebrain.ai';
        let bot = await User.findOne({ email });

        if (!bot) {
            bot = await User.create({
                email,
                password: 'queue_bot_default',
                displayName: 'BattleBot 3000',
                avatarUrl: '',
                bio: 'Queue auto-match AI bot',
                level: 12,
                xp: 2600,
                stats: {
                    wins: 120,
                    losses: 95,
                    draws: 10,
                    totalBattles: 225,
                    messageCount: 0,
                    goodStrikes: 0,
                    toxicStrikes: 0,
                    totalDamageDealt: 0,
                    totalDamageTaken: 0,
                    avgWit: 70,
                    avgRelevance: 65,
                    avgToxicity: 18
                }
            });
        }

        const payload = bot.toJSON();
        payload.isAi = true;
        return payload;
    }

    async matchWithBot(userId) {
        const index = this.queue.findIndex((entry) => entry.userId === userId);
        if (index === -1) {
            return;
        }

        const player = this.queue.splice(index, 1)[0];
        clearTimeout(player.timeoutId);

        logger.info({ userId }, 'Matched with Bot');

        const botUser = await this.getOrCreateQueueBotUser();
        const io = require('../socket').getIO();
        const topicEtaSec = Math.ceil(TOPIC_GENERATION_MIN_WAIT_MS / 1000);
        io.to(player.socketId).emit('waiting', {
            queueId: `topic_${Date.now()}_${userId}`,
            position: 1,
            etaSec: topicEtaSec
        });

        const [topic] = await Promise.all([
            AIService.generateBattleTopic({
                playerA: player.user?.displayName || player.user?.name || 'Player A',
                playerB: botUser?.displayName || botUser?.name || 'Battle Bot'
            }),
            wait(TOPIC_GENERATION_MIN_WAIT_MS)
        ]);
        const battleData = BattleService.createBattle(player.user, botUser, topic);

        io.to(player.socketId).emit('battle-start', BattleService.buildBattleStartPayloadForPlayer(battleData, player.userId));
        this.broadcastQueueWaiting();
    }
}

module.exports = new MatchmakingService();
