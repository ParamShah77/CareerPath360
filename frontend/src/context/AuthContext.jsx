import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

// Helper function to format error messages
const getErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.status === 401) {
    return 'Invalid email or password';
  }
  if (error.response?.status === 404) {
    return 'Account not found. Please sign up first.';
  }
  if (error.response?.status === 409) {
    return 'An account with this email already exists';
  }
  if (error.response?.status === 500) {
    return 'Server error. Please try again later.';
  }
  if (error.message === 'Network Error') {
    return 'Cannot connect to server. Please check your internet connection.';
  }
  return 'An unexpected error occurred. Please try again.';
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // ✅ Initialize on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // ✅ Login function
  const login = async (email, password) => {
    try {
      console.log('🔐 Logging in:', email);
      const response = await axios.post(
        `${API_BASE_URL}/auth/login`,
        { email, password }
      );

      console.log('✅ Login response:', response.data);

      // ✅ Extract token from response.data (not response.data.data)
      const { token, user } = response.data;

      if (!token) {
        throw new Error('No token received from server');
      }

      // Store token and user
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setToken(token);
      setUser(user);

      console.log('✅ Login successful, token saved');
      return { success: true, message: 'Login successful!' };
    } catch (error) {
      console.error('❌ Login error:', error.response?.data || error.message);
      const errorMessage = getErrorMessage(error);
      throw new Error(errorMessage);
    }
  };

  // ✅ Register function
  const register = async (name, email, password) => {
    try {
      console.log('📝 Registering:', email);
      const response = await axios.post(
        `${API_BASE_URL}/auth/register`,
        { name, email, password }
      );

      const { token, user } = response.data;

      if (!token) {
        throw new Error('No token received from server');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setToken(token);
      setUser(user);

      console.log('✅ Register successful');
      return { success: true, message: 'Registration successful! Welcome to CareerPath360!' };
    } catch (error) {
      console.error('❌ Register error:', error.response?.data || error.message);
      const errorMessage = getErrorMessage(error);
      throw new Error(errorMessage);
    }
  };

  // ✅ Logout function
  const logout = () => {
    console.log('👋 Logging out');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
