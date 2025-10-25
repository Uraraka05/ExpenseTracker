import express from 'express';
import { addAccount, getAccounts, deleteAccount, updateAccount } from '../controllers/accountController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, addAccount)
    .get(protect, getAccounts);

router.route('/:id')
    .delete(protect, deleteAccount)
    .put(protect, updateAccount);

export default router;