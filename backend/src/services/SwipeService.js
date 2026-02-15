const { randomUUID } = require('crypto');
const PresenceService = require('./PresenceService');
const User = require('../models/User');
const config = require('../config/env');
const logger = require('../utils/logger');
const { SWIPE_REQUEST_TIMEOUT_MS } = require('../config/constants');
const AI_BOT_PERSONAS = require('../config/aiBots');

class SwipeService {
    constructor() {
        // Set<"userId1:userId2"> - sorted so "a:b" is the same as "b:a"
        this.swipedPairs = new Set();

        // Map<requestId, { requestId, from, to, createdAt, timeoutId }>
        this.pendingRequests = new Map();

        // Map<userId, AI card payload>
        this.aiCardsById = new Map();

        this.aiBootstrapPromise = null;
    }

    async ensureAiUsers() {
        if (this.aiCardsById.size === AI_BOT_PERSONAS.length) {
            return [...this.aiCardsById.values()];
        }

        if (this.aiBootstrapPromise) {
            return this.aiBootstrapPromise;
        }

        this.aiBootstrapPromise = this.bootstrapAiUsers()
            .finally(() => {
                this.aiBootstrapPromise = null;
            });

        return this.aiBootstrapPromise;
    }

    async bootstrapAiUsers() {
        const cards = [];

        for (const [index, seed] of AI_BOT_PERSONAS.entries()) {
            let bot = await User.findOne({ email: seed.email });

            if (!bot) {
                bot = await User.create({
                    email: seed.email,
                    password: `swipe_bot_${index + 1}_default`,
                    displayName: seed.displayName,
                    avatarUrl: '',
                    bio: seed.bio,
                    level: seed.level,
                    xp: seed.level * 220,
                    stats: {
                        wins: 40 + index * 7,
                        losses: 22 + index * 4,
                        draws: 4,
                        totalBattles: 66 + index * 11,
                        messageCount: 900 + index * 120,
                        goodStrikes: 280 + index * 35,
                        toxicStrikes: 40 + index * 6,
                        totalDamageDealt: 6500 + index * 700,
                        totalDamageTaken: 6100 + index * 680,
                        avgWit: 68 + index,
                        avgRelevance: 64 + index,
                        avgToxicity: 18
                    }
                });
            }

            const payload = bot.toJSON();
            const card = this.toCardPayload(payload, seed.humorStyle, true);
            cards.push(card);
            this.aiCardsById.set(card.id, card);
        }

        logger.debug({ count: cards.length }, 'Swipe AI users ready');
        return cards;
    }

    toCardPayload(user, fallbackHumorStyle = 'Adaptive Banter', isAi = false) {
        const id = String(user.id || user._id || '');
        return {
            id,
            displayName: user.displayName || user.name || 'Unknown',
            name: user.displayName || user.name || 'Unknown',
            avatarUrl: user.avatarUrl || '',
            level: Number.isFinite(Number(user.level)) ? Number(user.level) : 1,
            bio: user.bio || '',
            humorStyle: fallbackHumorStyle,
            isAi
        };
    }

    sanitizeRequestUser(user) {
        return {
            id: String(user.id || user._id || ''),
            displayName: user.displayName || user.name || 'Unknown',
            name: user.displayName || user.name || 'Unknown',
            avatarUrl: user.avatarUrl || '',
            level: Number.isFinite(Number(user.level)) ? Number(user.level) : 1
        };
    }

    shuffleCards(cards) {
        return [...cards].sort(() => Math.random() - 0.5);
    }

    async getCards(userId) {
        const aiCards = await this.ensureAiUsers();
        const onlineUsers = PresenceService.getOnlineUsers(userId)
            .filter((entry) => !this.aiCardsById.has(String(entry.id || entry._id || '')));

        const humanCards = onlineUsers.map((entry) => this.toCardPayload(entry, 'Live Challenger', false));
        const availableHumans = humanCards
            .filter((entry) => String(entry.id) !== String(userId))
            .filter((entry) => !this.swipedPairs.has(this._getPairId(userId, entry.id)));
        const availableAi = aiCards
            .filter((entry) => String(entry.id) !== String(userId))
            .filter((entry) => !this.swipedPairs.has(this._getPairId(userId, entry.id)));

        // Queue/swipe ordering rule: show humans first, AI agents after.
        const prioritized = [...this.shuffleCards(availableHumans), ...this.shuffleCards(availableAi)];
        const deckSize = Math.max(1, Number(config.swipeDeckSize || 20));
        return prioritized.slice(0, deckSize);
    }

