import { BaseApiService } from './api';
import { Game, Product } from '../types';
import { ApiResponse, PaginatedResponse } from '@/types/api';

export interface GameFilters {
  search?: string;
  category?: string;
  status?: 'active' | 'inactive';
  hasProducts?: boolean;
  sortBy?: 'name' | 'category' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface GameStats {
  totalGames: number;
  activeGames: number;
  totalProducts: number;
  totalRevenue: number;
  topGames: Array<{
    id: string;
    name: string;
    revenue: number;
    orders: number;
    products: number;
  }>;
  categoryStats: Array<{
    category: string;
    count: number;
    revenue: number;
  }>;
}

export interface GameWithProducts extends Game {
  products: Product[];
  stats: {
    totalProducts: number;
    activeProducts: number;
    totalRevenue: number;
    totalOrders: number;
  };
}

class GameService extends BaseApiService {
  constructor() {
    super('/games');
  }

  // Get games with filters and pagination
  async getGames(filters?: GameFilters): Promise<PaginatedResponse<Game>> {
    return this.getPaginated<Game>(filters);
  }

  // Get game by ID with products and stats
  async getGameById(id: string): Promise<ApiResponse<GameWithProducts>> {
    return this.getById(`${id}?include=products,stats`);
  }

  // Create new game
  async createGame(gameData: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Game>> {
    return this.create(gameData);
  }

  // Update game
  async updateGame(id: string, gameData: Partial<Game>): Promise<ApiResponse<Game>> {
    return this.update(id, gameData);
  }

  // Delete game
  async deleteGame(id: string): Promise<ApiResponse<void>> {
    return this.deleteById(id);
  }

  // Bulk operations
  async bulkUpdateGames(updates: Array<{ id: string; data: Partial<Game> }>): Promise<ApiResponse<Game[]>> {
    return this.bulkUpdate(updates);
  }

  async bulkDeleteGames(ids: string[]): Promise<ApiResponse<void>> {
    return this.bulkDelete(ids);
  }

  // Game status management
  async activateGame(id: string): Promise<ApiResponse<Game>> {
    return this.patch({ isActive: true }, `/${id}/status`);
  }

  async deactivateGame(id: string): Promise<ApiResponse<Game>> {
    return this.patch({ isActive: false }, `/${id}/status`);
  }

  // Upload game image
  async uploadGameImage(id: string, file: File): Promise<ApiResponse<{ imageUrl: string }>> {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await this.post(formData, `/${id}/image`, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get game categories
  async getCategories(): Promise<ApiResponse<Array<{
    name: string;
    count: number;
    description?: string;
  }>>> {
    return this.get('/categories');
  }

  // Create new category
  async createCategory(category: {
    name: string;
    description?: string;
  }): Promise<ApiResponse<{ name: string; description?: string }>> {
    return this.post(category, '/categories');
  }

  // Update category
  async updateCategory(name: string, data: {
    newName?: string;
    description?: string;
  }): Promise<ApiResponse<{ name: string; description?: string }>> {
    return this.put(data, `/categories/${encodeURIComponent(name)}`);
  }

  // Delete category
  async deleteCategory(name: string): Promise<ApiResponse<void>> {
    return this.delete(`/categories/${encodeURIComponent(name)}`);
  }

  // Get game statistics
  async getGameStats(): Promise<ApiResponse<GameStats>> {
    return this.get('/stats');
  }

  // Search games
  async searchGames(query: string, filters?: Partial<GameFilters>): Promise<ApiResponse<Game[]>> {
    return this.get('/search', {
      params: { q: query, ...filters }
    });
  }

  // Get popular games
  async getPopularGames(limit = 10): Promise<ApiResponse<Array<Game & {
    revenue: number;
    orders: number;
    products: number;
  }>>> {
    return this.get(`/popular?limit=${limit}`);
  }

  // Get game products
  async getGameProducts(gameId: string, filters?: {
    search?: string;
    status?: 'active' | 'inactive';
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sortBy?: 'name' | 'price' | 'stock' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Product>> {
    return this.get(`/${gameId}/products`, { params: filters });
  }

  // Add product to game
  async addProductToGame(gameId: string, productData: Omit<Product, 'id' | 'gameId' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Product>> {
    return this.post(productData, `/${gameId}/products`);
  }

  // Clone game with all products
  async cloneGame(id: string, newName: string): Promise<ApiResponse<Game>> {
    return this.post({ name: newName }, `/${id}/clone`);
  }

  // Export games
  async exportGames(filters?: GameFilters, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
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

  // Import games
  async importGames(file: File): Promise<ApiResponse<{
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

  // Get game revenue analytics
  async getGameRevenue(gameId: string, period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<ApiResponse<Array<{
    date: string;
    revenue: number;
    orders: number;
  }>>> {
    return this.get(`/${gameId}/revenue?period=${period}`);
  }

  // Get game performance metrics
  async getGameMetrics(gameId: string): Promise<ApiResponse<{
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    conversionRate: number;
    topProducts: Array<{
      id: string;
      name: string;
      revenue: number;
      orders: number;
    }>;
    recentOrders: Array<{
      id: string;
      customerName: string;
      productName: string;
      amount: number;
      createdAt: string;
    }>;
  }>> {
    return this.get(`/${gameId}/metrics`);
  }
}

export const gameService = new GameService();
export default gameService;
