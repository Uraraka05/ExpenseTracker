import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';

// Import route files
import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import recurringRoutes from './routes/recurringRoutes.js';
import dataRoutes from './routes/dataRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import currencyRoutes from './routes/currencyRoutes.js';
import projectionRoutes from './routes/projectionRoutes.js';
import debtRoutes from './routes/debtRoutes.js';
import ocrRoutes from './routes/ocrRoutes.js';

dotenv.config();
connectDB();
const app = express();

const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173'; // Fallback for local dev
app.use(cors({ origin: frontendURL }));
console.log(`CORS enabled for origin: ${frontendURL}`);
app.use(express.json()); 

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api/projections', projectionRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/debt', debtRoutes);


// Define the port
const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));