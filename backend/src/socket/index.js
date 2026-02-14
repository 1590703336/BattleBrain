const { Server } = require('socket.io');
const config = require('../config/env');
const logger = require('../utils/logger');
const { socketAuth } = require('../middleware/authMiddleware');

// Handlers (will be imported as we build them)
const presenceHandler = require('./presenceHandler');
const swipeHandler = require('./swipeHandler');
const queueHandler = require('./queueHandler');
const battleHandler = require('./battleHandler');

let io;

function setupSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: config.frontendUrl,
            methods: ['GET', 'POST'],
            credentials: true
        },
        // Transports: Allow both for best compatibility, but prefer websocket
        transports: ['websocket', 'polling']
    });

    // Global Middleware: Auth Check
    io.use((socket, next) => {
        socketAuth(socket, next);
    });

    // Connection Handler
    io.on('connection', (socket) => {
        const user = socket.user; // attached by socketAuth
        logger.info({ socketId: socket.id, userId: user.id }, '🔌 Socket connected');

        // Register Handlers
        presenceHandler(io, socket);
        swipeHandler(io, socket);
        queueHandler(io, socket);
        battleHandler(io, socket);

        // Global Error Handler for this socket
        socket.on('error', (err) => {
            logger.error({ socketId: socket.id, err }, 'Socket error');
        });
    });

    logger.info('✅ Socket.IO initialized');
    return io;
}

// Export singleton accessor if needed elsewhere
function getIO() {
    if (!io) {
        throw new Error('Socket.IO not initialized!');
    }
    return io;
}

module.exports = { setupSocket, getIO };
