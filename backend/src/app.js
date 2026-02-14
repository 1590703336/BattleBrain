const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const AuthService = require('./services/AuthService');

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

// --- Auth: Signup ---
app.post('/api/auth/signup', async (req, res, next) => {
    try {
        const { email, password, displayName } = req.body;
        const result = await AuthService.signup(email, password, displayName);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
});

// --- Auth: Login ---
app.post('/api/auth/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await AuthService.login(email, password);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// --- Centralized error handler (must be last) ---
app.use(errorHandler);

module.exports = app;
