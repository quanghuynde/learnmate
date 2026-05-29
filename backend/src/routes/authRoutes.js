const express = require('express');
const router = express.Router();
const { register, login, googleLogin, getMe, forgotPassword, resetPassword, verify2FALogin } = require('../controllers/authController');
const { setup2FA, verifySetup2FA, disable2FA } = require('../controllers/twoFactorController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// 2FA Routes
router.post('/2fa/setup', protect, setup2FA);
router.post('/2fa/verify-setup', protect, verifySetup2FA);
router.post('/2fa/disable', protect, disable2FA);
router.post('/2fa/login', verify2FALogin);


module.exports = router;
