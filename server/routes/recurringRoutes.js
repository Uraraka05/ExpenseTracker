import express from 'express';
import {
  addRecurringTransaction,
  getRecurringTransactions,
  deleteRecurringTransaction,
  processRecurringTransactions,
} from '../controllers/recurringController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, addRecurringTransaction)
  .get(protect, getRecurringTransactions);

// Special route to trigger processing
router.route('/process')
  .post(protect, processRecurringTransactions);
  
router.route('/:id')
  .delete(protect, deleteRecurringTransaction);

export default router;