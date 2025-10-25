import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
// --- 1. Import icons ---
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // --- 2. Add state for visibility ---
  const [showPassword, setShowPassword] = useState(false); 
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (error) {
      console.error('Login failed', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              className="w-full px-3 py-2 border rounded-lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6 relative"> {/* --- 3. Add relative positioning --- */}
            <label className="block text-gray-700 mb-2" htmlFor="password">Password</label>
            <input
              // --- 4. Dynamically set type ---
              type={showPassword ? 'text' : 'password'} 
              id="password"
              className="w-full px-3 py-2 border rounded-lg pr-10" // Add padding for icon
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {/* --- 5. Add the toggle icon --- */}
            <button
              type="button" // Important: prevent form submission
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 top-7 px-3 flex items-center text-gray-500" // Position icon
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FaEye /> : <FaEyeSlash />}
            </button>
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="text-center mt-4">
          Don't have an account? <Link to="/register" className="text-indigo-600 hover:underline">Register</Link>
        </p>
        <p className="text-center mt-2">
           <Link to="/forgotpassword" className="text-sm text-indigo-600 hover:underline">Forgot Password?</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;