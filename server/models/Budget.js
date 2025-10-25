import mongoose from 'mongoose';

const budgetSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
}, { timestamps: true });

// Ensure a user can only have one budget per category
budgetSchema.index({ user: 1, category: 1 }, { unique: true });

const Budget = mongoose.model('Budget', budgetSchema);
export default Budget;