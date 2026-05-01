import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, UserRound, ArrowLeft, Headphones, Send } from 'lucide-react';

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

  const { isAuthenticated, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';
  const isRegisterRoute = location.pathname === '/register';
  const pageTitle = isRegisterRoute ? 'Sign Up' : 'Welcome!';
  const submitLabel = isRegisterRoute ? 'Create Account' : 'Login';
  const helperText = isRegisterRoute
    ? 'Create your account'
    : 'Log in with email';

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
          setIsLoading(false);
          return;
        }

        const result = await register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        });

        if (result.success) {
          navigate(from, { replace: true });
        } else {
          setError(result.error || 'Registration failed');
        }

        return;
      }

      const result = await login(formData.email, formData.password);

      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden" style={{ backgroundColor: '#0a0a0a' }}>

      {/* ─── Desktop left panel ─────────────────────────────────────────── */}
      <div className="hidden w-1/2 items-center justify-center p-12 lg:flex" style={{ background: 'linear-gradient(135deg, #DFDFF0 0%, #c8c8e8 100%)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative flex h-full w-full max-w-lg flex-col items-center justify-center"
        >
          <div className="mb-8 text-center">
            <img
              src="/img/swordman.webp"
              alt="PixieKat"
              className="mx-auto mb-6 h-64 w-64 rounded-3xl object-cover shadow-2xl"
            />
            <div className="flex items-center justify-center gap-2">
              <div className="h-12 w-12 rounded-lg bg-white p-2">
                <img src="/img/logo.png" alt="Logo" className="h-full w-full object-contain" />
              </div>
              <h2 className="text-3xl font-bold" style={{ color: '#1a1a2e' }}>PixieKat</h2>
            </div>
          </div>
          <p className="mt-4 text-center text-lg" style={{ color: '#1a1a2e99' }}>
            The refill store that will always be at your disposal.
          </p>
        </motion.div>
      </div>

      {/* ─── Right / Mobile main panel ──────────────────────────────────── */}
      <div className="flex w-full flex-col lg:w-1/2" style={{ backgroundColor: '#0a0a0a' }}>

        {/* ── Mobile / Tablet Hero Banner (hidden on desktop) ── */}
        <div className="relative lg:hidden" style={{ backgroundColor: '#0a0a0a' }}>
          {/* Back button inside the banner, top-left */}
          <Link
            to="/"
            className="absolute left-4 top-4 z-10 flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-all"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <div className="flex flex-col items-center px-6 pb-8 pt-16">
            {/* Brand image */}
            <div
              className="w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <img
                src="/img/swordman.webp"
                alt="PixieKat"
                className="h-52 w-full object-cover object-center"
              />
              {/* Logo strip inside card */}
              <div className="flex items-center justify-center gap-2 py-3">
                <div className="h-8 w-8 rounded-md bg-white p-1 shadow">
                  <img src="/img/logo.png" alt="Logo" className="h-full w-full object-contain" />
                </div>
                <span className="text-base font-bold text-white">PixieKat</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Form area ── */}
        <div className="flex flex-1 items-start justify-center px-6 py-8 lg:items-center lg:py-12">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md"
          >
            {/* Desktop back arrow (inside form column, hidden on mobile) */}
            <div className="mb-8 hidden lg:block">
              <Link to="/" className="mb-6 inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm">Back</span>
              </Link>
              <h1 className="mb-2 text-4xl font-bold text-white">{pageTitle}</h1>
              <p className="text-white/60">{helperText}</p>
            </div>

            {/* Mobile heading (shown below banner) */}
            <div className="mb-6 lg:hidden">
              <h1 className="mb-1 text-3xl font-bold text-white">{pageTitle}</h1>
              <p className="text-white/60 text-sm">{helperText}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {isRegisterRoute ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">Name</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <UserRound className="h-5 w-5 text-white/40" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-white placeholder-white/40 transition-all duration-200 focus:bg-white/10 focus:outline-none focus:ring-2"
                      style={{ '--tw-ring-color': '#DFDFF040', outlineColor: 'transparent' }}
                      onFocus={e => { e.target.style.borderColor = '#DFDFF050'; e.target.style.boxShadow = '0 0 0 2px #DFDFF020'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                      placeholder="Enter your name"
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">Email</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Mail className="h-5 w-5 text-white/40" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-white placeholder-white/40 transition-all duration-200 focus:bg-white/10 focus:outline-none"
                    onFocus={e => { e.target.style.borderColor = '#DFDFF050'; e.target.style.boxShadow = '0 0 0 2px #DFDFF020'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                    placeholder="Email"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">Password</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Lock className="h-5 w-5 text-white/40" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-12 text-white placeholder-white/40 transition-all duration-200 focus:bg-white/10 focus:outline-none"
                    onFocus={e => { e.target.style.borderColor = '#DFDFF050'; e.target.style.boxShadow = '0 0 0 2px #DFDFF020'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white/80"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {isRegisterRoute ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">Confirm Password</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Lock className="h-5 w-5 text-white/40" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-white placeholder-white/40 transition-all duration-200 focus:bg-white/10 focus:outline-none"
                      onFocus={e => { e.target.style.borderColor = '#DFDFF050'; e.target.style.boxShadow = '0 0 0 2px #DFDFF020'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>
              ) : null}

              {!isRegisterRoute ? (
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <a href="#" style={{ color: '#DFDFF0' }} className="hover:opacity-80 transition-opacity">
                      Forgot password?
                    </a>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              ) : null}

              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`w-full rounded-xl px-6 py-3.5 font-semibold text-white shadow-lg transition-all duration-300 ${
                  isLoading ? 'cursor-not-allowed opacity-50' : 'hover:opacity-90'
                }`}
                style={{
                  backgroundColor: '#DFDFF0',
                  color: '#1a1a2e',
                  boxShadow: isLoading ? 'none' : '0 4px 24px #DFDFF040'
                }}
              >
                <div className="flex items-center justify-center">
                  {isLoading ? (
                    <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  ) : null}
                  {isLoading ? `${submitLabel}...` : submitLabel}
                </div>
              </motion.button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-[#0a0a0a] px-4 text-white/40">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 font-medium text-white transition-all duration-300 hover:bg-white/10"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
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

            <div className="mt-6 text-center text-sm text-white/60">
              {isRegisterRoute ? 'Already have an account? ' : "Don't have an account? "}
              <Link
                to={isRegisterRoute ? '/login' : '/register'}
                className="font-semibold transition-colors duration-200 hover:opacity-80"
                style={{ color: '#DFDFF0' }}
              >
                {isRegisterRoute ? 'Sign in' : 'Sign up'}
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ─── Floating Action Buttons (mobile/tablet) ────────────────────── */}
      {/* Contact button */}
      <motion.a
        href="/support"
        aria-label="Contact Support"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg lg:hidden"
        style={{ backgroundColor: '#DFDFF0', color: '#1a1a2e' }}
      >
        <Headphones className="h-6 w-6" />
      </motion.a>

      {/* Share button */}
      <motion.button
        type="button"
        aria-label="Share"
        onClick={() => {
          if (navigator.share) {
            navigator.share({ title: 'PixieKat', url: window.location.href });
          } else {
            navigator.clipboard.writeText(window.location.href);
          }
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg lg:hidden"
        style={{ backgroundColor: '#e8a44a', color: '#fff' }}
      >
        <Send className="h-6 w-6" />
      </motion.button>
    </div>
  );
};

export default Auth;
