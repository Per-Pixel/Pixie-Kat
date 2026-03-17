import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();
const AUTH_STORAGE_KEY = 'pixiekat-demo-auth';

export const DEMO_CREDENTIALS = {
  email: 'demo@client.com',
  password: 'password123',
};

const getStoredAuth = () => {
  const localValue = localStorage.getItem(AUTH_STORAGE_KEY);
  const sessionValue = sessionStorage.getItem(AUTH_STORAGE_KEY);
  const storedValue = localValue || sessionValue;

  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue);
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

const persistAuth = (authState, persist) => {
  const serializedState = JSON.stringify(authState);

  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);

  if (persist) {
    localStorage.setItem(AUTH_STORAGE_KEY, serializedState);
    return;
  }

  sessionStorage.setItem(AUTH_STORAGE_KEY, serializedState);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedAuth = getStoredAuth();

    if (storedAuth?.user) {
      setUser(storedAuth.user);
    }

    setIsLoading(false);
  }, []);

  const login = async (email, password, options = {}) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (
      normalizedEmail !== DEMO_CREDENTIALS.email ||
      password !== DEMO_CREDENTIALS.password
    ) {
      return {
        success: false,
        error: `Use ${DEMO_CREDENTIALS.email} / ${DEMO_CREDENTIALS.password}`,
      };
    }

    const demoUser = {
      id: 'demo-user',
      email: DEMO_CREDENTIALS.email,
      name: 'Demo Client',
    };

    persistAuth({ user: demoUser }, Boolean(options.persist));
    setUser(demoUser);

    return { success: true, user: demoUser };
  };

  const register = async ({ name, email, password }, options = {}) => {
    const normalizedEmail = email.trim().toLowerCase();

    const demoUser = {
      id: 'demo-user',
      email: normalizedEmail,
      name: name.trim() || 'New User',
      passwordHint: password,
    };

    persistAuth({ user: demoUser }, Boolean(options.persist));
    setUser(demoUser);

    return { success: true, user: demoUser };
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  };

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    demoCredentials: DEMO_CREDENTIALS,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
