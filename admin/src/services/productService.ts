import { BaseApiService } from './api';
import { Product } from '../types';
import { ApiResponse, PaginatedResponse } from '@/types/api';

export interface ProductFilters {
  search?: string;
  gameId?: string;
  status?: 'active' | 'inactive';
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  sortBy?: 'name' | 'price' | 'stock' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  outOfStockProducts: number;
  totalRevenue: number;
  averagePrice: number;
  topProducts: Array<{
    id: string;
    name: string;
    gameName: string;
    revenue: number;
    orders: number;
    stock: number;
  }>;
}

export interface ProductWithDetails extends Product {
  game: {
    id: string;
    name: string;
    category: string;
  };
  stats: {
    totalOrders: number;
    totalRevenue: number;
    averageRating?: number;
    reviewCount?: number;
  };
  inventory: {
    reserved: number;
    available: number;
    lowStockThreshold: number;
  };
}

export interface StockAlert {
  id: string;
  productId: string;
  productName: string;
  gameName: string;
  currentStock: number;
  threshold: number;
  severity: 'low' | 'critical' | 'out_of_stock';
  createdAt: string;
}

class ProductService extends BaseApiService {
  constructor() {
    super('/products');
  }

  // Get products with filters and pagination
  async getProducts(filters?: ProductFilters): Promise<PaginatedResponse<Product>> {
    return this.getPaginated<Product>(filters);
  }

  // Get product by ID with detailed information
  async getProductById(id: string): Promise<ApiResponse<ProductWithDetails>> {
    return this.getById(`${id}?include=game,stats,inventory`);
  }

  // Create new product
  async createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Product>> {
    return this.create(productData);
  }

  // Update product
  async updateProduct(id: string, productData: Partial<Product>): Promise<ApiResponse<Product>> {
    return this.update(id, productData);
  }

  // Delete product
  async deleteProduct(id: string): Promise<ApiResponse<void>> {
    return this.deleteById(id);
  }

  // Bulk operations
  async bulkUpdateProducts(updates: Array<{ id: string; data: Partial<Product> }>): Promise<ApiResponse<Product[]>> {
    return this.bulkUpdate(updates);
  }

  async bulkDeleteProducts(ids: string[]): Promise<ApiResponse<void>> {
    return this.bulkDelete(ids);
  }

  // Product status management
  async activateProduct(id: string): Promise<ApiResponse<Product>> {
    return this.patch({ isActive: true }, `/${id}/status`);
  }

  async deactivateProduct(id: string): Promise<ApiResponse<Product>> {
    return this.patch({ isActive: false }, `/${id}/status`);
  }

  // Stock management
  async updateStock(id: string, quantity: number, operation: 'set' | 'add' | 'subtract' = 'set'): Promise<ApiResponse<Product>> {
    return this.patch({ quantity, operation }, `/${id}/stock`);
  }

  async bulkUpdateStock(updates: Array<{
    id: string;
    quantity: number;
    operation?: 'set' | 'add' | 'subtract';
  }>): Promise<ApiResponse<Product[]>> {
    return this.patch(updates, '/stock/bulk');
  }

  // Get stock alerts
  async getStockAlerts(severity?: 'low' | 'critical' | 'out_of_stock'): Promise<ApiResponse<StockAlert[]>> {
    return this.get('/stock/alerts', { params: { severity } });
  }

  // Set stock alert threshold
  async setStockThreshold(id: string, threshold: number): Promise<ApiResponse<Product>> {
    return this.patch({ lowStockThreshold: threshold }, `/${id}/threshold`);
  }

  // Price management
  async updatePrice(id: string, price: number, originalPrice?: number): Promise<ApiResponse<Product>> {
    return this.patch({ price, originalPrice }, `/${id}/price`);
  }

  async bulkUpdatePrices(updates: Array<{
    id: string;
    price: number;
    originalPrice?: number;
  }>): Promise<ApiResponse<Product[]>> {
    return this.patch(updates, '/price/bulk');
  }

  // Get product statistics
  async getProductStats(): Promise<ApiResponse<ProductStats>> {
    return this.get('/stats');
  }

  // Search products
  async searchProducts(query: string, filters?: Partial<ProductFilters>): Promise<ApiResponse<Product[]>> {
    return this.get('/search', {
      params: { q: query, ...filters }
    });
  }

  // Get popular products
  async getPopularProducts(limit = 10, period: 'day' | 'week' | 'month' = 'month'): Promise<ApiResponse<Array<Product & {
    revenue: number;
    orders: number;
    growth: number;
  }>>> {
    return this.get(`/popular?limit=${limit}&period=${period}`);
  }

  // Clone product
  async cloneProduct(id: string, newName: string, gameId?: string): Promise<ApiResponse<Product>> {
    return this.post({ name: newName, gameId }, `/${id}/clone`);
  }

  // Export products
  async exportProducts(filters?: ProductFilters, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
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

  // Import products
  async importProducts(file: File): Promise<ApiResponse<{
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

  // Get product revenue analytics
  async getProductRevenue(productId: string, period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<ApiResponse<Array<{
    date: string;
    revenue: number;
    orders: number;
    quantity: number;
  }>>> {
    return this.get(`/${productId}/revenue?period=${period}`);
  }

  // Get product performance metrics
  async getProductMetrics(productId: string): Promise<ApiResponse<{
    totalRevenue: number;
    totalOrders: number;
    totalQuantitySold: number;
    averageOrderValue: number;
    conversionRate: number;
    stockTurnover: number;
    recentOrders: Array<{
      id: string;
      customerName: string;
      quantity: number;
      amount: number;
      createdAt: string;
    }>;
  }>> {
    return this.get(`/${productId}/metrics`);
  }

  // Inventory management
  async getInventoryReport(gameId?: string): Promise<ApiResponse<Array<{
    productId: string;
    productName: string;
    gameName: string;
    currentStock: number;
    reserved: number;
    available: number;
    lowStockThreshold: number;
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
    lastRestocked?: string;
  }>>> {
    return this.get('/inventory/report', { params: { gameId } });
  }

  async restockProduct(id: string, quantity: number, cost?: number, supplier?: string): Promise<ApiResponse<{
    product: Product;
    restockRecord: {
      id: string;
      quantity: number;
      cost?: number;
      supplier?: string;
      createdAt: string;
    };
  }>> {
    return this.post({ quantity, cost, supplier }, `/${id}/restock`);
  }

  // Get restock history
  async getRestockHistory(productId: string, page = 1, limit = 20): Promise<PaginatedResponse<{
    id: string;
    quantity: number;
    cost?: number;
    supplier?: string;
    createdBy: string;
    createdAt: string;
  }>> {
    return this.get(`/${productId}/restock/history?page=${page}&limit=${limit}`);
  }
}

export const productService = new ProductService();
export default productService;
