import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { User, AuthState, LoginCredentials, UserRole, ROLE_PERMISSIONS } from '../types/auth';
import { authService } from '../services/authService';
import { toast } from 'react-hot-toast';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  hasPermission: (resource: string, action: string) => boolean;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  updateLastActivity: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_ACTIVITY' }
  | { type: 'TOKEN_REFRESH_SUCCESS'; payload: User }
  | { type: 'TOKEN_REFRESH_FAILURE' };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  lastActivity: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'UPDATE_ACTIVITY':
      return {
        ...state,
        lastActivity: new Date(),
      };
    case 'TOKEN_REFRESH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        error: null,
      };
    case 'TOKEN_REFRESH_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        error: 'Session expired',
      };
    default:
      return state;
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const checkTokenExpiry = () => {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiryTime = payload.exp * 1000;
        const currentTime = Date.now();
        const timeUntilExpiry = expiryTime - currentTime;

        // Refresh token 5 minutes before expiry
        if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
          refreshToken().catch(() => {
            // Silent fail - user will be logged out on next API call
          });
        }
      } catch (error) {
        // Invalid token format
        logout();
      }
    };

    const interval = setInterval(checkTokenExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [state.isAuthenticated]);

  useEffect(() => {
    // Check for existing token on app load
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        if (token) {
          const user = await authService.validateToken(token);
          dispatch({ type: 'LOGIN_SUCCESS', payload: user });
        }
      } catch (error) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh_token');
        console.warn('Token validation failed:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'LOGIN_START' });
      const response = await authService.login(credentials);

      localStorage.setItem('admin_token', response.token);
      localStorage.setItem('admin_refresh_token', response.refreshToken);

      dispatch({ type: 'LOGIN_SUCCESS', payload: response.user });
      dispatch({ type: 'UPDATE_ACTIVITY' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: message });
      throw error;
    }
  };

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh_token');
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  const hasPermission = (resource: string, action: string): boolean => {
    if (!state.user) return false;
    
    const permissions = ROLE_PERMISSIONS[state.user.role];
    const resourcePermission = permissions.find(p => p.resource === resource);
    
    return resourcePermission?.actions.includes(action) || false;
  };

  const refreshToken = useCallback(async () => {
    try {
      const refreshTokenValue = localStorage.getItem('admin_refresh_token');
      if (!refreshTokenValue) throw new Error('No refresh token');

      const response = await authService.refreshToken(refreshTokenValue);
      localStorage.setItem('admin_token', response.token);

      dispatch({ type: 'TOKEN_REFRESH_SUCCESS', payload: response.user });
      dispatch({ type: 'UPDATE_ACTIVITY' });
    } catch (error) {
      dispatch({ type: 'TOKEN_REFRESH_FAILURE' });
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh_token');
      toast.error('Session expired. Please log in again.');
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const updateLastActivity = useCallback(() => {
    dispatch({ type: 'UPDATE_ACTIVITY' });
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    hasPermission,
    refreshToken,
    clearError,
    updateLastActivity,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
