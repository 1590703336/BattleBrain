const MatchmakingService = require('../services/MatchmakingService');

module.exports = (io, socket) => {
    const user = socket.user;

    // 1. Join Queue
    socket.on('join-queue', ({ mode } = {}) => {
        if (mode && mode !== 'quick') {
            return;
        }

        const payload = MatchmakingService.joinQueue(user.id, socket.id, user);
        if (payload) {
            socket.emit('waiting', payload);
        }
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
