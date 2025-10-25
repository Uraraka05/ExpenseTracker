import express from 'express';
import { exportTransactions, importTransactions, exportTransactionsPDF } from '../controllers/dataController.js';
import { protect } from '../middleware/authMiddleware.js';
import multer from 'multer';

const router = express.Router();

// Setup multer for file upload in memory
const upload = multer({ storage: multer.memoryStorage() });

router.get('/export', protect, exportTransactions);
router.post('/import', protect, upload.single('file'), importTransactions);
router.get('/export-pdf', protect, exportTransactionsPDF);

export default router;