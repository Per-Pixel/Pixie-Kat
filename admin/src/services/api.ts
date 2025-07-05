import axios, { AxiosError, AxiosResponse, AxiosRequestConfig } from 'axios';
import { ApiResponse, PaginatedResponse } from '@/types/api';

// API Configuration
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 15000,
  retryAttempts: 3,
  retryDelay: 1000,
};

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and request metadata
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request ID for tracking
    config.headers['X-Request-ID'] = generateRequestId();
    
    // Add timestamp
    config.headers['X-Request-Time'] = new Date().toISOString();
    
    // Add user agent info
    config.headers['X-Client-Version'] = import.meta.env.VITE_APP_VERSION || '1.0.0';
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean; _retryCount?: number };

    // Log errors in development
    if (import.meta.env.DEV) {
      console.error(`❌ ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, error.response?.data || error.message);
    }

    // Handle 401 Unauthorized - Token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('admin_refresh_token');
        if (refreshToken) {
          const response = await api.post('/auth/refresh', { refreshToken });
          const { token } = response.data;
          localStorage.setItem('admin_token', token);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle network errors with retry logic
    if (!error.response && originalRequest && !originalRequest._retryCount) {
      originalRequest._retryCount = 0;
    }

    if (!error.response && originalRequest && originalRequest._retryCount! < API_CONFIG.retryAttempts) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      
      // Exponential backoff
      const delay = API_CONFIG.retryDelay * Math.pow(2, originalRequest._retryCount - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

// Utility function to generate request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generic API service class
export class BaseApiService {
  protected endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  // Generic GET request
  async get<T>(path: string = '', config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await api.get(`${this.endpoint}${path}`, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Generic POST request
  async post<T>(data: any, path: string = '', config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await api.post(`${this.endpoint}${path}`, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Generic PUT request
  async put<T>(data: any, path: string = '', config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await api.put(`${this.endpoint}${path}`, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Generic PATCH request
  async patch<T>(data: any, path: string = '', config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await api.patch(`${this.endpoint}${path}`, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Generic DELETE request
  async delete<T>(path: string = '', config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await api.delete(`${this.endpoint}${path}`, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get paginated data
  async getPaginated<T>(params?: Record<string, any>): Promise<PaginatedResponse<T>> {
    try {
      const response = await api.get(this.endpoint, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get by ID
  async getById<T>(id: string): Promise<ApiResponse<T>> {
    try {
      const response = await api.get(`${this.endpoint}/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Create new resource
  async create<T>(data: Partial<T>): Promise<ApiResponse<T>> {
    try {
      const response = await api.post(this.endpoint, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Update resource
  async update<T>(id: string, data: Partial<T>): Promise<ApiResponse<T>> {
    try {
      const response = await api.put(`${this.endpoint}/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Delete resource
  async deleteById(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await api.delete(`${this.endpoint}/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Bulk operations
  async bulkCreate<T>(data: Partial<T>[]): Promise<ApiResponse<T[]>> {
    try {
      const response = await api.post(`${this.endpoint}/bulk`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async bulkUpdate<T>(updates: Array<{ id: string; data: Partial<T> }>): Promise<ApiResponse<T[]>> {
    try {
      const response = await api.patch(`${this.endpoint}/bulk`, updates);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async bulkDelete(ids: string[]): Promise<ApiResponse<void>> {
    try {
      const response = await api.delete(`${this.endpoint}/bulk`, { data: { ids } });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error handling
  protected handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      const status = error.response?.status;
      
      // Create custom error with additional context
      const customError = new Error(message) as any;
      customError.status = status;
      customError.code = error.response?.data?.code;
      customError.details = error.response?.data?.details;
      
      return customError;
    }
    
    return error instanceof Error ? error : new Error('Unknown error occurred');
  }
}

export default api;
