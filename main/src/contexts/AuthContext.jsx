import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { API_BASE } from '../lib/apiBase';
import { recordLoginSession } from '../utils/sessionTelemetry';

function isUnconfirmedLoginError(message) {
  return /email not confirmed/i.test(message || '');
}

async function postAccount(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

const AuthContext = createContext();

async function recordSessionIfMfaComplete(newSession) {
  let used2fa = false;
  try {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2') return;
    used2fa = aal?.currentLevel === 'aal2';
  } catch {
    used2fa = false;
  }
  await recordLoginSession(newSession, { used2fa });
}

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, username, phone, avatar_url, avatar_frame, perks, leaderboard_opt_out, bio, role, status, wallet_balance, referral_code, email_verified, last_login_at, created_at')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState(null);

  const handleSession = useCallback(async (newSession) => {
    if (!newSession) {
      setUser(null);
      setProfile(null);
      setSession(null);
      setIsLoading(false);
      return;
    }

    const p = await fetchProfile(newSession.user.id);
    if (!p || p.status !== 'active') {
      setUser(null);
      setProfile(null);
      setSession(null);
      setIsLoading(false);
      await supabase.auth.signOut();
      return;
    }

    setUser(newSession.user);
    setProfile(p);
    setSession(newSession);
    setIsLoading(false);
    await recordSessionIfMfaComplete(newSession);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      handleSession(s);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'INITIAL_SESSION') return;
      handleSession(s);
    });

    return () => subscription.unsubscribe();
  }, [handleSession]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const channel = supabase
      .channel(`profile:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        ({ new: updatedProfile }) => {
          setProfile(updatedProfile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const login = useCallback(async (email, password, options = {}) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      if (!options.retried && isUnconfirmedLoginError(error.message)) {
        try {
          const { response } = await postAccount('/auth/open-account', {
            email: email.trim(),
            password,
          });
          if (response.ok) return login(email, password, { retried: true });
        } catch {
          // The account stays gated until the API can open it.
        }
      }
      const msg = error.message === 'Invalid login credentials'
        ? 'Invalid email or password'
        : error.message;
      return { success: false, error: msg };
    }

    return { success: true, user: data.user };
  }, []);

  const register = useCallback(async ({ name, email, password }) => {
    const legacySignUp = async () => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() },
        },
      });

      if (error) return { success: false, error: error.message };
      if (data.user && !data.session) {
        return { success: true, requiresEmailVerification: true, user: data.user };
      }
      return { success: true, user: data.user };
    };

    try {
      const { response, payload } = await postAccount('/auth/register', {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      // Older API builds do not have this route. Keep signup working until it is deployed.
      if (response.status === 404) return legacySignUp();
      if (!response.ok) return { success: false, error: payload.message || 'Registration failed' };
      return login(email, password);
    } catch {
      return legacySignUp();
    }
  }, [login]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    setProfile(p);
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      isLoading,
      isAuthenticated: !!user && !!session,
      login,
      register,
      logout,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
