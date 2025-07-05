import { BaseApiService } from './api';
import { ApiResponse } from '../types/api';

export interface DashboardMetrics {
  revenue: {
    total: number;
    growth: number;
    thisMonth: number;
    lastMonth: number;
    trend: Array<{ date: string; value: number }>;
  };
  orders: {
    total: number;
    growth: number;
    thisMonth: number;
    lastMonth: number;
    trend: Array<{ date: string; value: number }>;
  };
  customers: {
    total: number;
    growth: number;
    active: number;
    new: number;
    trend: Array<{ date: string; value: number }>;
  };
  products: {
    total: number;
    active: number;
    outOfStock: number;
    lowStock: number;
  };
}

export interface TrafficAnalytics {
  pageViews: {
    total: number;
    unique: number;
    growth: number;
    trend: Array<{ date: string; views: number; unique: number }>;
  };
  sessions: {
    total: number;
    averageDuration: number;
    bounceRate: number;
    trend: Array<{ date: string; sessions: number; duration: number }>;
  };
  sources: Array<{
    source: string;
    visitors: number;
    percentage: number;
    growth: number;
  }>;
  topPages: Array<{
    path: string;
    views: number;
    uniqueViews: number;
    averageTime: number;
  }>;
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  browsers: Array<{
    name: string;
    percentage: number;
    visitors: number;
  }>;
  countries: Array<{
    country: string;
    visitors: number;
    percentage: number;
  }>;
}

export interface SalesAnalytics {
  revenue: {
    total: number;
    growth: number;
    byPeriod: Array<{ date: string; revenue: number; orders: number }>;
  };
  products: {
    topSelling: Array<{
      id: string;
      name: string;
      gameName: string;
      revenue: number;
      orders: number;
      growth: number;
    }>;
    categories: Array<{
      category: string;
      revenue: number;
      orders: number;
      percentage: number;
    }>;
  };
  customers: {
    segments: Array<{
      segment: string;
      count: number;
      revenue: number;
      averageOrderValue: number;
    }>;
    retention: Array<{
      period: string;
      rate: number;
    }>;
  };
  conversion: {
    rate: number;
    funnel: Array<{
      stage: string;
      visitors: number;
      conversionRate: number;
    }>;
  };
}

export interface UserBehaviorAnalytics {
  engagement: {
    averageSessionDuration: number;
    pagesPerSession: number;
    returnVisitorRate: number;
    trend: Array<{ date: string; engagement: number }>;
  };
  userFlow: Array<{
    from: string;
    to: string;
    count: number;
    percentage: number;
  }>;
  heatmap: Array<{
    page: string;
    clicks: Array<{ x: number; y: number; count: number }>;
  }>;
  events: Array<{
    event: string;
    count: number;
    uniqueUsers: number;
    averageValue?: number;
  }>;
}

class AnalyticsService extends BaseApiService {
  constructor() {
    super('/analytics');
  }

  // Dashboard metrics
  async getDashboardMetrics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<ApiResponse<DashboardMetrics>> {
    return this.get(`/dashboard?period=${period}`);
  }

  // Traffic analytics
  async getTrafficAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<ApiResponse<TrafficAnalytics>> {
    return this.get(`/traffic?period=${period}`);
  }

  // Sales analytics
  async getSalesAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<ApiResponse<SalesAnalytics>> {
    return this.get(`/sales?period=${period}`);
  }

  // User behavior analytics
  async getUserBehaviorAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<ApiResponse<UserBehaviorAnalytics>> {
    return this.get(`/behavior?period=${period}`);
  }

