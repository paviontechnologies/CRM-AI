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

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/refresh', refreshToken);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateProfile);
router.patch('/org', authenticate, updateOrg);
router.patch('/password', authenticate, updatePassword);

export default router;
