const http = require('http');
const config = require('./config/env');  // loads + validates .env
const logger = require('./utils/logger');
const { connectDB } = require('./config/database');
const app = require('./app');

async function main() {
    // 1. Connect to MongoDB
    await connectDB(config.mongodbUri);

    // 2. Create HTTP server
    const server = http.createServer(app);

    // 3. Setup Socket.IO
    const { setupSocket } = require('./socket');
    setupSocket(server);

    // 3. Start listening
    server.listen(config.port, () => {
        logger.info(`🚀 Server running on port ${config.port} (${config.nodeEnv})`);
        logger.info(`❤️  Health check:  http://localhost:${config.port}/health`);
        logger.info(`📝 Auth signup:   POST http://localhost:${config.port}/api/auth/signup`);
        logger.info(`🔑 Auth login:    POST http://localhost:${config.port}/api/auth/login`);
    });

    // 4. Graceful shutdown
    const shutdown = (signal) => {
        logger.info(`${signal} received — shutting down`);
        server.close(() => {
            logger.info('HTTP server closed');
            process.exit(0);
        });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
});

// Force restart for uuid install
