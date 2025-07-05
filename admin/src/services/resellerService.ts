import { BaseApiService } from './api';
import { ApiResponse, PaginatedResponse } from '@/types/api';

export interface Reseller {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  website?: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  commissionRate: number;
  totalSales: number;
  totalCommission: number;
  balance: number;
  joinedAt: string;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResellerFilters {
  search?: string;
  status?: 'active' | 'inactive' | 'pending' | 'suspended';
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  minSales?: number;
  maxSales?: number;
  minCommission?: number;
  maxCommission?: number;
  joinedFrom?: string;
  joinedTo?: string;
  sortBy?: 'name' | 'totalSales' | 'totalCommission' | 'joinedAt' | 'lastActiveAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ResellerStats {
  totalResellers: number;
  activeResellers: number;
  pendingResellers: number;
  suspendedResellers: number;
  totalSales: number;
  totalCommissions: number;
  averageCommissionRate: number;
  topResellers: Array<{
    id: string;
    name: string;
    totalSales: number;
    totalCommission: number;
    tier: string;
  }>;
  tierDistribution: Record<string, number>;
}

export interface ResellerWithDetails extends Reseller {
  profile: {
    avatar?: string;
    bio?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      country: string;
      zipCode: string;
    };
    bankDetails?: {
      accountName: string;
      accountNumber: string;
      bankName: string;
      routingNumber?: string;
    };
  };
  performance: {
    monthlyStats: Array<{
      month: string;
      sales: number;
      commission: number;
      orders: number;
    }>;
    topProducts: Array<{
      productId: string;
      productName: string;
      sales: number;
      commission: number;
    }>;
    conversionRate: number;
    averageOrderValue: number;
  };
  commissions: {
    pending: number;
    paid: number;
    total: number;
    lastPayment?: {
      amount: number;
      date: string;
      method: string;
    };
  };
}

export interface CommissionPayment {
  id: string;
  resellerId: string;
  amount: number;
  method: 'bank_transfer' | 'paypal' | 'crypto' | 'store_credit';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transactionId?: string;
  notes?: string;
  createdAt: string;
  processedAt?: string;
}

class ResellerService extends BaseApiService {
  constructor() {
    super('/resellers');
  }

  // Get resellers with filters and pagination
  async getResellers(filters?: ResellerFilters): Promise<PaginatedResponse<Reseller>> {
    return this.getPaginated<Reseller>(filters);
  }

  // Get reseller by ID with detailed information
  async getResellerById(id: string): Promise<ApiResponse<ResellerWithDetails>> {
    return this.getById(`${id}?include=profile,performance,commissions`);
  }

