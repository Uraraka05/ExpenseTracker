import mongoose from 'mongoose';

const transactionSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  account: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Account' },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, required: true, enum: ['income', 'expense'] },
  category: { type: String, required: true, default: 'Uncategorized' },
  date: { type: Date, required: true, default: Date.now },
  transfer: { type: mongoose.Schema.Types.ObjectId, ref: 'Transfer', sparse: true },
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;