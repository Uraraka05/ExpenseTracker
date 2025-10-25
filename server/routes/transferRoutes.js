import express from 'express';
import { createTransfer, getTransfers, updateTransfer, deleteTransfer } from '../controllers/transferController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, createTransfer)
  .get(protect, getTransfers);

router.route('/:id')
  .put(protect, updateTransfer)
  .delete(protect, deleteTransfer);

export default router;