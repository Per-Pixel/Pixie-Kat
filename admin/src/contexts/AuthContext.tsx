import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserRole, ROLE_PERMISSIONS } from '../types/auth';
import type { User, LoginCredentials } from '../types/auth';
import { toast } from 'react-hot-toast';
import { recordLoginSession } from '../utils/sessionTelemetry';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastActivity: Date | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (resource: string, action: string) => boolean;
  clearError: () => void;
  updateLastActivity: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, phone, role, status, avatar_url, bio, timezone, language, last_login_at, created_at, updated_at')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    phone: data.phone ?? undefined,
    role: data.role as UserRole,
    avatar: data.avatar_url ?? undefined,
    bio: data.bio ?? undefined,
    timezone: data.timezone,
    language: data.language,
    isActive: data.status === 'active',
    lastActiveAt: data.last_login_at ?? undefined,
    metadata: {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);

  const handleSession = useCallback(async (newSession: Session | null) => {
    if (!newSession) {
      setUser(null);
      setSession(null);
      setIsLoading(false);
      return;
    }

    const profile = await fetchProfile(newSession.user.id);

    if (!profile) {
      setError('Account profile not found. Contact support.');
      setUser(null);
      setSession(null);
      await supabase.auth.signOut();
      setIsLoading(false);
      return;
    }

    if (!['admin', 'support'].includes(profile.role)) {
      setError('Access denied. This panel is for admins and support only.');
      setUser(null);
      setSession(null);
      await supabase.auth.signOut();
      setIsLoading(false);
      return;
    }

    if (!profile.isActive) {
      setError('Your account has been suspended. Contact a super admin.');
      setUser(null);
      setSession(null);
      await supabase.auth.signOut();
      setIsLoading(false);
      return;
    }

    setUser(profile);
    setSession(newSession);
    setLastActivity(new Date());
    setIsLoading(false);
    recordLoginSession(newSession);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      handleSession(s ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: Session | null) => {
        if (event === 'INITIAL_SESSION') return;
        handleSession(newSession);
      }
    );

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (signInError) {
      const msg = signInError.message === 'Invalid login credentials'
        ? 'Invalid email or password'
        : signInError.message;
      setError(msg);
      setIsLoading(false);
      throw new Error(msg);
    }

    await recordLoginSession(data.session);
    // onAuthStateChange fires and calls handleSession — no manual state needed here
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setLastActivity(null);
  }, []);

  const hasPermission = useCallback((resource: string, action: string): boolean => {
    if (!user) return false;
    const permissions = ROLE_PERMISSIONS[user.role];
    if (!permissions) return false;
    return permissions.find(p => p.resource === resource)?.actions.includes(action) ?? false;
  }, [user]);

  const clearError = useCallback(() => setError(null), []);

  const updateLastActivity = useCallback(() => setLastActivity(new Date()), []);

  const refreshSession = useCallback(async () => {
    const { data, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      toast.error('Session expired. Please log in again.');
      await logout();
      throw refreshError;
    }
    if (data.session) {
      setSession(data.session);
      setLastActivity(new Date());
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAuthenticated: !!user && !!session,
      isLoading,
      error,
      lastActivity,
      login,
      logout,
      hasPermission,
      clearError,
      updateLastActivity,
      refreshSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
