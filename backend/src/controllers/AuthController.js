const AuthService = require('../services/AuthService');
const UserService = require('../services/UserService');

class AuthController {
    static async signup(req, res, next) {
        try {
            const { email, password, displayName } = req.body;
            const session = await AuthService.signup(email, password, displayName);
            res.status(201).json(session);
        } catch (err) {
            next(err);
        }
    }

    static async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const session = await AuthService.login(email, password);
            res.json(session);
        } catch (err) {
            next(err);
        }
    }

    static async me(req, res, next) {
        try {
            const user = await UserService.getCurrentUser(req.user.userId, { touchLastActive: true });
            res.json({ user });
        } catch (err) {
            next(err);
        }
    }

    static async logout(_req, res) {
        res.json({ ok: true });
    }
}

module.exports = AuthController;
