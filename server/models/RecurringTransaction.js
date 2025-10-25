import mongoose from 'mongoose';

const recurringTransactionSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    account: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Account' },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, required: true, enum: ['income', 'expense'] },
    category: { type: String, required: true },
    frequency: { type: String, required: true, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
    startDate: { type: Date, required: true },
    lastProcessedDate: { type: Date }, // To track when the last transaction was created
}, { timestamps: true });

const RecurringTransaction = mongoose.model('RecurringTransaction', recurringTransactionSchema);
export default RecurringTransaction;