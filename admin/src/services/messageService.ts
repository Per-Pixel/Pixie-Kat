import { BaseApiService } from './api';
import { Message, MessageStatus, MessagePriority } from '../types';
import { ApiResponse, PaginatedResponse } from '@/types/api';

export interface MessageFilters {
  search?: string;
  status?: MessageStatus;
  priority?: MessagePriority;
  assignedTo?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface MessageStats {
  totalMessages: number;
  openMessages: number;
  inProgressMessages: number;
  resolvedMessages: number;
  averageResponseTime: number; // in minutes
  averageResolutionTime: number; // in minutes
  messagesByPriority: Record<MessagePriority, number>;
  messagesByStatus: Record<MessageStatus, number>;
}

export interface MessageWithDetails extends Message {
  customer?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  assignedUser?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  replies: MessageReply[];
  attachments: MessageAttachment[];
  tags: string[];
}

export interface MessageReply {
  id: string;
  messageId: string;
  content: string;
  isFromCustomer: boolean;
  authorId: string;
  authorName: string;
  attachments: MessageAttachment[];
  createdAt: string;
}

export interface MessageAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'email' | 'sms' | 'push';
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

class MessageService extends BaseApiService {
  constructor() {
    super('/messages');
  }

  // Get messages with filters and pagination
  async getMessages(filters?: MessageFilters): Promise<PaginatedResponse<Message>> {
    return this.getPaginated<Message>(filters);
  }

  // Get message by ID with details
  async getMessageById(id: string): Promise<ApiResponse<MessageWithDetails>> {
    return this.getById(`${id}?include=customer,assignedUser,replies,attachments,tags`);
  }

  // Create new message
  async createMessage(messageData: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Message>> {
    return this.create(messageData);
  }

  // Update message
  async updateMessage(id: string, messageData: Partial<Message>): Promise<ApiResponse<Message>> {
    return this.update(id, messageData);
  }

  // Delete message
  async deleteMessage(id: string): Promise<ApiResponse<void>> {
    return this.deleteById(id);
  }

  // Bulk operations
  async bulkUpdateMessages(updates: Array<{ id: string; data: Partial<Message> }>): Promise<ApiResponse<Message[]>> {
    return this.bulkUpdate(updates);
  }

  async bulkDeleteMessages(ids: string[]): Promise<ApiResponse<void>> {
    return this.bulkDelete(ids);
  }

  // Message status management
  async updateStatus(id: string, status: MessageStatus): Promise<ApiResponse<Message>> {
    return this.patch({ status }, `/${id}/status`);
  }

  async assignMessage(id: string, assignedTo: string): Promise<ApiResponse<Message>> {
    return this.patch({ assignedTo }, `/${id}/assign`);
  }

  async unassignMessage(id: string): Promise<ApiResponse<Message>> {
    return this.patch({ assignedTo: null }, `/${id}/unassign`);
  }

  async setPriority(id: string, priority: MessagePriority): Promise<ApiResponse<Message>> {
    return this.patch({ priority }, `/${id}/priority`);
  }

  // Message replies
  async addReply(messageId: string, content: string, attachments?: File[]): Promise<ApiResponse<MessageReply>> {
    const formData = new FormData();
    formData.append('content', content);
    
    if (attachments) {
      attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });
    }

    try {
      const response = await this.post(formData, `/${messageId}/replies`, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateReply(messageId: string, replyId: string, content: string): Promise<ApiResponse<MessageReply>> {
    return this.patch({ content }, `/${messageId}/replies/${replyId}`);
  }

  async deleteReply(messageId: string, replyId: string): Promise<ApiResponse<void>> {
    return this.delete(`/${messageId}/replies/${replyId}`);
  }

  // Message tags
  async addTags(messageId: string, tags: string[]): Promise<ApiResponse<Message>> {
    return this.post({ tags }, `/${messageId}/tags`);
  }

  async removeTags(messageId: string, tags: string[]): Promise<ApiResponse<Message>> {
    return this.delete(`/${messageId}/tags`, { data: { tags } });
  }

  async getAllTags(): Promise<ApiResponse<Array<{ name: string; count: number }>>> {
    return this.get('/tags');
  }

  // Message statistics
  async getMessageStats(): Promise<ApiResponse<MessageStats>> {
    return this.get('/stats');
  }

  // Search messages
  async searchMessages(query: string, filters?: Partial<MessageFilters>): Promise<ApiResponse<Message[]>> {
    return this.get('/search', {
      params: { q: query, ...filters }
    });
  }

  // Export messages
  async exportMessages(filters?: MessageFilters, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
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

  // Notification templates
  async getNotificationTemplates(): Promise<ApiResponse<NotificationTemplate[]>> {
    return this.get('/templates');
  }

  async createNotificationTemplate(template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<NotificationTemplate>> {
    return this.post(template, '/templates');
  }

  async updateNotificationTemplate(id: string, template: Partial<NotificationTemplate>): Promise<ApiResponse<NotificationTemplate>> {
    return this.put(template, `/templates/${id}`);
  }

  async deleteNotificationTemplate(id: string): Promise<ApiResponse<void>> {
    return this.delete(`/templates/${id}`);
  }

  // Send notifications
  async sendNotification(data: {
    recipients: string[]; // user IDs or email addresses
    templateId?: string;
    subject?: string;
    content?: string;
    type: 'email' | 'sms' | 'push';
    variables?: Record<string, string>;
    scheduleAt?: string; // ISO date string
  }): Promise<ApiResponse<{
    sent: number;
    failed: number;
    scheduled: number;
    errors: Array<{ recipient: string; error: string }>;
  }>> {
    return this.post(data, '/notifications');
  }

  // Get notification history
  async getNotificationHistory(page = 1, limit = 20): Promise<PaginatedResponse<{
    id: string;
    type: 'email' | 'sms' | 'push';
    recipient: string;
    subject: string;
    status: 'sent' | 'failed' | 'scheduled' | 'delivered';
    error?: string;
    sentAt?: string;
    deliveredAt?: string;
    createdAt: string;
  }>> {
    return this.get(`/notifications/history?page=${page}&limit=${limit}`);
  }

  // Auto-responses
  async getAutoResponses(): Promise<ApiResponse<Array<{
    id: string;
    trigger: string;
    condition: string;
    response: string;
    isActive: boolean;
    priority: number;
  }>>> {
    return this.get('/auto-responses');
  }

  async createAutoResponse(data: {
    trigger: string;
    condition: string;
    response: string;
    priority?: number;
  }): Promise<ApiResponse<any>> {
    return this.post(data, '/auto-responses');
  }

  // Message analytics
  async getResponseTimeAnalytics(period: 'day' | 'week' | 'month' = 'month'): Promise<ApiResponse<Array<{
    date: string;
    averageResponseTime: number;
    messageCount: number;
  }>>> {
    return this.get(`/analytics/response-time?period=${period}`);
  }

  async getResolutionAnalytics(period: 'day' | 'week' | 'month' = 'month'): Promise<ApiResponse<Array<{
    date: string;
    averageResolutionTime: number;
    resolvedCount: number;
  }>>> {
    return this.get(`/analytics/resolution?period=${period}`);
  }
}

export const messageService = new MessageService();
export default messageService;
