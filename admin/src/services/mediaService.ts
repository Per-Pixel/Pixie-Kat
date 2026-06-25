import api from './api';
import type {
  MediaAsset,
  MediaListResponse,
  MediaUploadRequest,
} from '../types/cms';

interface MediaFilters {
  folder?: string;
  mimeType?: string;
  search?: string;
  tags?: string[];
  uploadedBy?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface MediaSortOptions {
  field: 'filename' | 'uploadedAt' | 'size';
  order: 'asc' | 'desc';
}

class MediaService {
  private baseUrl = '/api/admin/media';

  async getMedia(
    filters?: MediaFilters,
    sort?: MediaSortOptions,
    page = 1,
    pageSize = 50
  ): Promise<MediaListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    if (filters?.folder) {
      params.append('folder', filters.folder);
    }
    if (filters?.mimeType) {
      params.append('mimeType', filters.mimeType);
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.tags && filters.tags.length > 0) {
      params.append('tags', filters.tags.join(','));
    }
    if (filters?.uploadedBy) {
      params.append('uploadedBy', filters.uploadedBy);
    }
    if (filters?.dateFrom) {
      params.append('dateFrom', filters.dateFrom);
    }
    if (filters?.dateTo) {
      params.append('dateTo', filters.dateTo);
    }
    if (sort) {
      params.append('sortField', sort.field);
      params.append('sortOrder', sort.order);
    }

    const response = await api.get<MediaListResponse>(`${this.baseUrl}?${params}`);
    return response.data;
  }

  async getMediaById(id: string): Promise<MediaAsset> {
    const response = await api.get<MediaAsset>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async uploadMedia(data: MediaUploadRequest): Promise<MediaAsset> {
    const formData = new FormData();
    formData.append('file', data.file);
    
    if (data.folder) {
      formData.append('folder', data.folder);
    }
    if (data.alt) {
      formData.append('alt', data.alt);
    }
    if (data.tags && data.tags.length > 0) {
      formData.append('tags', JSON.stringify(data.tags));
    }

    const response = await api.post<MediaAsset>(this.baseUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async uploadMultiple(files: File[], folder?: string): Promise<MediaAsset[]> {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    if (folder) {
      formData.append('folder', folder);
    }

    const response = await api.post<MediaAsset[]>(
      `${this.baseUrl}/bulk`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  async updateMedia(
    id: string,
    data: Partial<Pick<MediaAsset, 'alt' | 'caption' | 'tags' | 'folder'>>
  ): Promise<MediaAsset> {
    const response = await api.patch<MediaAsset>(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  async deleteMedia(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  async bulkDelete(ids: string[]): Promise<void> {
    await api.post(`${this.baseUrl}/bulk/delete`, { ids });
  }

  async optimizeImage(id: string): Promise<MediaAsset> {
    const response = await api.post<MediaAsset>(
      `${this.baseUrl}/${id}/optimize`
    );
    return response.data;
  }

  async generateResponsiveVersions(id: string): Promise<MediaAsset> {
    const response = await api.post<MediaAsset>(
      `${this.baseUrl}/${id}/responsive`
    );
    return response.data;
  }

  async cropImage(
    id: string,
    crop: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ): Promise<MediaAsset> {
    const response = await api.post<MediaAsset>(`${this.baseUrl}/${id}/crop`, {
      crop,
    });
    return response.data;
  }

  async resizeImage(
    id: string,
    dimensions: {
      width?: number;
      height?: number;
      maintainAspectRatio?: boolean;
    }
  ): Promise<MediaAsset> {
    const response = await api.post<MediaAsset>(
      `${this.baseUrl}/${id}/resize`,
      dimensions
    );
    return response.data;
  }

  async getFolders(): Promise<string[]> {
    const response = await api.get<{ folders: string[] }>(
      `${this.baseUrl}/folders`
    );
    return response.data.folders;
  }

  async createFolder(name: string, parent?: string): Promise<void> {
    await api.post(`${this.baseUrl}/folders`, { name, parent });
  }

  async deleteFolder(name: string): Promise<void> {
    await api.delete(`${this.baseUrl}/folders/${encodeURIComponent(name)}`);
  }

  async moveToFolder(ids: string[], folder: string): Promise<void> {
    await api.post(`${this.baseUrl}/bulk/move`, { ids, folder });
  }

  async getStorageStats(): Promise<{
    totalSize: number;
    totalFiles: number;
    byMimeType: Record<string, { count: number; size: number }>;
  }> {
    const response = await api.get(`${this.baseUrl}/stats`);
    return response.data;
  }
}

export default new MediaService();
