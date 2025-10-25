import mongoose from 'mongoose';

const transferSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  fromAccount: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Account' },
  toAccount: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Account' },
  amount: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now },
  description: { type: String, default: 'Account Transfer' }
}, { timestamps: true });

const Transfer = mongoose.model('Transfer', transferSchema);
export default Transfer;