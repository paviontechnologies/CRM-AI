import { Router } from 'express';
import {
  register,
  login,
  googleAuth,
  getMe,
  forgotPassword,
  verifyOtp,
  refreshToken,
  updateProfile,
  updateOrg,
  updatePassword,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleAuth);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/refresh', refreshToken);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateProfile);
router.patch('/org', authenticate, updateOrg);
router.patch('/password', authenticate, updatePassword);

export default router;
