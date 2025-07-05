import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isLogin) {
        const result = await login(formData.email, formData.password);
        if (result.success) {
          navigate(from, { replace: true });
        } else {
          setError(result.error || 'Login failed');
        }
      } else {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setIsLoading(false);
          return;
        }
        
        const result = await register({
          name: formData.name,
          email: formData.email,
          password: formData.password
        });
        
        if (result.success) {
          navigate(from, { replace: true });
        } else {
          setError(result.error || 'Registration failed');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-700 flex items-center justify-center px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            <span className="bg-gradient-to-r from-neon-purple to-neon-blue bg-clip-text text-transparent">
              {isLogin ? 'Welcome Back' : 'Join PixieKat'}
            </span>
          </h1>
          <p className="text-gray-300">
            {isLogin 
              ? 'Sign in to your account to continue' 
              : 'Create an account to get started'
            }
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-dark-600 rounded-2xl p-8 shadow-2xl border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name field for registration */}
            {!isLogin && (
              <div>
                <label className="block text-white font-medium mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-neon-purple focus:outline-none transition-colors duration-200"
                  placeholder="Enter your full name"
                />
              </div>
            )}

            {/* Email field */}
            <div>
              <label className="block text-white font-medium mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-neon-purple focus:outline-none transition-colors duration-200"
                placeholder="Enter your email"
              />
            </div>

            {/* Password field */}
            <div>
              <label className="block text-white font-medium mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-neon-purple focus:outline-none transition-colors duration-200"
                placeholder="Enter your password"
              />
            </div>

            {/* Confirm Password field for registration */}
            {!isLogin && (
              <div>
                <label className="block text-white font-medium mb-2">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-neon-purple focus:outline-none transition-colors duration-200"
                  placeholder="Confirm your password"
                />
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full bg-gradient-to-r from-neon-purple to-neon-blue text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 ${
                isLoading 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:shadow-neon-purple/50'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {isLogin ? 'Signing In...' : 'Creating Account...'}
                </div>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </motion.button>

            {/* Forgot password link for login */}
            {isLogin && (
              <div className="text-center">
                <button
                  type="button"
                  className="text-neon-purple hover:text-neon-blue transition-colors duration-200 text-sm"
                >
                  Forgot your password?
                </button>
              </div>
            )}
          </form>

          {/* Toggle between login and register */}
          <div className="mt-8 pt-6 border-t border-gray-700 text-center">
            <p className="text-gray-300 mb-4">
              {isLogin 
                ? "Don't have an account?" 
                : "Already have an account?"
              }
            </p>
            <button
              onClick={toggleMode}
              className="text-neon-purple hover:text-neon-blue font-medium transition-colors duration-200"
            >
              {isLogin ? 'Create Account' : 'Sign In'}
            </button>
          </div>
        </div>

        {/* Features for new users */}
        {!isLogin && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 grid grid-cols-2 gap-4"
          >
            <div className="bg-dark-600/50 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">⚡</div>
              <p className="text-white text-sm font-medium">Instant Delivery</p>
              <p className="text-gray-400 text-xs">2-5 minutes average</p>
            </div>
            <div className="bg-dark-600/50 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">🎁</div>
              <p className="text-white text-sm font-medium">Member Bonuses</p>
              <p className="text-gray-400 text-xs">Extra rewards</p>
            </div>
            <div className="bg-dark-600/50 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">🛡️</div>
              <p className="text-white text-sm font-medium">100% Secure</p>
              <p className="text-gray-400 text-xs">Safe transactions</p>
            </div>
            <div className="bg-dark-600/50 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">📱</div>
              <p className="text-white text-sm font-medium">24/7 Support</p>
              <p className="text-gray-400 text-xs">Always here to help</p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Auth;
