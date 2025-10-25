import mongoose from 'mongoose';

const accountSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  name: { type: String, required: true },
  type: { 
    type: String, 
    required: true, 
    // Added Loan types, allow others for flexibility
    enum: ['Checking', 'Savings', 'Credit Card', 'Cash', 'Investment', 'Loan', 'Mortgage', 'Other Liability'] 
  },
  balance: { type: Number, required: true, default: 0 }, 
    interestRate: { // Annual Percentage Rate (APR) - store as a decimal (e.g., 19.9% = 0.199)
    type: Number, 
    default: 0 
  }, 
  isLiability: { // Explicit flag to mark as a debt/liability
      type: Boolean,
      default: function() { // Default to true if type suggests debt
          return ['Credit Card', 'Loan', 'Mortgage', 'Other Liability'].includes(this.type);
      }
  }
}, { timestamps: true });

const Account = mongoose.model('Account', accountSchema);
export default Account;