const MatchmakingService = require('../services/MatchmakingService');

module.exports = (io, socket) => {
    const user = socket.user;

    // 1. Join Queue
    socket.on('join-queue', () => {
        MatchmakingService.joinQueue(user.id, socket.id, user);
        socket.emit('waiting');
    });

    // 2. Leave Queue
    socket.on('leave-queue', () => {
        MatchmakingService.leaveQueue(user.id);
    });

    // 3. Disconnect (auto-leave)
    socket.on('disconnect', () => {
        MatchmakingService.leaveQueue(user.id);
    });
};
