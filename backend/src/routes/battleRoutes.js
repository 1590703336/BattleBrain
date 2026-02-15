const express = require('express');
const UserController = require('../controllers/UserController');
const BattleController = require('../controllers/BattleController');
const { httpAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/:battleId/assist', httpAuth, BattleController.generateAssistReply);
router.get('/:userId', httpAuth, UserController.getBattleHistory);

module.exports = router;
