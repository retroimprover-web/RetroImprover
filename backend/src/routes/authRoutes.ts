import { Router } from 'express';
import passport from '../config/passport';
import { register, login, getMe, socialAuthCallback, getOAuthStatus } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Регистрация и вход
router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.get('/oauth/status', getOAuthStatus);

// Социальная авторизация - Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  socialAuthCallback
);

// Социальная авторизация - Facebook
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback',
  passport.authenticate('facebook', { session: false }),
  socialAuthCallback
);

// Социальная авторизация - Apple
router.get('/apple', passport.authenticate('apple'));
router.get('/apple/callback',
  passport.authenticate('apple', { session: false }),
  socialAuthCallback
);

export default router;

