const UserService = require('../services/UserService');

class UserController {
    static async getMe(req, res, next) {
        try {
            const user = await UserService.getCurrentUser(req.user.userId, { touchLastActive: true });
            res.json({ user });
        } catch (err) {
            next(err);
        }
    }

    static async getById(req, res, next) {
        try {
            const user = await UserService.getUserById(req.params.id, { publicProfile: true });
            res.json({ user });
        } catch (err) {
            next(err);
        }
    }

    static async updateMe(req, res, next) {
        try {
            const user = await UserService.updateCurrentUser(req.user.userId, req.body);
            res.json({ user });
        } catch (err) {
            next(err);
        }
    }

    static async getBattleHistory(req, res, next) {
        try {
            const resolvedUserId = UserService.resolveRequestedUserId(
                req.user.userId,
                req.params.userId
            );
            const history = await UserService.getBattleHistory(resolvedUserId, req.query.limit);
            res.json(history);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = UserController;
