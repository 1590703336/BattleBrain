const mongoose = require('mongoose');
const logger = require('../utils/logger');

async function connectDB(uri) {
    try {
        await mongoose.connect(uri, {
            dbName: 'battlebrain',
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            family: 4   // Force IPv4 — fixes ENOTFOUND on networks with IPv6/SRV issues
        });
        logger.info('✅ MongoDB connected successfully');
    } catch (err) {
        logger.error('❌ MongoDB connection failed: %s', err.message);
        process.exit(1);
    }

    mongoose.connection.on('error', (err) => {
        logger.error({ err }, '❌ MongoDB connection error');
    });

    mongoose.connection.on('disconnected', () => {
        logger.warn('⚠️  MongoDB disconnected');
    });
}

module.exports = { connectDB };
