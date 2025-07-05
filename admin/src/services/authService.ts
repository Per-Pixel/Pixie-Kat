import { LoginCredentials, AuthResponse, User, UserRole } from '../types/auth';
import { ApiResponse } from '@/types/api';
import { api } from './api';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // For demo purposes, keep mock authentication but also prepare for real API
      if (credentials.email === 'admin@pixiekat.com' && credentials.password === 'admin123') {
        const mockUser: User = {
          id: '1',
          email: 'admin@pixiekat.com',
          name: 'Admin User',
          role: UserRole.ADMIN,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        return {
          user: mockUser,
          token: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token',
        };
      }

      // Real API call (uncomment when backend is ready)
      // const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
      // return response.data;

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      throw new Error('Invalid credentials');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
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
      // Mock token validation for demo
      if (token === 'mock-jwt-token') {
        return {
          id: '1',
          email: 'admin@pixiekat.com',
          name: 'Admin User',
          role: UserRole.ADMIN,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      // Real API call (uncomment when backend is ready)
      // const response = await api.get<ApiResponse<User>>('/auth/validate', {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // return response.data;

      throw new Error('Invalid token');
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
