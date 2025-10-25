import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: { // Store the HASHED OTP
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // Automatically delete OTP documents after 5 minutes
    expires: 300, // 5 minutes in seconds (5 * 60)
  },
});

// Hash OTP before saving
otpSchema.pre('save', async function (next) {
  if (!this.isModified('otp')) return next();
  const salt = await bcrypt.genSalt(10);
  this.otp = await bcrypt.hash(this.otp, salt);
  next();
});

// Method to compare entered OTP with hashed OTP
otpSchema.methods.compareOtp = async function (enteredOtp) {
  return await bcrypt.compare(enteredOtp, this.otp);
};


const Otp = mongoose.model('Otp', otpSchema);
export default Otp;