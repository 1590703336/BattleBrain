const PresenceService = require('../services/PresenceService');
const logger = require('../utils/logger');

module.exports = (io, socket) => {
    const user = socket.user;
    const userId = user.id;

    const markOnline = () => {
        PresenceService.goOnline(userId, socket.id, user);

        socket.broadcast.emit('user-online', {
            id: user.id,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            level: user.level
        });
    };

    // Auto-online on socket connect (frontend does not need explicit go-online).
    markOnline();

    // Optional manual refresh hook.
    socket.on('go-online', () => {
        markOnline();
    });

    socket.on('go-offline', () => {
        PresenceService.goOffline(userId);
    });

    // 2. Handle heartbeat
    socket.on('heartbeat', () => {
        PresenceService.heartbeat(userId);
    });

    // 3. Handle disconnect
    socket.on('disconnect', () => {
        PresenceService.goOffline(userId);
        logger.debug({ userId, socketId: socket.id }, '👋 Socket disconnected');
    });
};
