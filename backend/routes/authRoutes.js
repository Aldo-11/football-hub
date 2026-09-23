const express = require('express');
const { z } = require('zod');
const authController = require('../controllers/authController');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email('Correo electrónico inválido').trim().toLowerCase(),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres')
});

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido').trim().toLowerCase(),
  password: z.string().min(1, 'La contraseña es requerida'),
  totpCode: z.string().optional()
});

const verify2FASchema = z.object({
  token: z.string().min(6).max(8)
});

// Rutas públicas con rate limiting
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

// Rutas protegidas
router.get('/me', requireAuth, authController.getMe);
router.post('/2fa/setup', requireAuth, authController.setup2FA);
router.post('/2fa/verify', requireAuth, validate(verify2FASchema), authController.verify2FA);

module.exports = router;
