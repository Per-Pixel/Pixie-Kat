import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, username, phone, avatar_url, bio, role, status, wallet_balance, referral_code, email_verified, last_login_at, created_at')
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
    setUser(newSession.user);
    setProfile(p);
    setSession(newSession);
    setIsLoading(false);
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

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      const msg = error.message === 'Invalid login credentials'
        ? 'Invalid email or password'
        : error.message;
      return { success: false, error: msg };
    }

    return { success: true, user: data.user };
  }, []);

  const register = useCallback(async ({ name, email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim() },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user && !data.session) {
      return {
        success: true,
        requiresEmailVerification: true,
        user: data.user,
      };
    }

    return { success: true, user: data.user };
  }, []);

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
