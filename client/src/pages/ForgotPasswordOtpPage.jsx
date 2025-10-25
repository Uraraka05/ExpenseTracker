import React, { useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate

const ForgotPasswordOtpPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); // Hook for navigation

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgotpassword-otp', { email });
      toast.success(data.message); // Show message from backend
      // Redirect to Verify OTP page, passing email in state
      navigate('/verify-otp', { state: { email: email } });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Forgot Password</h2>
        <p className="text-gray-600 text-center mb-4">Enter your email to receive an OTP.</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="email">Email</label>
            <input
              type="email" id="email" className="w-full px-3 py-2 border rounded-lg"
              value={email} onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300"
            disabled={loading}>
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        </form>
        <p className="text-center mt-4">
          <Link to="/login" className="text-indigo-600 hover:underline">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};
export default ForgotPasswordOtpPage;