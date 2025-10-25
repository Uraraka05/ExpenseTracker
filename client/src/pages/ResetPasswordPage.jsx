import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import useAuth from '../hooks/useAuth';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { jwtDecode } from "jwt-decode"; // Make sure to install: npm install jwt-decode

const ResetPasswordPage = () => {
  const { token } = useParams(); // Get token from URL (e.g., /resetpassword/abc123token)
  const navigate = useNavigate();
  const { setToken, setUser } = useAuth(); // To log user in after reset

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error('Passwords do not match');
    }
    setLoading(true);
    try {
      // Send PATCH request with token in URL and new password in body
      const { data } = await api.patch(`/auth/resetpassword/${token}`, { password, confirmPassword });

      // --- Log the user in ---
      localStorage.setItem('token', data.token);
      setToken(data.token); // Update auth context state
      try {
          const decoded = jwtDecode(data.token);
          setUser({ id: decoded.id, name: data.name, email: data.email }); // Set user info
      } catch (decodeError) {
          console.error("Error decoding token after reset:", decodeError);
          // Handle case where token might be invalid, though unlikely here
          setUser(null); // Clear user if decode fails
      }

      toast.success(data.message || 'Password reset successful!');
      navigate('/'); // Redirect to dashboard

    } catch (error) {
      toast.error(error.response?.data?.message || 'Reset failed. Token might be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Reset Your Password</h2>
        <form onSubmit={handleSubmit}>
          {/* New Password */}
          <div className="mb-4 relative">
            <label className="block text-gray-700 mb-2" htmlFor="password">New Password</label>
            <input
              type={showPassword ? 'text' : 'password'} id="password" name="password"
              className="w-full px-3 py-2 border rounded-lg pr-10"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength="6"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 top-7 px-3 flex items-center text-gray-500">
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {/* Confirm New Password */}
          <div className="mb-6 relative">
            <label className="block text-gray-700 mb-2" htmlFor="confirmPassword">Confirm</label>
            <input
              type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword" name="confirmPassword"
              className="w-full px-3 py-2 border rounded-lg pr-10"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              required minLength="6"
            />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 top-7 px-3 flex items-center text-gray-500">
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
            disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
         <p className="text-center mt-4">
          <Link to="/login" className="text-indigo-600 hover:underline">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};
export default ResetPasswordPage;