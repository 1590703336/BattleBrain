const PresenceService = require('../services/PresenceService');
const logger = require('../utils/logger');

module.exports = (io, socket) => {
    const user = socket.user;
    const userId = user.id;

    // 1. Handle go-online
    socket.on('go-online', () => {
        PresenceService.goOnline(userId, socket.id, user);

        // Broadcast to everyone else that this user is online
        // Note: In a real app, we might only broadcast to friends or relevant scope
        socket.broadcast.emit('user-online', {
            id: user.id,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl
        });
    });

    // 2. Handle heartbeat
    socket.on('heartbeat', () => {
        PresenceService.heartbeat(userId);
    });

    // 3. Handle disconnect
    socket.on('disconnect', () => {
        PresenceService.goOffline(userId);

        // Broadcast offline status
        io.emit('user-offline', { id: userId });

        logger.debug({ userId, socketId: socket.id }, '👋 Socket disconnected');
    });
};
