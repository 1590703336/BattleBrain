const pino = require('pino');
const config = require('../config/env');

const logger = pino({
    level: config.logLevel,
    transport: config.isDev
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
        : undefined
});

module.exports = logger;
