const AuthService = require('../services/AuthService');
const User = require('../models/User');
const { AuthError } = require('../utils/errors');

/**
 * Express middleware — extracts Bearer token from Authorization header.
 * Attaches req.user = { userId, ... }
 */
function httpAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return next(new AuthError('Missing or malformed Authorization header'));
    }

    const token = header.split(' ')[1];
    try {
        req.user = AuthService.verifyToken(token);
        next();
    } catch (err) {
        next(err);
    }
}

/**
 * Socket.IO middleware — extracts token from socket.handshake.auth.token.
 * Attaches socket.user = full user document (without password).
 */
function socketAuth(socket, next) {
    const token = socket.handshake.auth?.token;
    if (!token) {
        return next(new Error('auth_token_missing'));
    }

    try {
        const payload = AuthService.verifyToken(token);

        // Fetch full user profile and attach to socket
        User.findById(payload.userId)
            .then((user) => {
                if (!user) return next(new Error('auth_invalid_token'));
                socket.user = user.toJSON();
                next();
            })
            .catch(() => next(new Error('auth_invalid_token')));
    } catch {
        next(new Error('auth_invalid_token'));
    }
}

module.exports = { httpAuth, socketAuth };
