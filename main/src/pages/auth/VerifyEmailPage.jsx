import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API_BASE } from '../../lib/apiBase';

const VerifyEmailPage = () => {
  const [state, setState] = useState('working');
  const [message, setMessage] = useState('Checking this link…');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token') || '';
    if (!token) {
      setState('error');
      setMessage('This verification link is not valid.');
      return undefined;
    }

    let cancelled = false;
    fetch(`${API_BASE}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setState('error');
          setMessage(payload.message || 'Could not verify this email.');
          return;
        }
        setState('done');
        setMessage(payload.message || 'Email verified. Your username is locked.');
      })
      .catch(() => {
        if (cancelled) return;
        setState('error');
        setMessage('Could not verify this email. Try again from Security.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center px-6" style={{ backgroundColor: '#0a0a0a' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md"
      >
        <h1 className="mb-2 text-4xl font-bold text-white">
          {state === 'done' ? 'Username locked' : 'Verify email'}
        </h1>
        <p className="mb-8 text-base leading-relaxed text-white/70">{message}</p>
        <Link
          to={state === 'done' ? '/account' : '/account/security'}
          className="inline-flex rounded-xl px-5 py-3 text-sm font-semibold"
          style={{ backgroundColor: '#DFDFF0', color: '#1a1a2e' }}
        >
          {state === 'done' ? 'Go to your account' : 'Back to Security'}
        </Link>
      </motion.div>
    </div>
  );
};

export default VerifyEmailPage;
