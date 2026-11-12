import { Router } from 'express';
import {
  login,
  register,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
} from '../controllers/authController';
import { sendOTPForEmailVerification, verifyEmailOTP } from "../controllers/otpController";
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/refresh', refresh);
router.post('/logout', authenticateToken, logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/send-otp', sendOTPForEmailVerification);
router.post('/verify-otp', verifyEmailOTP);
export default router;
