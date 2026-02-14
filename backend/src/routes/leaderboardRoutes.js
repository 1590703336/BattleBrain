const express = require('express');
const LeaderboardController = require('../controllers/LeaderboardController');

const router = express.Router();

router.get('/', LeaderboardController.list);

module.exports = router;
