import express from 'express';
import { createOrUpdateBudget, getBudgets, deleteBudget } from '../controllers/budgetController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, createOrUpdateBudget)
  .get(protect, getBudgets);

router.route('/:id')
  .delete(protect, deleteBudget);

export default router;