  // Revenue analytics
  async getRevenueAnalytics(options: {
    period?: 'day' | 'week' | 'month' | 'year';
    gameId?: string;
    productId?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<ApiResponse<Array<{
    date: string;
    revenue: number;
    orders: number;
    averageOrderValue: number;
    refunds: number;
  }>>> {
    return this.get('/revenue', { params: options });
  }

  // Product performance analytics
  async getProductPerformance(options: {
    period?: 'day' | 'week' | 'month' | 'year';
    gameId?: string;
    limit?: number;
  } = {}): Promise<ApiResponse<Array<{
    productId: string;
    productName: string;
    gameName: string;
    revenue: number;
    orders: number;
    conversionRate: number;
    growth: number;
    rank: number;
  }>>> {
    return this.get('/products/performance', { params: options });
  }

  // Customer analytics
  async getCustomerAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<ApiResponse<{
    acquisition: Array<{ date: string; newCustomers: number; source: string }>;
    retention: Array<{ cohort: string; period: number; rate: number }>;
    lifetime: {
      averageValue: number;
      averageLifespan: number;
      segments: Array<{
        segment: string;
        count: number;
        averageValue: number;
        percentage: number;
      }>;
    };
    churn: {
      rate: number;
      trend: Array<{ date: string; rate: number }>;
      reasons: Array<{ reason: string; count: number }>;
    };
  }>> {
    return this.get(`/customers?period=${period}`);
  }

  // Geographic analytics
  async getGeographicAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<ApiResponse<{
    countries: Array<{
      country: string;
      countryCode: string;
      visitors: number;
      revenue: number;
      orders: number;
      percentage: number;
    }>;
    cities: Array<{
      city: string;
      country: string;
      visitors: number;
      revenue: number;
      percentage: number;
    }>;
    regions: Array<{
      region: string;
      visitors: number;
      revenue: number;
      growth: number;
    }>;
  }>> {
    return this.get(`/geographic?period=${period}`);
  }

  // Real-time analytics
  async getRealTimeAnalytics(): Promise<ApiResponse<{
    activeUsers: number;
    currentSessions: number;
    recentOrders: Array<{
      id: string;
      customerName: string;
      productName: string;
      amount: number;
      timestamp: string;
    }>;
    liveEvents: Array<{
      type: string;
      description: string;
      timestamp: string;
    }>;
    serverMetrics: {
      cpuUsage: number;
      memoryUsage: number;
      responseTime: number;
      errorRate: number;
    };
  }>> {
    return this.get('/realtime');
  }

  // Custom reports
  async createCustomReport(report: {
    name: string;
    description?: string;
    metrics: string[];
    dimensions: string[];
    filters?: Record<string, any>;
    period: 'day' | 'week' | 'month' | 'year';
  }): Promise<ApiResponse<{ reportId: string; data: any[] }>> {
    return this.post(report, '/reports/custom');
  }

  async getCustomReport(reportId: string): Promise<ApiResponse<{
    id: string;
    name: string;
    description?: string;
    data: any[];
    createdAt: string;
    updatedAt: string;
  }>> {
    return this.get(`/reports/custom/${reportId}`);
  }

  async getCustomReports(): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  }>>> {
    return this.get('/reports/custom');
  }

  // Export analytics data
  async exportAnalytics(type: 'dashboard' | 'traffic' | 'sales' | 'behavior', options: {
    period?: 'day' | 'week' | 'month' | 'year';
    format?: 'csv' | 'xlsx' | 'pdf';
    startDate?: string;
    endDate?: string;
  } = {}): Promise<Blob> {
    try {
      const response = await this.get(`/export/${type}`, {
        params: { ...options, format: options.format || 'csv' },
        responseType: 'blob'
      });
      return response as unknown as Blob;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // A/B testing analytics
  async getABTestResults(testId?: string): Promise<ApiResponse<Array<{
    testId: string;
    testName: string;
    variants: Array<{
      name: string;
      visitors: number;
      conversions: number;
      conversionRate: number;
      confidence: number;
    }>;
    status: 'running' | 'completed' | 'paused';
    startDate: string;
    endDate?: string;
  }>>> {
    return this.get('/ab-tests', { params: { testId } });
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
