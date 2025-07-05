import { BaseApiService } from './api';
import { User } from '../types';
import { ApiResponse, PaginatedResponse } from '@/types/api';

export interface UserFilters {
  search?: string;
  status?: 'active' | 'inactive' | 'banned';
  dateFrom?: string;
  dateTo?: string;
  minOrders?: number;
  maxOrders?: number;
  minSpent?: number;
  maxSpent?: number;
  sortBy?: 'name' | 'email' | 'createdAt' | 'totalOrders' | 'totalSpent';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  totalRevenue: number;
  averageOrderValue: number;
  topSpenders: Array<{
    id: string;
    name: string;
    email: string;
    totalSpent: number;
    totalOrders: number;
  }>;
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

class UserService extends BaseApiService {
  constructor() {
    super('/users');
  }

  // Get users with filters and pagination
  async getUsers(filters?: UserFilters): Promise<PaginatedResponse<User>> {
    return this.getPaginated<User>(filters);
  }

  // Get user by ID with detailed information
  async getUserById(id: string): Promise<ApiResponse<User & {
    orders: any[];
    activities: UserActivity[];
    stats: {
      totalOrders: number;
      totalSpent: number;
      averageOrderValue: number;
      lastOrderDate?: string;
    };
  }>> {
    return this.getById(`${id}?include=orders,activities,stats`);
  }

  // Create new user
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<User>> {
    return this.create(userData);
  }

  // Update user
  async updateUser(id: string, userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.update(id, userData);
  }

  // Delete user
  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return this.deleteById(id);
  }

  // Bulk operations
  async bulkUpdateUsers(updates: Array<{ id: string; data: Partial<User> }>): Promise<ApiResponse<User[]>> {
    return this.bulkUpdate(updates);
  }

  async bulkDeleteUsers(ids: string[]): Promise<ApiResponse<void>> {
    return this.bulkDelete(ids);
  }

  // User status management
  async activateUser(id: string): Promise<ApiResponse<User>> {
    return this.patch({ isActive: true }, `/${id}/status`);
  }

  async deactivateUser(id: string): Promise<ApiResponse<User>> {
    return this.patch({ isActive: false }, `/${id}/status`);
  }

  async banUser(id: string, reason?: string): Promise<ApiResponse<User>> {
    return this.patch({ isActive: false, banReason: reason }, `/${id}/ban`);
  }

  async unbanUser(id: string): Promise<ApiResponse<User>> {
    return this.patch({ isActive: true, banReason: null }, `/${id}/unban`);
  }

  // User statistics
  async getUserStats(): Promise<ApiResponse<UserStats>> {
    return this.get('/stats');
  }

  // User activities
  async getUserActivities(userId: string, page = 1, limit = 20): Promise<PaginatedResponse<UserActivity>> {
    return this.get(`/${userId}/activities?page=${page}&limit=${limit}`);
  }

  // Search users
  async searchUsers(query: string, filters?: Partial<UserFilters>): Promise<ApiResponse<User[]>> {
    return this.get('/search', {
      params: { q: query, ...filters }
    });
  }

  // Export users
  async exportUsers(filters?: UserFilters, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    try {
      const response = await this.get('/export', {
        params: { ...filters, format },
        responseType: 'blob'
      });
      return response as unknown as Blob;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Import users
  async importUsers(file: File): Promise<ApiResponse<{
    imported: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  }>> {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await this.post(formData, '/import', {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Send notification to user
  async sendNotification(userId: string, notification: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    channels: Array<'email' | 'sms' | 'push'>;
  }): Promise<ApiResponse<void>> {
    return this.post(notification, `/${userId}/notifications`);
  }

  // Send bulk notifications
  async sendBulkNotification(userIds: string[], notification: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    channels: Array<'email' | 'sms' | 'push'>;
  }): Promise<ApiResponse<{
    sent: number;
    failed: number;
    errors: Array<{ userId: string; error: string }>;
  }>> {
    return this.post({ userIds, ...notification }, '/notifications/bulk');
  }

  // Reset user password
  async resetUserPassword(userId: string): Promise<ApiResponse<{ temporaryPassword: string }>> {
    return this.post({}, `/${userId}/reset-password`);
  }

  // Get user login history
  async getUserLoginHistory(userId: string, page = 1, limit = 20): Promise<PaginatedResponse<{
    id: string;
    ipAddress: string;
    userAgent: string;
    location?: string;
    success: boolean;
    createdAt: string;
  }>> {
    return this.get(`/${userId}/login-history?page=${page}&limit=${limit}`);
  }

  // Merge users (combine duplicate accounts)
  async mergeUsers(primaryUserId: string, secondaryUserId: string): Promise<ApiResponse<User>> {
    return this.post({ secondaryUserId }, `/${primaryUserId}/merge`);
  }
}

export const userService = new UserService();
export default userService;
