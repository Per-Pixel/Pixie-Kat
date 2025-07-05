// Export all services
export { api, BaseApiService } from './api';
export { authService } from './authService';
export { userService } from './userService';
export { gameService } from './gameService';
export { productService } from './productService';
export { orderService } from './orderService';
export { resellerService } from './resellerService';
export { messageService } from './messageService';
export { analyticsService } from './analyticsService';

// Export service types
export type { UserFilters, UserStats, UserActivity } from './userService';
export type { GameFilters, GameStats, GameWithProducts } from './gameService';
export type { ProductFilters, ProductStats, ProductWithDetails, StockAlert } from './productService';
export type { OrderFilters, OrderStats, OrderWithDetails, RefundRequest, OrderDelivery } from './orderService';
export type { Reseller, ResellerFilters, ResellerStats, ResellerWithDetails, CommissionPayment } from './resellerService';
export type { MessageFilters, MessageStats, MessageWithDetails, MessageReply, MessageAttachment, NotificationTemplate } from './messageService';
export type { DashboardMetrics, TrafficAnalytics, SalesAnalytics, UserBehaviorAnalytics } from './analyticsService';

// Service configuration
export const SERVICES_CONFIG = {
  retryAttempts: 3,
  retryDelay: 1000,
  timeout: 15000,
} as const;

// Service status monitoring
export class ServiceMonitor {
  private static instance: ServiceMonitor;
  private healthChecks: Map<string, boolean> = new Map();
  private lastCheck: Date = new Date();

  static getInstance(): ServiceMonitor {
    if (!ServiceMonitor.instance) {
      ServiceMonitor.instance = new ServiceMonitor();
    }
    return ServiceMonitor.instance;
  }

  async checkHealth(): Promise<Record<string, boolean>> {
    const services = ['auth', 'users', 'games', 'products', 'messages', 'analytics'];
    const results: Record<string, boolean> = {};

    for (const service of services) {
      try {
        // Simple health check - attempt to reach the service endpoint
        await api.get(`/${service}/health`, { timeout: 5000 });
        results[service] = true;
        this.healthChecks.set(service, true);
      } catch (error) {
        results[service] = false;
        this.healthChecks.set(service, false);
      }
    }

    this.lastCheck = new Date();
    return results;
  }

  getServiceStatus(service: string): boolean {
    return this.healthChecks.get(service) ?? false;
  }

  getLastCheckTime(): Date {
    return this.lastCheck;
  }

  getAllStatuses(): Record<string, boolean> {
    const statuses: Record<string, boolean> = {};
    this.healthChecks.forEach((status, service) => {
      statuses[service] = status;
    });
    return statuses;
  }
}

// Error handling utilities
export class ServiceError extends Error {
  constructor(
    message: string,
    public service: string,
    public status?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export const handleServiceError = (error: any, serviceName: string): ServiceError => {
  if (error instanceof ServiceError) {
    return error;
  }

  const message = error.response?.data?.message || error.message || 'Unknown service error';
  const status = error.response?.status;
  const code = error.response?.data?.code;
  const details = error.response?.data?.details;

  return new ServiceError(message, serviceName, status, code, details);
};

// Service utilities
export const createServiceInstance = <T extends BaseApiService>(
  ServiceClass: new (endpoint: string) => T,
  endpoint: string
): T => {
  return new ServiceClass(endpoint);
};

// Batch operations utility
export class BatchOperationManager {
  private operations: Array<() => Promise<any>> = [];
  private batchSize: number = 10;
  private concurrency: number = 3;

  constructor(batchSize = 10, concurrency = 3) {
    this.batchSize = batchSize;
    this.concurrency = concurrency;
  }

  addOperation(operation: () => Promise<any>): void {
    this.operations.push(operation);
  }

  async execute(): Promise<{
    successful: any[];
    failed: Array<{ error: any; index: number }>;
  }> {
    const successful: any[] = [];
    const failed: Array<{ error: any; index: number }> = [];

    // Process operations in batches
    for (let i = 0; i < this.operations.length; i += this.batchSize) {
      const batch = this.operations.slice(i, i + this.batchSize);
      
      // Execute batch with limited concurrency
      const batchPromises = batch.map(async (operation, batchIndex) => {
        try {
          const result = await operation();
          successful.push(result);
          return { success: true, result, index: i + batchIndex };
        } catch (error) {
          failed.push({ error, index: i + batchIndex });
          return { success: false, error, index: i + batchIndex };
        }
      });

      // Wait for batch to complete
      await Promise.allSettled(batchPromises);
    }

    return { successful, failed };
  }

  clear(): void {
    this.operations = [];
  }

  getOperationCount(): number {
    return this.operations.length;
  }
}

// Cache management
export class ServiceCache {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    return this.cache.size;
  }
}

// Global service cache instance
export const serviceCache = new ServiceCache();

// Auto-cleanup cache every 10 minutes
setInterval(() => {
  serviceCache.cleanup();
}, 10 * 60 * 1000);

// Service initialization
export const initializeServices = async (): Promise<void> => {
  try {
    // Check service health
    const monitor = ServiceMonitor.getInstance();
    await monitor.checkHealth();
    
    console.log('✅ Services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    throw error;
  }
};
