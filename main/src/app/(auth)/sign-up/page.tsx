"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import PageWrapper from '@/components/PageWrapper';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

const SignUp = () => {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState(1); // Step 1: Signup, Step 2: Verification
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    verificationCode: ''
  });
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Verification code sent to your email');
        setStep(2); // Move to verification step
      } else {
        if (data.code === 'VERIFICATION_COOLDOWN') {
          toast.error('Please wait before requesting another code');
        } else if (data.code === 'EMAIL_SEND_FAILED') {
          toast.error('Failed to send verification email. Please try again.');
        } else {
          toast.error(data.error || 'Signup failed');
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const successfulVerify = async (data: any) => {
    try {
      // Update auth context with user data
      login(data.user);
      // Show success message and redirect
      toast.success('Your account has been created successfully!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('An error occurred during verification.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          code: formData.verificationCode
        }),
      });

      const data = await response.json();

      if (response.ok) {
        successfulVerify(data); // Call the successfulVerify function
      } else {
        if (data.code === 'TOO_MANY_ATTEMPTS') {
          toast.error('Too many failed attempts. Please request a new code.');
        } else if (data.code === 'NO_VERIFICATION_PENDING') {
          toast.error('Verification code expired. Please sign up again.');
          setStep(1); // Go back to signup step
        } else if (data.code === 'INVALID_CODE') {
          toast.error('Invalid verification code. Please try again.');
        } else {
          toast.error(data.error || 'Verification failed');
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Request a new verification code
  const handleResendCode = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('New verification code sent to your email');
      } else {
        if (data.code === 'VERIFICATION_COOLDOWN') {
          toast.error('Please wait before requesting another code');
        } else {
          toast.error(data.error || 'Failed to send new code');
        }
      }
    } catch (error) {
      console.error('Resend code error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="min-h-screen flex flex-col lg:flex-row lg:items-center lg:justify-end px-4 relative pb-24"> {/* Added pb-24 for footer spacing */}
        {/* Background Image/Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{
            backgroundImage: 'url(/auth-bg.jpg)',
            filter: 'brightness(0.3)'
          }}
        />

        {/* Mobile/Tablet Layout Container */}
        <div className="relative z-10 pt-8 lg:hidden flex flex-col items-center text-center px-4">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-yellow-500 to-pink-500 text-transparent bg-clip-text">
                PixieKat
              </span>
            </h2>
            {/* Remove the mobile text */}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full max-w-[300px] mb-8"
          >
            <img 
              src="/img/auth/signup.png" 
              alt="Sign up illustration" 
              className="w-full h-auto object-contain"
            />
          </motion.div>
        </div>

        {/* Desktop Left Side Content */}
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="absolute left-16 top-16 max-w-xl hidden lg:block z-10"
        >
          <h2 className="text-5xl font-bold text-white mb-6">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-yellow-500 to-pink-500 text-transparent bg-clip-text">
              PixieKat
            </span>
          </h2>
          <p className="text-gray-300 text-xl">
            Join our community and discover amazing gaming experiences.
          </p>
        </motion.div>

        {/* Desktop Left Center Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="absolute left-[200px] top-1/2 -translate-y-1/2 hidden lg:block z-10"
        >
          <img 
            src="/img/auth/signup.png" 
            alt="Sign up illustration" 
            className="w-[400px] h-[400px] object-contain"
          />
        </motion.div>

        {/* Right side content (signup form) */}
        <div className="w-full lg:max-w-[500px] relative z-10 lg:mr-16">
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-[#1D232A]/90 p-8 rounded-lg backdrop-blur-sm shadow-xl"
          >
            <h1 className="text-4xl font-bold mb-6 text-center bg-gradient-to-r from-yellow-500 to-pink-500 text-transparent bg-clip-text">
              {step === 1 ? 'Create Account' : 'Verify Email'}
            </h1>
            
            {step === 1 ? (
              <>
                {/* Social Sign Up Buttons */}
                <div className="space-y-3 mb-6">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2 bg-[#2A323C] p-3 rounded-lg hover:bg-[#2A323C]/80 transition-colors group"
                  >
                    <img src="/google-icon.svg" alt="Google" className="w-5 h-5" />
                    <span className="group-hover:text-yellow-500 transition-colors">Sign up with Google</span>
                  </motion.button>
                  
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2 bg-[#2A323C] p-3 rounded-lg hover:bg-[#2A323C]/80 transition-colors group"
                  >
                    <img src="/facebook-icon.svg" alt="Facebook" className="w-5 h-5" />
                    <span className="group-hover:text-yellow-500 transition-colors">Sign up with Facebook</span>
                  </motion.button>
                </div>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-[#1D232A] text-gray-400">or continue with</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Full Name"
                      className="w-full p-3 bg-[#2A323C] rounded-lg border border-gray-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Email Address"
                      className="w-full p-3 bg-[#2A323C] rounded-lg border border-gray-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all"
                      required
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Password"
                      className="w-full p-3 bg-[#2A323C] rounded-lg border border-gray-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm Password"
                      className="w-full p-3 bg-[#2A323C] rounded-lg border border-gray-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all"
                      required
                    />
                  </div>

                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="terms" 
                      className="form-checkbox bg-[#2A323C] border-gray-600 rounded text-yellow-500 focus:ring-yellow-500"
                      required
                    />
                    <label htmlFor="terms" className="ml-2 text-sm text-gray-400">
                      I agree to the{' '}
                      <Link href="/terms" className="text-yellow-500 hover:text-yellow-400 transition-colors">
                        Terms of Service
                      </Link>
                      {' '}and{' '}
                      <Link href="/privacy" className="text-yellow-500 hover:text-yellow-400 transition-colors">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading}
                    className={`w-full bg-gradient-to-r from-yellow-500 to-pink-500 text-white font-bold py-3 px-4 rounded-lg transition-all 
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:from-yellow-400 hover:to-pink-400'}`}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Processing...
                      </div>
                    ) : 'Sign Up'}
                  </motion.button>
                </form>
              </>
            ) : (
              // Verification Form
              <>
                <p className="text-gray-300 mb-6 text-center">
                  We've sent a verification code to <span className="text-yellow-500">{formData.email}</span>. 
                  Please enter it below to verify your email and complete registration.
                </p>
                
                <form onSubmit={handleVerification} className="space-y-4">
                  <div className="space-y-1">
                    <input
                      type="text"
                      name="verificationCode"
                      value={formData.verificationCode}
                      onChange={handleChange}
                      placeholder="Verification Code"
                      className="w-full p-3 bg-[#2A323C] rounded-lg border border-gray-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all text-center tracking-widest text-xl"
                      required
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading}
                    className={`w-full bg-gradient-to-r from-yellow-500 to-pink-500 text-white font-bold py-3 px-4 rounded-lg transition-all
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:from-yellow-400 hover:to-pink-400'}`}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Verifying...
                      </div>
                    ) : 'Verify Email'}
                  </motion.button>
                </form>

                <div className="mt-4 text-center">
                  <button 
                    onClick={handleResendCode}
                    disabled={isLoading}
                    className="text-yellow-500 hover:text-yellow-400 transition-colors font-semibold text-sm"
                  >
                    Didn't receive a code? Send again
                  </button>
                </div>
              </>
            )}

            <p className="mt-6 text-center text-gray-400">
              Already have an account?{' '}
              <Link 
                href="/login" 
                className="text-yellow-500 hover:text-yellow-400 transition-colors font-semibold"
              >
                Login
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default SignUp;
