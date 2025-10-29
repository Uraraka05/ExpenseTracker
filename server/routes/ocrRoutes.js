import express from 'express';
import multer from 'multer';
import { scanReceipt } from '../controllers/ocrController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Limit file size (e.g., 10MB)
});

router.post('/scan-receipt', protect, upload.single('file'), scanReceipt);

export default router;