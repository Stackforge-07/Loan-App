const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isGuest } = require('../middleware/auth');
const { loginValidation, registerValidation } = require('../middleware/validators');

// Landing page
router.get('/', authController.getLanding);

// Login
router.get('/login', isGuest, authController.getLogin);
router.post('/login', loginValidation, authController.postLogin);

// Register
router.get('/register', isGuest, authController.getRegister);
router.post('/register', registerValidation, authController.postRegister);

// Logout
router.post('/logout', authController.logout);

module.exports = router;
