import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { FaEye, FaEyeSlash, FaEnvelope, FaLock } from 'react-icons/fa';

// Receives onSwitchMode prop
const LoginForm = ({ onSwitchMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/'); // Go to dashboard on success
    } catch (error) {
      console.error('Login failed', error);
      // AuthContext handles toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
        Welcome Back!
      </h2>
      <form onSubmit={handleSubmit}>
        {/* Email */}
        <div className="mb-6 relative">
          <label className="sr-only" htmlFor="login-email">Email</label>
          <span className="absolute inset-y-0 left-0 flex items-center pl-3"><FaEnvelope className="h-5 w-5 text-gray-400"/></span>
          <input
            type="email" id="login-email" name="email"
            className="w-full px-3 py-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address" required
          />
        </div>
        {/* Password */}
        <div className="mb-6 relative">
          <label className="sr-only" htmlFor="login-password">Password</label>
          <span className="absolute inset-y-0 left-0 flex items-center pl-3"><FaLock className="h-5 w-5 text-gray-400"/></span>
          <input
            type={showPassword ? 'text' : 'password'} id="login-password" name="password"
            className="w-full px-3 py-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password" required
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
            aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <FaEye /> : <FaEyeSlash />}
          </button>
        </div>
        {/* Forgot Password */}
        <div className="text-right mb-6">
          <Link to="/forgotpassword" className="text-sm text-indigo-600 hover:underline">Forgot Password?</Link>
        </div>
        {/* Submit Button */}
        <button type="submit" disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition duration-300">
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p className="text-center text-gray-600 mt-6">
        Don't have an account?{' '}
        <button onClick={onSwitchMode} className="text-indigo-600 hover:underline font-semibold focus:outline-none">
          Sign Up
        </button>
      </p>
    </div>
  );
};

export default LoginForm;