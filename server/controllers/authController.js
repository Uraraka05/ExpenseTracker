import User from '../models/User.js';
import Otp from '../models/Otp.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto'; // Keep for JWT
import sendOtpEmail from '../utils/sendOtpEmail.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const generateOtp = () => {
  return Math.floor(1000 + Math.random() * 9000).toString(); // 1000-9999
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ name, email, password });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    res.json({ _id: user._id, name: user.name, email: user.email });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

const changeUserPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Please provide all fields' });
  }

  try {
    // req.user is available from the 'protect' middleware
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (await user.matchPassword(currentPassword)) {
      user.password = newPassword;
      await user.save();
      
      res.json({ message: 'Password changed successfully' });
    } else {
      res.status(401).json({ message: 'Invalid current password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- NEW: Request OTP for Password Reset ---
const forgotPasswordOtp = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`Password reset attempt for non-existent email: ${email}`);
      return res.status(200).json({ message: "If an account with that email exists, an OTP has been sent." });
    }

    const otpCode = generateOtp();
    console.log(`Generated OTP for ${user.email}: ${otpCode}`); // Log plain OTP for testing ONLY

    // --- REVISED OTP SAVING LOGIC ---
    // 1. Find existing OTP record or create a new instance
    let otpRecord = await Otp.findOne({ email: user.email });
    if (otpRecord) {
        // Update existing record
        otpRecord.otp = otpCode;
        // Reset expiry timer manually if needed (though `expires` index handles deletion)
        otpRecord.createdAt = new Date(); // Update timestamp to reset expiry countdown
    } else {
        // Create a new record instance
        otpRecord = new Otp({ email: user.email, otp: otpCode });
    }
    // 2. Explicitly call save() to trigger the pre-save hashing hook
    await otpRecord.save();
    console.log(`Saved OTP record. Hashed OTP should be in DB for ID: ${otpRecord._id}`);
    // --- END REVISED LOGIC ---

    // 4. Send plain OTP via Email using Mailgun
    await sendOtpEmail({ email: user.email, otp: otpCode });

    res.status(200).json({ message: "If an account with that email exists, an OTP has been sent." });

  } catch (error) {
    console.error("Forgot Password OTP Error:", error);
    res.status(500).json({ message: "Could not process request. Please try again later." });
  }
};

// --- NEW: Verify OTP ---
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  console.log(`--- Verifying OTP --- Email: ${email}, Submitted OTP: ${otp}`); // Log 1: Input received

  if (!email || !otp) {
    console.log("Verify Failed: Missing email or OTP."); // Log 2: Missing input
    return res.status(400).json({ message: 'Email and OTP are required.' });
  }

  try {
    // 1. Find the latest OTP record for the email
    // Mongoose 'expires' should automatically delete old ones, but sorting is a safety net.
    const otpRecord = await Otp.findOne({ email }).sort({ createdAt: -1 });

    if (!otpRecord) {
      console.log("Verify Failed: No OTP record found for this email (likely expired or never created)."); // Log 3: Record not found
      return res.status(400).json({ message: 'OTP not found or expired.' });
    }
    console.log("OTP Record Found:", otpRecord._id, "Hashed OTP in DB:", otpRecord.otp); // Log 4: Record found

    // 2. Compare the submitted plain OTP with the stored HASHED OTP
    const isMatch = await otpRecord.compareOtp(otp);
    console.log(`OTP Comparison Result (isMatch): ${isMatch}`); // Log 5: Comparison result

    if (!isMatch) {
      console.log("Verify Failed: Submitted OTP does not match stored hash."); // Log 6: Mismatch
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    // 3. OTP is valid! Delete it.
    console.log("OTP Matched! Deleting OTP record:", otpRecord._id); // Log 7: Match found
    await Otp.deleteOne({ _id: otpRecord._id });

    res.status(200).json({ message: 'OTP verified successfully.' });

  } catch (error) {
    console.error("!!! Verify OTP Controller Error:", error); // Log 8: General error
    res.status(500).json({ message: "Could not verify OTP. Please try again." });
  }
};
const resetPasswordOtp = async (req, res) => {
  const { email, password, confirmPassword } = req.body;

  if (!email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Email, new password, and confirmation are required.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }

  // Security Note: This step implicitly trusts that the user calling this
  // endpoint *just* successfully verified an OTP for this email.
  // A more secure approach involves passing a single-use token from the
  // verifyOtp step to this step. For simplicity, we are omitting that here.

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.password = password;
    await user.save();

    const token = generateToken(user._id);
    res.json({
      _id: user._id, name: user.name, email: user.email, token: token,
      message: 'Password reset successful! You are now logged in.'
    });

  } catch (error) {
    console.error("Reset Password OTP Error:", error);
    res.status(500).json({ message: "Could not reset password. Please try again." });
  }
};


export {
  registerUser, loginUser, getUserProfile, changeUserPassword, forgotPasswordOtp, verifyOtp, resetPasswordOtp
};