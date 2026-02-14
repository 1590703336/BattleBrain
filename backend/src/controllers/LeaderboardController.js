const UserService = require('../services/UserService');

class LeaderboardController {
    static async list(req, res, next) {
        try {
            const rows = await UserService.getLeaderboard(req.query.limit);
            res.json(rows);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = LeaderboardController;
