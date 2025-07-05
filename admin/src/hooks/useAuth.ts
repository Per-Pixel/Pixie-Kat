import { useContext, useCallback, useMemo } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { LoginCredentials, User } from '../types/auth';
import { toast } from 'react-hot-toast';

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

// Enhanced auth hook with additional utilities
export const useAuthActions = () => {
  const { login, logout, refreshToken, user, isAuthenticated } = useAuth();

  const loginWithToast = useCallback(async (credentials: LoginCredentials) => {
    try {
      await login(credentials);
      toast.success(`Welcome back, ${credentials.email}!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
      throw error;
    }
  }, [login]);

  const logoutWithToast = useCallback(() => {
    logout();
    toast.success('Logged out successfully');
  }, [logout]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      await authService.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to change password');
      throw error;
    }
  }, []);

  const updateProfile = useCallback(async (profileData: Partial<User>) => {
    try {
      const updatedUser = await authService.updateProfile(profileData);
      toast.success('Profile updated successfully');
      return updatedUser;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
      throw error;
    }
  }, []);

  const uploadAvatar = useCallback(async (file: File) => {
    try {
      const result = await authService.uploadAvatar(file);
      toast.success('Avatar updated successfully');
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload avatar');
      throw error;
    }
  }, []);

  return {
    user,
    isAuthenticated,
    login: loginWithToast,
    logout: logoutWithToast,
    refreshToken,
    changePassword,
    updateProfile,
    uploadAvatar,
  };
};

// Permission checking hook
export const usePermissions = () => {
  const { hasPermission, user } = useAuth();

  const checkPermission = useCallback((resource: string, action: string) => {
    return hasPermission(resource, action);
  }, [hasPermission]);

  const checkMultiplePermissions = useCallback((permissions: Array<{ resource: string; action: string }>) => {
    return permissions.every(({ resource, action }) => hasPermission(resource, action));
  }, [hasPermission]);

  const checkAnyPermission = useCallback((permissions: Array<{ resource: string; action: string }>) => {
    return permissions.some(({ resource, action }) => hasPermission(resource, action));
  }, [hasPermission]);

  const canCreate = useCallback((resource: string) => hasPermission(resource, 'create'), [hasPermission]);
  const canRead = useCallback((resource: string) => hasPermission(resource, 'read'), [hasPermission]);
  const canUpdate = useCallback((resource: string) => hasPermission(resource, 'update'), [hasPermission]);
  const canDelete = useCallback((resource: string) => hasPermission(resource, 'delete'), [hasPermission]);

  const userRole = useMemo(() => user?.role, [user]);
  const isAdmin = useMemo(() => user?.role === 'admin', [user]);
  const isReseller = useMemo(() => user?.role === 'reseller', [user]);
  const isSupport = useMemo(() => user?.role === 'support', [user]);

  return {
    checkPermission,
    checkMultiplePermissions,
    checkAnyPermission,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    userRole,
    isAdmin,
    isReseller,
    isSupport,
  };
};

// Session management hook
export const useSession = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  const getSessionInfo = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    const refreshToken = localStorage.getItem('admin_refresh_token');
    
    return {
      hasToken: !!token,
      hasRefreshToken: !!refreshToken,
      isAuthenticated,
      user,
    };
  }, [isAuthenticated, user]);

  const clearSession = useCallback(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
  }, []);

  const getTokenExpiry = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return null;

    try {
      // Decode JWT token to get expiry (basic implementation)
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch {
      return null;
    }
  }, []);

  const isTokenExpired = useCallback(() => {
    const expiry = getTokenExpiry();
    return expiry ? expiry < new Date() : true;
  }, [getTokenExpiry]);

  const timeUntilExpiry = useCallback(() => {
    const expiry = getTokenExpiry();
    if (!expiry) return 0;
    return Math.max(0, expiry.getTime() - Date.now());
  }, [getTokenExpiry]);

  return {
    getSessionInfo,
    clearSession,
    getTokenExpiry,
    isTokenExpired,
    timeUntilExpiry,
    isLoading,
  };
};

// Two-factor authentication hook
export const use2FA = () => {
  const enable2FA = useCallback(async () => {
    try {
      const result = await authService.enable2FA();
      toast.success('2FA setup initiated');
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to enable 2FA');
      throw error;
    }
  }, []);

  const verify2FA = useCallback(async (token: string) => {
    try {
      const result = await authService.verify2FA(token);
      toast.success('2FA enabled successfully');
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to verify 2FA');
      throw error;
    }
  }, []);

  const disable2FA = useCallback(async (token: string) => {
    try {
      await authService.disable2FA(token);
      toast.success('2FA disabled successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to disable 2FA');
      throw error;
    }
  }, []);

  return {
    enable2FA,
    verify2FA,
    disable2FA,
  };
};

// Password reset hook
export const usePasswordReset = () => {
  const forgotPassword = useCallback(async (email: string) => {
    try {
      await authService.forgotPassword(email);
      toast.success('Password reset email sent');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send reset email');
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    try {
      await authService.resetPassword(token, password);
      toast.success('Password reset successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset password');
      throw error;
    }
  }, []);

  return {
    forgotPassword,
    resetPassword,
  };
};

// Auth state monitoring hook
export const useAuthMonitor = () => {
  const { isAuthenticated, user } = useAuth();
  const { timeUntilExpiry, isTokenExpired } = useSession();

  const authStatus = useMemo(() => {
    if (!isAuthenticated) return 'unauthenticated';
    if (isTokenExpired()) return 'expired';
    
    const timeLeft = timeUntilExpiry();
    if (timeLeft < 5 * 60 * 1000) return 'expiring_soon'; // 5 minutes
    
    return 'authenticated';
  }, [isAuthenticated, isTokenExpired, timeUntilExpiry]);

  const shouldRefreshToken = useMemo(() => {
    const timeLeft = timeUntilExpiry();
    return isAuthenticated && timeLeft < 10 * 60 * 1000 && timeLeft > 0; // 10 minutes
  }, [isAuthenticated, timeUntilExpiry]);

  return {
    authStatus,
    shouldRefreshToken,
    user,
    isAuthenticated,
  };
};
