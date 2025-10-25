import mongoose from 'mongoose';

const currencySchema = mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    ref: 'User',
    unique: true // Each user has only one currency setting
  },
  baseCurrency: { 
    type: String, 
    required: true, 
    default: 'INR' 
  },
  // We use a Map to store rates like { "USD": 83.5, "EUR": 90.2 }
  rates: { 
    type: Map,
    of: Number,
    default: {}
  }
}, { timestamps: true });

const Currency = mongoose.model('Currency', currencySchema);
export default Currency;