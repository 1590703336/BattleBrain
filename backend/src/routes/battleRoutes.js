const express = require('express');
const UserController = require('../controllers/UserController');
const { httpAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/:userId', httpAuth, UserController.getBattleHistory);

module.exports = router;
