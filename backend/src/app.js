const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const battleRoutes = require('./routes/battleRoutes');

const app = express();

// --- Core middleware ---
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());
app.use(requestLogger);

// ============================
//  HTTP Routes
// ============================

// --- Health check ---
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/battles', battleRoutes);

// --- Centralized error handler (must be last) ---
app.use(errorHandler);

module.exports = app;
