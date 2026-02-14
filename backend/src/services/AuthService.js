const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');
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
        if (password.length < 6) {
            throw new ValidationError('Password must be at least 6 characters');
        }

        // Check for existing user
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            throw new ConflictError('Email already in use');
        }

        const user = await User.create({ email, password, displayName });
        const token = AuthService.generateToken(user._id);

        return { token, user: user.toJSON() };
    }

    /**
     * Authenticate an existing user.
     * @returns {{ token: string, user: object }}
     */
    static async login(email, password) {
        if (!email || !password) {
            throw new ValidationError('email and password are required');
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
        return { token, user: user.toJSON() };
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
}

module.exports = AuthService;
