import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, LogIn, Mail, UserRound } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';

const Auth = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { demoCredentials, isAuthenticated, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';
  const isRegisterRoute = location.pathname === '/register';
  const pageTitle = isRegisterRoute ? 'Create Account' : 'Demo Login';
  const submitLabel = isRegisterRoute ? 'Create Account' : 'Sign In';
  const helperText = isRegisterRoute
    ? 'Create a client-side demo account to enter the authenticated app state.'
    : 'Sign in with the fixed demo credential to trigger the authenticated navbar state.';

  const credentialSummary = useMemo(() => {
    if (isRegisterRoute) {
      return [
        'This is a demo sign-up flow with no backend.',
        'Any valid name, email, and matching password will create a local demo session.'
      ];
    }

    return [
      `Email: ${demoCredentials.email}`,
      `Password: ${demoCredentials.password}`
    ];
  }, [demoCredentials.email, demoCredentials.password, isRegisterRoute]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [from, isAuthenticated, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
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
      if (isRegisterRoute) {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        const result = await register(
          {
            name: formData.name,
            email: formData.email,
            password: formData.password
          },
          { persist: rememberMe }
        );

        if (result.success) {
          navigate(from, { replace: true });
        } else {
          setError(result.error || 'Registration failed');
        }

        return;
      }

      const result = await login(formData.email, formData.password, {
        persist: rememberMe
      });

      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setError(result.error || 'Login failed');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-dark-900 via-dark-800 to-dark-700 px-4 py-20">
      <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full bg-violet-300/20 blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-blue-300/20 blur-3xl"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold">
            <span className="bg-gradient-to-r from-violet-300 to-blue-300 bg-clip-text text-transparent">
              {pageTitle}
            </span>
          </h1>
          <p className="text-gray-500">{helperText}</p>
        </div>

        <div className="rounded-2xl border border-blue-50 bg-white/90 p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">
              {isRegisterRoute ? 'Demo sign-up rules' : 'Demo credential'}
            </p>
            {credentialSummary.map((line) => (
              <p key={line} className="mt-2">
                {line}
              </p>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isRegisterRoute ? (
              <div>
                <label className="mb-2 block font-medium text-gray-700">Full Name</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <UserRound className="h-5 w-5 text-violet-300" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-blue-75 bg-blue-50 py-3 pl-10 pr-4 text-gray-800 transition-all duration-200 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-300/30"
                    placeholder="Enter your name"
                  />
                </div>
              </div>
            ) : null}

            <div>
              <label className="mb-2 block font-medium text-gray-700">Email Address</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-violet-300" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-lg border border-blue-75 bg-blue-50 py-3 pl-10 pr-4 text-gray-800 transition-all duration-200 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-300/30"
                  placeholder={isRegisterRoute ? 'you@example.com' : demoCredentials.email}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700">Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-violet-300" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-lg border border-blue-75 bg-blue-50 py-3 pl-10 pr-12 text-gray-800 transition-all duration-200 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-300/30"
                  placeholder={isRegisterRoute ? 'Create a password' : demoCredentials.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-violet-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {isRegisterRoute ? (
              <div>
                <label className="mb-2 block font-medium text-gray-700">Confirm Password</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-violet-300" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-blue-75 bg-blue-50 py-3 pl-10 pr-4 text-gray-800 transition-all duration-200 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-300/30"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            ) : null}

            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="h-4 w-4 rounded border-gray-300 text-violet-300 focus:ring-violet-300/30"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600">
                Keep demo session after browser restart
              </label>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full rounded-xl bg-gradient-to-r from-violet-300 to-blue-300 px-6 py-3 font-bold text-white shadow-lg transition-all duration-300 ${
                isLoading ? 'cursor-not-allowed opacity-50' : 'hover:shadow-violet-300/50'
              }`}
            >
              <div className="flex items-center justify-center">
                {isLoading ? (
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
                ) : (
                  <LogIn className="mr-2 h-5 w-5" />
                )}
                {isLoading ? `${submitLabel}...` : submitLabel}
              </div>
            </motion.button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-500">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-center rounded-xl border border-white/20 bg-[#25163b] px-4 py-3 font-medium text-white transition-all duration-300 hover:bg-[#2d1a46]"
          >
            <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Login with Google
          </button>

          <div className="mt-5 text-center text-base text-gray-600">
            {isRegisterRoute ? 'Already have an account? ' : "Don't have an account? "}
            <Link
              to={isRegisterRoute ? '/login' : '/register'}
              className="font-semibold text-slate-900 transition-colors duration-200 hover:text-violet-500"
            >
              {isRegisterRoute ? 'Sign in here' : 'Sign up here'}
            </Link>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4 text-sm text-gray-600">
            <p>
              Before login: top nav shows <span className="font-semibold text-gray-900">Login</span> and bottom nav shows <span className="font-semibold text-gray-900">Account</span>.
            </p>
            <p className="mt-2">
              After login: the top-nav login button is replaced by wallet and profile shortcuts, and the bottom nav keeps <span className="font-semibold text-gray-900">Account</span> while also adding <span className="font-semibold text-gray-900">More</span>.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
