import express from 'express';
import { getCashFlowProjection } from '../controllers/projectionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getCashFlowProjection);

export default router;