import express from 'express';
import { calculateDebtStrategies } from '../controllers/debtController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/calculate', protect, calculateDebtStrategies);

export default router;