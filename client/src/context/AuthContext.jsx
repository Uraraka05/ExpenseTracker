import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  useEffect(() => {
    // If a token exists, decode it to get user info
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Check if token is expired
        if (decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          // Fetch user profile based on decoded ID for consistency
          api.get('/auth/profile').then(response => {
              setUser(response.data);
          }).catch(() => {
              // If profile fetch fails (e.g., token valid but user deleted), log out
              logout();
          });
          localStorage.setItem('token', token); // Ensure token is always stored if valid
        }
      } catch (error) {
        // If token is invalid
        logout();
      }
    }else {
      setUser(null); 
    }
  }, [token]);
  
  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setToken(data.token);
      const firstLoginTimestamp = localStorage.getItem('firstLoginTimestamp');
      if (!firstLoginTimestamp) {
        localStorage.setItem('firstLoginTimestamp', Date.now().toString());
        console.log("First login detected, timestamp stored.");
      }
      toast.success('Logged in successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  const register = async (name, email, password) => {
    try {
        const { data } = await api.post('/auth/register', { name, email, password });
        // Log the user in immediately after registration
        setToken(data.token);
        toast.success('Registration successful!');
    } catch (error) {
        toast.error(error.response?.data?.message || 'Registration failed');
        throw error;
    }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
    toast.success('Logged out.');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, setToken, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;