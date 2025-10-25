import express from 'express';
import { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  changeUserPassword, forgotPasswordOtp, verifyOtp, resetPasswordOtp
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.put('/changepassword', protect, changeUserPassword);
router.post('/forgotpassword-otp', forgotPasswordOtp); 
router.post('/verify-otp', verifyOtp);
router.post('/resetpassword-otp', resetPasswordOtp);

export default router;