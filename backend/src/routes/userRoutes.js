const express = require('express');
const UserController = require('../controllers/UserController');
const { httpAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/me', httpAuth, UserController.getMe);
router.patch('/me', httpAuth, UserController.updateMe);
router.get('/:userId/battles', httpAuth, UserController.getBattleHistory);
router.get('/:userId/records', httpAuth, UserController.getBattleHistory);
router.get('/:id', httpAuth, UserController.getById);

module.exports = router;
