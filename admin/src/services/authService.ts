import { LoginCredentials, AuthResponse, User, UserRole } from '../types/auth';
import { ApiResponse } from '@/types/api';
import { api } from './api';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Real API call - backend sets HTTP-only cookie
      const response = await api.post('/auth/login', credentials);
      
      // Backend returns user data, cookie is set automatically
      const { user } = response.data;
      
      // Return auth response (no tokens needed, using cookies)
      return {
        user: {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: UserRole.ADMIN, // Default to admin for now
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        token: 'cookie-based', // Placeholder
        refreshToken: 'cookie-based', // Placeholder
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
      // Cookie is cleared by backend
    } catch (error) {
      // Ignore logout errors - user should be logged out locally regardless
      console.warn('Logout API call failed:', error);
    }
  },

  async validateToken(): Promise<User> {
    try {
      // Real API call - validates cookie automatically
      const response = await api.get('/auth/me');
      const { user } = response.data;
      
      return {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        role: UserRole.ADMIN, // Default to admin for now
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Token validation failed');
    }
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/refresh', { refreshToken });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Token refresh failed');
    }
  },

  async forgotPassword(email: string): Promise<void> {
    try {
      await api.post<ApiResponse<void>>('/auth/forgot-password', { email });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to send reset email');
    }
  },

  async resetPassword(token: string, password: string): Promise<void> {
    try {
      await api.post<ApiResponse<void>>('/auth/reset-password', { token, password });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to reset password');
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await api.post<ApiResponse<void>>('/auth/change-password', {
        currentPassword,
        newPassword
      });
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
