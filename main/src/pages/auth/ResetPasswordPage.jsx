import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';

import { supabase } from '../../lib/supabase';

const validatePassword = (password, confirm) => {
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[!@#$%^&*(),.?":{}|<>\-_]/.test(password)) return 'Password must contain at least one special character';
  if (password !== confirm) return 'Passwords do not match';
  return '';
};

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [linkState, setLinkState] = useState('checking'); // checking | ready | invalid

  useEffect(() => {
    const inRecoveryLink = /type=recovery|access_token=/.test(window.location.hash);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setLinkState('ready');
      }
    });

    if (inRecoveryLink) {
      // Give supabase-js a moment to exchange the recovery token
      const timer = setTimeout(() => {
        setLinkState((prev) => (prev === 'checking' ? 'invalid' : prev));
      }, 4000);
      return () => {
        clearTimeout(timer);
        subscription.unsubscribe();
      };
    }

    // No recovery token in the URL — only a normal session here
    setLinkState('invalid');
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validatePassword(password, confirm);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
      } else {
        setDone(true);
        setTimeout(() => navigate('/account', { replace: true }), 1500);
      }
    } catch (err) {
      setError(err.message || 'Could not update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6" style={{ backgroundColor: '#0a0a0a' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <h1 className="mb-2 text-4xl font-bold text-white">Set New Password</h1>
        <p className="mb-8 text-white/60">Choose a new password for your PixieKat account.</p>

        {linkState === 'checking' ? (
          <p className="text-sm text-white/50">Verifying your reset link…</p>
        ) : linkState === 'invalid' ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-sm text-red-400">
              This reset link is invalid or has expired. Request a fresh one from the login page.
            </p>
            <Link
              to="/login"
              className="mt-3 inline-block text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ color: '#DFDFF0' }}
            >
              Back to login
            </Link>
          </div>
        ) : done ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-300">Password updated. Taking you to your account…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">New Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Lock className="size-5 text-white/40" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-12 py-3.5 text-white transition-all duration-200 placeholder:text-white/40 focus:bg-white/10 focus:outline-none"
                  onFocus={e => { e.target.style.borderColor = '#DFDFF050'; e.target.style.boxShadow = '0 0 0 2px #DFDFF020'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                  placeholder="New password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white/80"
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">Confirm Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Lock className="size-5 text-white/40" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-white transition-all duration-200 placeholder:text-white/40 focus:bg-white/10 focus:outline-none"
                  onFocus={e => { e.target.style.borderColor = '#DFDFF050'; e.target.style.boxShadow = '0 0 0 2px #DFDFF020'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                  placeholder="Re-enter new password"
                />
              </div>
            </div>

            <p className="text-xs text-white/40">
              At least 8 characters with upper &amp; lowercase letters, a number, and a special character.
            </p>

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
              className={`w-full rounded-xl px-6 py-3.5 font-semibold shadow-lg transition-all duration-300 ${
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
                  <div className="mr-2 size-5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                ) : null}
                {isLoading ? 'Updating...' : 'Update Password'}
              </div>
            </motion.button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
