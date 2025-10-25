import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const VerifyOtpPage = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation(); // To get email from previous step

  // Get email passed from ForgotPasswordOtpPage
  const email = location.state?.email;

  // Redirect if email is not available (user navigated directly)
  useEffect(() => {
    if (!email) {
      toast.error('Please request an OTP first.');
      navigate('/forgotpassword');
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email, otp });
      toast.success('OTP Verified!');
      // Redirect to Reset Password page, passing email
      navigate('/resetpassword', { state: { email: email } });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Verify OTP</h2>
        <p className="text-gray-600 text-center mb-4">
          Enter the 4-digit OTP sent to {email || 'your email'}. It expires in 5 minutes.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="otp">OTP Code</label>
            <input
              type="text" // Use text to allow leading zeros if needed, validation is on server
              id="otp"
              className="w-full px-3 py-2 border rounded-lg text-center tracking-[1em]" // Styling for OTP look
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength="4" // Enforce 4 digits
              pattern="\d{4}" // Basic pattern validation
              title="Enter the 4-digit OTP"
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300"
            disabled={loading}>
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>
        <p className="text-center mt-4">
          <Link to="/forgotpassword" className="text-sm text-indigo-600 hover:underline">Request OTP again?</Link>
        </p>
         <p className="text-center mt-2">
          <Link to="/login" className="text-sm text-indigo-600 hover:underline">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};
export default VerifyOtpPage;