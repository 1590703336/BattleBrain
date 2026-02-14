const PresenceService = require('./PresenceService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class SwipeService {
    constructor() {
        // Set<"userId1:userId2"> - sorted so "a:b" is same as "b:a"
        this.swipedPairs = new Set();

        // Map<requestId, { requestId, from: User, to: User, topic, createdAt }>
        this.pendingRequests = new Map();

        // Clean up stale requests every minute
        setInterval(() => this.cleanupRequests(), 60_000);
    }

    /**
     * Get deck of cards (online users) for a user.
     * Excludes self and anyone already swiped on (either direction).
     */
    getCards(userId) {
        const onlineUsers = PresenceService.getOnlineUsers(userId);

        // Filter out users already swiped
        return onlineUsers.filter(target => {
            const pairId = this._getPairId(userId, target.id);
            return !this.swipedPairs.has(pairId);
        });
    }

    /**
     * Process a right swipe.
     * Returns { action: 'match' | 'request', data: ... }
     */
    swipeRight(fromUser, targetId, topic) {
        const targetSocketId = PresenceService.getSocketId(targetId);
        if (!targetSocketId) {
            throw new Error('User is offline');
        }

        const pairId = this._getPairId(fromUser.id, targetId);

        // Check if target already requested a battle (mutual match)
        // In a real app we'd track "likes" separately, but here "swipe right" = "battle request"
        // So if there is a pending request FROM target TO me, it's a match.

        // Find pending request from target to me
        const existingReq = [...this.pendingRequests.values()].find(
            req => req.from.id === targetId && req.to.id === fromUser.id
        );

        if (existingReq) {
            // Mutual match!
            this.pendingRequests.delete(existingReq.requestId);
            this.swipedPairs.add(pairId);

            return {
                action: 'match',
                data: {
                    player1: existingReq.from,
                    player2: fromUser,
                    topic: existingReq.topic // Use the original topic
                }
            };
        }

        // No mutual match yet, create a request
        const requestId = `req_${Date.now()}_${uuidv4().substring(0, 8)}`;
        const request = {
            requestId,
            from: fromUser,
            to: { id: targetId }, // We don't have full target object here, will be looked up by ID if needed
            topic: topic || 'Random Topic', // Should pick from constants
            createdAt: Date.now()
        };

        this.pendingRequests.set(requestId, request);

        // Track swipe so we don't show card again? 
        // Actually, usually we only block if processed. 
        // Here we'll treat a right swipe as "pending", so don't add to swipedPairs yet?
        // FRONTEND REQUIREMENT: "Skip a user. They won't appear in your card deck again this session." -> swipe-left
        // If I swipe right, I shouldn't see them again either.
        this.swipedPairs.add(pairId);

        return {
            action: 'request',
            data: request,
            targetSocketId
        };
    }

    /**
     * Process a left swipe (skip).
     */
    swipeLeft(userId, targetId) {
        const pairId = this._getPairId(userId, targetId);
        this.swipedPairs.add(pairId);
    }

    /**
     * Accept a battle request.
     */
    acceptBattle(requestId, acceptingUserId) {
        const request = this.pendingRequests.get(requestId);
        if (!request) {
            throw new Error('Request not found or expired');
        }

        if (request.to.id !== acceptingUserId) {
            throw new Error('Not authorized to accept this request');
        }

        this.pendingRequests.delete(requestId);

        // Fetch full accepting user profile?
        // It's passed in by the caller usually

        return request;
    }

    /**
     * Decline a battle request.
     */
    declineBattle(requestId, decliningUserId) {
        const request = this.pendingRequests.get(requestId);
        if (!request) return null;

        if (request.to.id !== decliningUserId) {
            // unauthorized
            return null;
        }

        this.pendingRequests.delete(requestId);
        return request;
    }

    _getPairId(id1, id2) {
        return [id1, id2].sort().join(':');
    }

    cleanupRequests() {
        const now = Date.now();
        for (const [id, req] of this.pendingRequests) {
            if (now - req.createdAt > 60_000) { // 1 min timeout
                this.pendingRequests.delete(id);
            }
        }
    }
}

module.exports = new SwipeService();
