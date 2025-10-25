import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { jwtDecode } from "jwt-decode";

const ResetPasswordOtpPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken, setUser } = useAuth(); // To log user in

  // Get email passed from VerifyOtpPage
  const email = location.state?.email;

  // Redirect if email is not available
  useEffect(() => {
    if (!email) {
      toast.error('Please verify OTP first.');
      navigate('/forgotpassword');
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // ... (checks for email and matching passwords) ...
    if (!email) { /* ... */ return; }
    if (password !== confirmPassword) { /* ... */ return; }

    setLoading(true);
    console.log("Submitting new password for:", email); // Log 1

    try {
      const { data } = await api.post('/auth/resetpassword-otp', { email, password, confirmPassword });

      // --- ADD LOGS HERE ---
      console.log("Server Response (data):", data); // Log 2: See the raw response

      if (!data || !data.token) {
        // If server response is OK but missing token, throw error
        console.error("Error: Server responded OK but token is missing!"); // Log 3
        throw new Error("Login token not received after password reset.");
      }
      // --------------------

      // Log the user in
      console.log("Setting token in localStorage:", data.token); // Log 4
      localStorage.setItem('token', data.token);

      console.log("Calling setToken..."); // Log 5
      setToken(data.token); // Update auth context state

      console.log("Attempting to decode token..."); // Log 6
      let decoded = null;
      try {
          decoded = jwtDecode(data.token);
          console.log("Token decoded successfully:", decoded); // Log 7
          // Make sure backend sends name/email in response
          setUser({ id: decoded.id, name: data.name || 'User', email: data.email || email });
          console.log("User state set."); // Log 8
      } catch (decodeError) {
          console.error("Error decoding token:", decodeError); // Log 9: Decode error
          setUser(null);
          // Optionally throw again to be caught by outer catch
          throw new Error("Failed to process login token.");
      }

      toast.success(data.message || 'Password reset successful!');
      console.log("Navigating to dashboard..."); // Log 10
      navigate('/'); // Redirect to dashboard

    } catch (error) {
       console.error("Reset Password Frontend Error Caught:", error); // Log 11: The final catch
       // Check if error message comes from our specific throws
       if (error.message === "Login token not received after password reset." || error.message === "Failed to process login token.") {
            toast.error(error.message);
       } else {
            // General network/server error message
            toast.error(error.response?.data?.message || 'Failed to reset password.');
       }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Set New Password</h2>
        <p className="text-gray-600 text-center mb-4">Enter your new password below for {email}.</p>
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
            {loading ? 'Resetting...' : 'Set New Password & Login'}
          </button>
        </form>
         <p className="text-center mt-4">
          <Link to="/login" className="text-indigo-600 hover:underline">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};
export default ResetPasswordOtpPage;