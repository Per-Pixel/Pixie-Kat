export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  timezone?: string;
  language?: string;
  isActive: boolean;
  totalOrders?: number;
  totalSpent?: number;
  lastActiveAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  ADMIN = 'admin',
  RESELLER = 'reseller',
  SUPPORT = 'support',
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastActivity?: Date | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface Permission {
  resource: string;
  actions: string[];
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'products', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'orders', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'games', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'resellers', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'analytics', actions: ['read'] },
    { resource: 'settings', actions: ['read', 'update'] },
    { resource: 'messages', actions: ['create', 'read', 'update', 'delete'] },
  ],
  [UserRole.RESELLER]: [
    { resource: 'products', actions: ['read'] },
    { resource: 'orders', actions: ['create', 'read'] },
    { resource: 'games', actions: ['read'] },
    { resource: 'analytics', actions: ['read'] },
    { resource: 'messages', actions: ['create', 'read'] },
  ],
  [UserRole.SUPPORT]: [
    { resource: 'users', actions: ['read', 'update'] },
    { resource: 'orders', actions: ['read', 'update'] },
    { resource: 'messages', actions: ['create', 'read', 'update'] },
  ],
};
