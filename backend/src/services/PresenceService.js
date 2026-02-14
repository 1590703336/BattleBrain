const logger = require('../utils/logger');
const { PRESENCE_TIMEOUT_MS } = require('../config/constants');

class PresenceService {
    constructor() {
        // Map<userId, { socketId, user, lastHeartbeat }>
        this.onlineUsers = new Map();

        // Start cleanup interval
        // Check every 15 seconds for stale users
        setInterval(() => this.cleanupStaleUsers(), 15000);
    }

    /**
     * Mark user as online.
     * If user already exists (reconnect), update socketId and timestamp.
     */
    goOnline(userId, socketId, user) {
        this.onlineUsers.set(userId, {
            socketId,
            user,
            lastHeartbeat: Date.now()
        });

        logger.debug({ userId, socketId }, 'User went online');
    }

    /**
     * Mark user as offline.
     */
    goOffline(userId) {
        if (this.onlineUsers.has(userId)) {
            this.onlineUsers.delete(userId);
            logger.debug({ userId }, 'User went offline');
        }
    }

    /**
     * Update heartbeat timestamp.
     */
    heartbeat(userId) {
        const entry = this.onlineUsers.get(userId);
        if (entry) {
            entry.lastHeartbeat = Date.now();
            // Optional: quite debug log to avoid spam
            // logger.debug({ userId }, 'Heartbeat received');
        }
    }

    /**
     * Get list of online users, optionally excluding one (e.g. self).
     * Returns array of user objects.
     */
    getOnlineUsers(excludeUserId = null) {
        const users = [];
        for (const [id, entry] of this.onlineUsers) {
            if (id !== excludeUserId) {
                users.push(entry.user);
            }
        }
        return users;
    }

    /**
     * Return socketId for a given userId (useful for direct messaging).
     */
    getSocketId(userId) {
        return this.onlineUsers.get(userId)?.socketId;
    }

    /**
     * Remove users who haven't sent a heartbeat recently.
     * Returns list of removed userIds.
     */
    cleanupStaleUsers() {
        const now = Date.now();
        const removedIds = [];

        for (const [userId, entry] of this.onlineUsers) {
            if (now - entry.lastHeartbeat > PRESENCE_TIMEOUT_MS) {
                this.onlineUsers.delete(userId);
                removedIds.push(userId);
                logger.info({ userId, timeSinceHeartbeat: now - entry.lastHeartbeat }, 'User timed out');
            }
        }

        return removedIds;
    }
}

// Export singleton
module.exports = new PresenceService();
