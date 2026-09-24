const express = require('express');
const authController = require('../controllers/authController');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const s = require('../validation/schemas');

const router = express.Router();

// Rutas públicas con límite de intentos por IP
router.post('/register', authLimiter, validate(s.registerBody), authController.register);
router.post('/login', authLimiter, validate(s.loginBody), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

// Rutas protegidas
router.get('/me', requireAuth, authController.getMe);
router.post('/2fa/setup', requireAuth, authController.setup2FA);
router.post('/2fa/verify', requireAuth, authLimiter, validate(s.verify2FABody), authController.verify2FA);

module.exports = router;
