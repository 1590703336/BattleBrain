const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');
const UserService = require('./UserService');
const { ValidationError, AuthError, ConflictError } = require('../utils/errors');

class AuthService {
    /**
     * Create a new user account.
     * @returns {{ token: string, user: object }}
     */
    static async signup(email, password, displayName) {
        if (!email || !password || !displayName) {
            throw new ValidationError('email, password, and displayName are required');
        }
        if (typeof email !== 'string' || typeof password !== 'string') {
            throw new ValidationError('email and password must be strings');
        }
        if (typeof displayName !== 'string' || !displayName.trim()) {
            throw new ValidationError('displayName is required');
        }
        if (displayName.trim().length > 30) {
            throw new ValidationError('displayName must be at most 30 characters');
        }
        if (password.length < 6) {
            throw new ValidationError('Password must be at least 6 characters');
        }

        // Check for existing user
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            throw new ConflictError('Email already in use');
        }

        const user = await User.create({ email, password, displayName: displayName.trim() });
        const token = AuthService.generateToken(user._id);
        return AuthService.buildSessionPayload(token, user);
    }

    /**
     * Authenticate an existing user.
     * @returns {{ token: string, user: object }}
     */
    static async login(email, password) {
        if (!email || !password) {
            throw new ValidationError('email and password are required');
        }
        if (typeof email !== 'string' || typeof password !== 'string') {
            throw new ValidationError('email and password must be strings');
        }

        // +password to override select: false
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        if (!user) {
            throw new AuthError('Invalid email or password');
        }

        const match = await user.comparePassword(password);
        if (!match) {
            throw new AuthError('Invalid email or password');
        }

        const token = AuthService.generateToken(user._id);
        return AuthService.buildSessionPayload(token, user);
    }

    /**
     * Generate a signed JWT for a given user ID.
     */
    static generateToken(userId) {
        return jwt.sign({ userId: userId.toString() }, config.jwtSecret, {
            expiresIn: config.jwtExpiresIn
        });
    }

    /**
     * Verify and decode a JWT token.
     * @returns {{ userId: string }}
     */
    static verifyToken(token) {
        try {
            return jwt.verify(token, config.jwtSecret);
        } catch {
            throw new AuthError('Invalid or expired token');
        }
    }

    static buildSessionPayload(token, user) {
        return {
            token,
            tokenType: 'Bearer',
            expiresIn: AuthService.getTokenExpiresInSeconds(config.jwtExpiresIn),
            user: UserService.buildUserPayload(user)
        };
    }

    static getTokenExpiresInSeconds(rawExpiresIn) {
        if (typeof rawExpiresIn === 'number' && Number.isFinite(rawExpiresIn)) {
            return Math.max(1, Math.round(rawExpiresIn));
        }

        if (typeof rawExpiresIn === 'string') {
            const trimmed = rawExpiresIn.trim();
            if (/^\d+$/.test(trimmed)) {
                return Math.max(1, Number.parseInt(trimmed, 10));
            }

            const match = /^(\d+)([smhd])$/i.exec(trimmed);
            if (match) {
                const amount = Number.parseInt(match[1], 10);
                const unit = match[2].toLowerCase();
                const multipliers = {
                    s: 1,
                    m: 60,
                    h: 3600,
                    d: 86400
                };
                return Math.max(1, amount * multipliers[unit]);
            }
        }

        return 604800;
    }
}

module.exports = AuthService;
