const dotenv = require('dotenv');
const path = require('path');

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// --- Required variables (crash if missing) ---
const required = ['OPENROUTER_API_KEY', 'MONGODB_URI', 'JWT_SECRET'];

for (const key of required) {
    if (!process.env[key]) {
        console.error(`❌  Missing required env var: ${key}`);
        process.exit(1);
    }
}

// --- Export frozen config object ---
const config = Object.freeze({
    port: parseInt(process.env.PORT, 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    isDev: (process.env.NODE_ENV || 'development') === 'development',

    // AI
    openRouterApiKey: process.env.OPENROUTER_API_KEY,

    // Database
    mongodbUri: process.env.MONGODB_URI,

    // Auth
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

    // Frontend
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

    // Logging
    logLevel: process.env.LOG_LEVEL || 'debug',

    // Feature flags
    enableBot: process.env.ENABLE_BOT !== 'false',

    // Presence
    presenceHeartbeatMs: parseInt(process.env.PRESENCE_HEARTBEAT_INTERVAL_MS, 10) || 30000,
    presenceTimeoutMs: parseInt(process.env.PRESENCE_TIMEOUT_MS, 10) || 60000,

    // Swipe
    swipeDeckSize: parseInt(process.env.SWIPE_DECK_SIZE, 10) || 20
});

module.exports = config;