  // Create new reseller
  async createReseller(resellerData: Omit<Reseller, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Reseller>> {
    return this.create(resellerData);
  }

  // Update reseller
  async updateReseller(id: string, resellerData: Partial<Reseller>): Promise<ApiResponse<Reseller>> {
    return this.update(id, resellerData);
  }

  // Delete reseller
  async deleteReseller(id: string): Promise<ApiResponse<void>> {
    return this.deleteById(id);
  }

  // Bulk operations
  async bulkUpdateResellers(updates: Array<{ id: string; data: Partial<Reseller> }>): Promise<ApiResponse<Reseller[]>> {
    return this.bulkUpdate(updates);
  }

  async bulkDeleteResellers(ids: string[]): Promise<ApiResponse<void>> {
    return this.bulkDelete(ids);
  }

  // Reseller status management
  async activateReseller(id: string): Promise<ApiResponse<Reseller>> {
    return this.patch({ status: 'active' }, `/${id}/activate`);
  }

  async deactivateReseller(id: string, reason?: string): Promise<ApiResponse<Reseller>> {
    return this.patch({ status: 'inactive', deactivationReason: reason }, `/${id}/deactivate`);
  }

  async suspendReseller(id: string, reason: string, duration?: number): Promise<ApiResponse<Reseller>> {
    return this.patch({ 
      status: 'suspended', 
      suspensionReason: reason,
      suspensionDuration: duration,
      suspendedAt: new Date().toISOString()
    }, `/${id}/suspend`);
  }

  async approveReseller(id: string): Promise<ApiResponse<Reseller>> {
    return this.patch({ status: 'active', approvedAt: new Date().toISOString() }, `/${id}/approve`);
  }

  async rejectReseller(id: string, reason: string): Promise<ApiResponse<Reseller>> {
    return this.patch({ 
      status: 'inactive', 
      rejectionReason: reason,
      rejectedAt: new Date().toISOString()
    }, `/${id}/reject`);
  }

  // Tier management
  async updateResellerTier(id: string, tier: 'bronze' | 'silver' | 'gold' | 'platinum'): Promise<ApiResponse<Reseller>> {
    return this.patch({ tier }, `/${id}/tier`);
  }

  async updateCommissionRate(id: string, commissionRate: number): Promise<ApiResponse<Reseller>> {
    return this.patch({ commissionRate }, `/${id}/commission-rate`);
  }

  // Commission management
  async getResellerCommissions(id: string, page = 1, limit = 20): Promise<PaginatedResponse<{
    id: string;
    orderId: string;
    productName: string;
    customerName: string;
    saleAmount: number;
    commissionRate: number;
    commissionAmount: number;
    status: 'pending' | 'paid';
    createdAt: string;
    paidAt?: string;
  }>> {
    return this.get(`/${id}/commissions?page=${page}&limit=${limit}`);
  }

  async payCommissions(resellerIds: string[], paymentMethod: string, notes?: string): Promise<ApiResponse<{
    successful: Array<{
      resellerId: string;
      amount: number;
      paymentId: string;
    }>;
    failed: Array<{
      resellerId: string;
      error: string;
    }>;
  }>> {
    return this.post({ resellerIds, paymentMethod, notes }, '/commissions/pay');
  }

  async getCommissionPayments(resellerId?: string, page = 1, limit = 20): Promise<PaginatedResponse<CommissionPayment>> {
    const params = { page, limit, ...(resellerId && { resellerId }) };
    return this.get('/commissions/payments', { params });
  }

  // Performance analytics
  async getResellerPerformance(id: string, period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<ApiResponse<{
    sales: Array<{ date: string; amount: number; orders: number }>;
    commissions: Array<{ date: string; amount: number }>;
    topProducts: Array<{
      productId: string;
      productName: string;
      sales: number;
      commission: number;
    }>;
    metrics: {
      totalSales: number;
      totalCommission: number;
      averageOrderValue: number;
      conversionRate: number;
      customerRetention: number;
    };
  }>> {
    return this.get(`/${id}/performance?period=${period}`);
  }

  async getResellerLeaderboard(period: 'month' | 'quarter' | 'year' = 'month', metric: 'sales' | 'commission' = 'sales'): Promise<ApiResponse<Array<{
    rank: number;
    resellerId: string;
    resellerName: string;
    value: number;
    growth: number;
    tier: string;
  }>>> {
    return this.get(`/leaderboard?period=${period}&metric=${metric}`);
  }

  // Reseller statistics
  async getResellerStats(): Promise<ApiResponse<ResellerStats>> {
    return this.get('/stats');
  }

  // Search resellers
  async searchResellers(query: string, filters?: Partial<ResellerFilters>): Promise<ApiResponse<Reseller[]>> {
    return this.get('/search', {
      params: { q: query, ...filters }
    });
  }

  // Export resellers
  async exportResellers(filters?: ResellerFilters, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
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

  // Import resellers
  async importResellers(file: File): Promise<ApiResponse<{
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

  // Reseller documents
  async uploadDocument(id: string, file: File, type: string): Promise<ApiResponse<{
    id: string;
    filename: string;
    type: string;
    url: string;
  }>> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('type', type);
    
    try {
      const response = await this.post(formData, `/${id}/documents`, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getResellerDocuments(id: string): Promise<ApiResponse<Array<{
    id: string;
    filename: string;
    type: string;
    url: string;
    uploadedAt: string;
  }>>> {
    return this.get(`/${id}/documents`);
  }

  // Reseller notifications
  async sendNotification(resellerIds: string[], message: string, type: 'info' | 'warning' | 'success' | 'error' = 'info'): Promise<ApiResponse<{
    sent: number;
    failed: number;
  }>> {
    return this.post({ resellerIds, message, type }, '/notifications');
  }

  // Reseller activity tracking
  async getResellerActivity(id: string, page = 1, limit = 20): Promise<PaginatedResponse<{
    id: string;
    action: string;
    description: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
  }>> {
    return this.get(`/${id}/activity?page=${page}&limit=${limit}`);
  }
}

export const resellerService = new ResellerService();
export default resellerService;
