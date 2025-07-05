import React from 'react';

export * from './auth';
export * from './api';

export interface Game {
  id: string;
  name: string;
  description: string;
  category: string;
  image: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  gameId: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  stock: number;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentId?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  totalOrders: number;
  totalSpent: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Reseller {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  commissionRate: number;
  totalSales: number;
  totalCommission: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  customerId?: string;
  subject: string;
  content: string;
  status: MessageStatus;
  priority: MessagePriority;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export enum MessageStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum MessagePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface Analytics {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  revenueGrowth: number;
  orderGrowth: number;
  customerGrowth: number;
  topProducts: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  recentOrders: Order[];
}



export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
}
