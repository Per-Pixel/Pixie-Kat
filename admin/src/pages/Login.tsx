import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Image } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LoginCredentials } from '../types/auth';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const { login, isLoading, error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ ...credentials });
      toast.success('Welcome back!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    }
  };

  const handleInputChange = (field: keyof LoginCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Top teal circle */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-teal-500 rounded-full"></div>
        {/* Orange circle left */}
        <div className="absolute top-1/4 left-0 transform -translate-x-1/2 w-48 h-48 bg-orange-400 rounded-full"></div>
        {/* Pink circle bottom right */}
        <div className="absolute bottom-0 right-0 transform translate-x-1/4 translate-y-1/4 w-40 h-40 bg-pink-300 rounded-full"></div>
      </div>

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="flex min-h-[600px]">
          {/* Left Panel - Login Form */}
          <div className="flex-1 p-12 flex flex-col justify-center">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Dashboard
              </h1>
              <h2 className="text-4xl font-bold text-gray-900">
                PixieKat
              </h2>
            </div>

            {/* Form */}
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* Username Field */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Username
                </label>
                <input
                  type="email"
                  value={credentials.email}
                  onChange={handleInputChange('email')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  placeholder=""
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={credentials.password}
                    onChange={handleInputChange('password')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all pr-12"
                    placeholder=""
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <button
                  type="button"
                  className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-teal-500 to-orange-400 text-white py-3 px-4 rounded-lg font-medium hover:from-teal-600 hover:to-orange-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  <>
                    LOGIN
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </motion.button>

              {/* Register Link */}
              <div className="text-center text-sm">
                <span className="text-gray-600">Don't have an account? </span>
                <button
                  type="button"
                  className="text-orange-500 hover:text-orange-600 font-medium transition-colors"
                >
                  REGISTER
                </button>
              </div>

              {/* Demo Credentials */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">Demo Credentials:</p>
                <p className="text-xs text-blue-600">Email: admin@pixiekat.com</p>
                <p className="text-xs text-blue-600">Password: admin123</p>
              </div>
            </motion.form>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
              >
                {error}
              </motion.div>
            )}
          </div>

          {/* Right Panel - Image */}
          <div className="flex-1 bg-teal-500 flex items-center justify-center relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-center text-white"
            >
              <div className="w-32 h-32 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center">
                <Image className="w-16 h-16 text-white" />
              </div>
              <p className="text-xl font-medium">Image Here</p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
