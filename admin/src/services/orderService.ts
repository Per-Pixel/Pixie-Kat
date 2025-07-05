import { BaseApiService } from './api';
import { Order, OrderStatus } from '../types';
import { ApiResponse, PaginatedResponse } from '@/types/api';

export interface OrderFilters {
  search?: string;
  status?: OrderStatus;
  customerId?: string;
  productId?: string;
  gameId?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'amount' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<OrderStatus, number>;
  recentOrders: Array<{
    id: string;
    customerName: string;
    productName: string;
    amount: number;
    status: OrderStatus;
    createdAt: string;
  }>;
}

export interface OrderWithDetails extends Order {
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  product: {
    id: string;
    name: string;
    gameName: string;
    price: number;
  };
  payment: {
    method: string;
    transactionId?: string;
    gateway?: string;
    gatewayResponse?: any;
  };
  delivery: {
    status: 'pending' | 'processing' | 'delivered' | 'failed';
    deliveredAt?: string;
    deliveryData?: any;
    attempts: number;
  };
}

export interface RefundRequest {
  orderId: string;
  reason: string;
  amount?: number;
  refundMethod?: 'original' | 'store_credit';
  notes?: string;
}

export interface OrderDelivery {
  orderId: string;
  deliveryData: any;
  notes?: string;
}

class OrderService extends BaseApiService {
  constructor() {
    super('/orders');
  }

  // Get orders with filters and pagination
  async getOrders(filters?: OrderFilters): Promise<PaginatedResponse<Order>> {
    return this.getPaginated<Order>(filters);
  }

  // Get order by ID with detailed information
  async getOrderById(id: string): Promise<ApiResponse<OrderWithDetails>> {
    return this.getById(`${id}?include=customer,product,payment,delivery`);
  }

  // Create new order
  async createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Order>> {
    return this.create(orderData);
  }

  // Update order
  async updateOrder(id: string, orderData: Partial<Order>): Promise<ApiResponse<Order>> {
    return this.update(id, orderData);
  }

  // Delete order
  async deleteOrder(id: string): Promise<ApiResponse<void>> {
    return this.deleteById(id);
  }

  // Bulk operations
  async bulkUpdateOrders(updates: Array<{ id: string; data: Partial<Order> }>): Promise<ApiResponse<Order[]>> {
    return this.bulkUpdate(updates);
  }

  async bulkDeleteOrders(ids: string[]): Promise<ApiResponse<void>> {
    return this.bulkDelete(ids);
  }

  // Order status management
  async updateOrderStatus(id: string, status: OrderStatus, notes?: string): Promise<ApiResponse<Order>> {
    return this.patch({ status, notes }, `/${id}/status`);
  }

  async approveOrder(id: string, notes?: string): Promise<ApiResponse<Order>> {
    return this.patch({ status: OrderStatus.PROCESSING, notes }, `/${id}/approve`);
  }

  async completeOrder(id: string, deliveryData?: any): Promise<ApiResponse<Order>> {
    return this.patch({ 
      status: OrderStatus.COMPLETED, 
      deliveryData,
      completedAt: new Date().toISOString()
    }, `/${id}/complete`);
  }

  async cancelOrder(id: string, reason: string): Promise<ApiResponse<Order>> {
    return this.patch({ 
      status: OrderStatus.CANCELLED, 
      cancellationReason: reason,
      cancelledAt: new Date().toISOString()
    }, `/${id}/cancel`);
  }

  // Payment management
  async processPayment(id: string, paymentData: {
    method: string;
    transactionId?: string;
    gateway?: string;
    amount: number;
  }): Promise<ApiResponse<Order>> {
    return this.post(paymentData, `/${id}/payment`);
  }

  async refundOrder(id: string, refundData: RefundRequest): Promise<ApiResponse<{
    order: Order;
    refund: {
      id: string;
      amount: number;
      status: string;
      transactionId?: string;
    };
  }>> {
    return this.post(refundData, `/${id}/refund`);
  }

