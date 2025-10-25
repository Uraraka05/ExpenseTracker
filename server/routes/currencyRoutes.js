import express from 'express';
import { getCurrencySettings, updateCurrencySettings } from '../controllers/currencyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getCurrencySettings)
  .put(protect, updateCurrencySettings);

export default router;