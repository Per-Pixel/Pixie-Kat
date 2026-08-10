import { LoginCredentials, AuthResponse, User, UserRole } from '../types/auth';
import { ApiResponse } from '@/types/api';
import { api } from './api';
import { supabase } from '../lib/supabase';

async function getProfileUser(userId: string): Promise<User> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, phone, role, status, avatar_url, bio, timezone, language, last_login_at, created_at, updated_at')
    .eq('id', userId)
    .single();
  if (error) throw error;
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
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      if (error || !data.session) throw error ?? new Error('Login did not return a session');
      return {
        user: await getProfileUser(data.user.id),
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  },

  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Ignore logout errors - user should be logged out locally regardless
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh_token');
    }
  },

  async validateToken(token: string): Promise<User> {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) throw error ?? new Error('Invalid token');
      return getProfileUser(data.user.id);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Token validation failed');
    }
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
      if (error || !data.session || !data.user) throw error ?? new Error('Session refresh failed');
      return {
        user: await getProfileUser(data.user.id),
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Token refresh failed');
    }
  },

  async forgotPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to send reset email');
    }
  },

  async resetPassword(token: string, password: string): Promise<void> {
    try {
      const { error: sessionError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'recovery',
      });
      if (sessionError) throw sessionError;
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to reset password');
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      void currentPassword;
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to change password');
    }
  },

  async updateProfile(profileData: Partial<User>): Promise<User> {
    try {
      const response = await api.patch<ApiResponse<User>>('/auth/profile', profileData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to update profile');
    }
  },

  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.post<ApiResponse<{ avatarUrl: string }>>('/auth/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to upload avatar');
    }
  },

  async enable2FA(): Promise<{ qrCode: string; secret: string }> {
    try {
      const response = await api.post<ApiResponse<{ qrCode: string; secret: string }>>('/auth/2fa/enable');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to enable 2FA');
    }
  },

  async verify2FA(token: string): Promise<{ backupCodes: string[] }> {
    try {
      const response = await api.post<ApiResponse<{ backupCodes: string[] }>>('/auth/2fa/verify', { token });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to verify 2FA');
    }
  },

  async disable2FA(token: string): Promise<void> {
    try {
      await api.post<ApiResponse<void>>('/auth/2fa/disable', { token });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to disable 2FA');
    }
  },
};

export default authService;
