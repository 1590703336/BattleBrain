const express = require('express');
const AuthController = require('../controllers/AuthController');
const { httpAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);
router.get('/me', httpAuth, AuthController.me);
router.post('/logout', httpAuth, AuthController.logout);

module.exports = router;
