
const User = require('../models/User');
const { NotFoundError } = require('../utils/errors');

class BattleController {
    /**
     * GET /api/battles/details/:battleId
     * Retrieve details of a specific finished battle by its ID.
     * Since battles are embedded in User records, we search for the user who has this battle record.
     */
    static async getDetails(req, res, next) {
        try {
            const { battleId } = req.params;

            // Search for a user who has this battle in their records
            const user = await User.findOne(
                { 'records.battleId': battleId },
                { 'records.$': 1 }
            );

            if (!user || !user.records || user.records.length === 0) {
                throw new NotFoundError('Battle not found');
            }

            res.json(user.records[0]);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = BattleController;