  async getPaymentHistory(orderId: string): Promise<ApiResponse<Array<{
    id: string;
    type: 'payment' | 'refund';
    amount: number;
    method: string;
    status: string;
    transactionId?: string;
    createdAt: string;
  }>>> {
    return this.get(`/${orderId}/payment/history`);
  }

  // Delivery management
  async deliverOrder(id: string, deliveryData: OrderDelivery): Promise<ApiResponse<Order>> {
    return this.post(deliveryData, `/${id}/deliver`);
  }

  async retryDelivery(id: string, notes?: string): Promise<ApiResponse<Order>> {
    return this.post({ notes }, `/${id}/delivery/retry`);
  }

  async getDeliveryHistory(orderId: string): Promise<ApiResponse<Array<{
    id: string;
    status: string;
    attempt: number;
    deliveryData?: any;
    notes?: string;
    createdAt: string;
  }>>> {
    return this.get(`/${orderId}/delivery/history`);
  }

  // Order statistics
  async getOrderStats(): Promise<ApiResponse<OrderStats>> {
    return this.get('/stats');
  }

  // Search orders
  async searchOrders(query: string, filters?: Partial<OrderFilters>): Promise<ApiResponse<Order[]>> {
    return this.get('/search', {
      params: { q: query, ...filters }
    });
  }

  // Export orders
  async exportOrders(filters?: OrderFilters, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
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

  // Import orders
  async importOrders(file: File): Promise<ApiResponse<{
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

  // Order analytics
  async getOrderAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<ApiResponse<Array<{
    date: string;
    orders: number;
    revenue: number;
    averageOrderValue: number;
  }>>> {
    return this.get(`/analytics?period=${period}`);
  }

  async getOrdersByStatus(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<ApiResponse<Array<{
    date: string;
    pending: number;
    processing: number;
    completed: number;
    cancelled: number;
  }>>> {
    return this.get(`/analytics/status?period=${period}`);
  }

  // Customer order history
  async getCustomerOrders(customerId: string, page = 1, limit = 20): Promise<PaginatedResponse<Order>> {
    return this.get(`/customer/${customerId}?page=${page}&limit=${limit}`);
  }

  // Product order history
  async getProductOrders(productId: string, page = 1, limit = 20): Promise<PaginatedResponse<Order>> {
    return this.get(`/product/${productId}?page=${page}&limit=${limit}`);
  }

  // Fraud detection
  async flagOrderForReview(id: string, reason: string): Promise<ApiResponse<Order>> {
    return this.patch({ 
      flagged: true, 
      flagReason: reason,
      flaggedAt: new Date().toISOString()
    }, `/${id}/flag`);
  }

  async unflagOrder(id: string, notes?: string): Promise<ApiResponse<Order>> {
    return this.patch({ 
      flagged: false, 
      flagReason: null,
      unflaggedAt: new Date().toISOString(),
      unflagNotes: notes
    }, `/${id}/unflag`);
  }

  async getFlaggedOrders(): Promise<ApiResponse<Array<Order & {
    flagReason: string;
    flaggedAt: string;
  }>>> {
    return this.get('/flagged');
  }

  // Order notes
  async addOrderNote(id: string, note: string, isInternal = true): Promise<ApiResponse<{
    id: string;
    note: string;
    isInternal: boolean;
    createdBy: string;
    createdAt: string;
  }>> {
    return this.post({ note, isInternal }, `/${id}/notes`);
  }

  async getOrderNotes(id: string): Promise<ApiResponse<Array<{
    id: string;
    note: string;
    isInternal: boolean;
    createdBy: string;
    createdByName: string;
    createdAt: string;
  }>>> {
    return this.get(`/${id}/notes`);
  }

  // Order timeline
  async getOrderTimeline(id: string): Promise<ApiResponse<Array<{
    id: string;
    event: string;
    description: string;
    data?: any;
    createdBy?: string;
    createdByName?: string;
    createdAt: string;
  }>>> {
    return this.get(`/${id}/timeline`);
  }
}

export const orderService = new OrderService();
export default orderService;