    async swipeRight(fromUser, targetId) {
        const cards = await this.ensureAiUsers();
        const normalizedFrom = this.sanitizeRequestUser(fromUser);
        const pairId = this._getPairId(normalizedFrom.id, targetId);
        this.swipedPairs.add(pairId);

        if (this.aiCardsById.has(targetId)) {
            const aiCard = cards.find((entry) => entry.id === targetId) || this.aiCardsById.get(targetId);
            return {
                action: 'ai-match',
                data: {
                    opponent: aiCard
                }
            };
        }

        const targetSocketId = PresenceService.getSocketId(targetId);
        if (!targetSocketId) {
            return {
                action: 'timeout',
                data: {
                    targetId,
                    reason: 'offline'
                }
            };
        }

        const duplicateRequest = [...this.pendingRequests.values()].find(
            (request) => request.from.id === normalizedFrom.id && request.to.id === targetId
        );

        if (duplicateRequest) {
            return {
                action: 'request',
                data: {
                    ...duplicateRequest,
                    expiresInSec: Math.max(
                        1,
                        Math.ceil((duplicateRequest.createdAt + SWIPE_REQUEST_TIMEOUT_MS - Date.now()) / 1000)
                    )
                },
                targetSocketId
            };
        }

        const requestId = `req_${Date.now()}_${randomUUID().slice(0, 8)}`;
        const request = {
            requestId,
            from: normalizedFrom,
            to: { id: targetId },
            createdAt: Date.now(),
            timeoutId: null
        };

        request.timeoutId = setTimeout(() => {
            this.expireRequest(requestId);
        }, SWIPE_REQUEST_TIMEOUT_MS);

        this.pendingRequests.set(requestId, request);

        return {
            action: 'request',
            data: {
                ...request,
                expiresInSec: Math.ceil(SWIPE_REQUEST_TIMEOUT_MS / 1000)
            },
            targetSocketId
        };
    }

    swipeLeft(userId, targetId) {
        const pairId = this._getPairId(userId, targetId);
        this.swipedPairs.add(pairId);
    }

    acceptBattle(requestId, acceptingUserId) {
        const request = this.pendingRequests.get(requestId);
        if (!request) {
            throw new Error('Request not found or expired');
        }

        if (request.to.id !== acceptingUserId) {
            throw new Error('Not authorized to accept this request');
        }

        this.clearRequest(requestId);

        const senderSocketId = PresenceService.getSocketId(request.from.id);
        if (!senderSocketId) {
            return {
                action: 'timeout',
                data: {
                    requestId,
                    targetId: request.from.id,
                    reason: 'offline'
                }
            };
        }

        return {
            action: 'match',
            data: request
        };
    }

    declineBattle(requestId, decliningUserId) {
        const request = this.pendingRequests.get(requestId);
        if (!request) {
            return null;
        }

        if (request.to.id !== decliningUserId) {
            return null;
        }

        this.clearRequest(requestId);
        return request;
    }

    expireRequest(requestId) {
        const request = this.pendingRequests.get(requestId);
        if (!request) {
            return;
        }

        this.clearRequest(requestId);

        const fromSocketId = PresenceService.getSocketId(request.from.id);
        if (fromSocketId) {
            const io = require('../socket').getIO();
            io.to(fromSocketId).emit('battle-request-timeout', {
                requestId: request.requestId,
                targetId: request.to.id,
                reason: 'timeout'
            });
        }
    }

    handleUserOffline(userId) {
        const affected = [...this.pendingRequests.values()].filter(
            (request) => request.from.id === userId || request.to.id === userId
        );

        for (const request of affected) {
            this.clearRequest(request.requestId);

            if (request.to.id === userId) {
                const senderSocketId = PresenceService.getSocketId(request.from.id);
                if (senderSocketId) {
                    const io = require('../socket').getIO();
                    io.to(senderSocketId).emit('battle-request-timeout', {
                        requestId: request.requestId,
                        targetId: request.to.id,
                        reason: 'offline'
                    });
                }
            }
        }
    }

    clearRequest(requestId) {
        const request = this.pendingRequests.get(requestId);
        if (!request) {
            return;
        }

        if (request.timeoutId) {
            clearTimeout(request.timeoutId);
        }

        this.pendingRequests.delete(requestId);
    }

    resetUserMatchState(userId) {
        const normalizedUserId = String(userId || '');
        if (!normalizedUserId) {
            return;
        }

        for (const pairId of [...this.swipedPairs]) {
            const [left, right] = pairId.split(':');
            if (left === normalizedUserId || right === normalizedUserId) {
                this.swipedPairs.delete(pairId);
            }
        }

        for (const request of [...this.pendingRequests.values()]) {
            if (request.from.id === normalizedUserId || request.to.id === normalizedUserId) {
                this.clearRequest(request.requestId);
            }
        }
    }

    _getPairId(id1, id2) {
        return [String(id1), String(id2)].sort().join(':');
    }
}

module.exports = new SwipeService();
