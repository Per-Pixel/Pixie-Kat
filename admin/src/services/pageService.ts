import api from './api';
import { PageStatus } from '../types/cms';
import type {
  Page,
  PageListResponse,
  CreatePageRequest,
  UpdatePageRequest,
  PageFilters,
  PageSortOptions,
  TrashListResponse,
} from '../types/cms';

class PageService {
  private baseUrl = '/api/admin/pages';

  async getPages(
    filters?: PageFilters,
    sort?: PageSortOptions,
    page = 1,
    pageSize = 20
  ): Promise<PageListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    if (filters?.status && filters.status.length > 0) {
      params.append('status', filters.status.join(','));
    }
    if (filters?.author) {
      params.append('author', filters.author);
    }
    if (filters?.search) {
      params.append('search', filters.search);
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

    const response = await api.get<PageListResponse>(`${this.baseUrl}?${params}`);
    return response.data;
  }

  async getPageById(id: string): Promise<Page> {
    const response = await api.get<Page>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async getPageBySlug(slug: string): Promise<Page> {
    const response = await api.get<Page>(`${this.baseUrl}/slug/${slug}`);
    return response.data;
  }

  async createPage(data: CreatePageRequest): Promise<Page> {
    const response = await api.post<Page>(this.baseUrl, data);
    return response.data;
  }

  async updatePage(id: string, data: UpdatePageRequest): Promise<Page> {
    const response = await api.put<Page>(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  async deletePage(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  async restorePage(id: string): Promise<Page> {
    const response = await api.post<Page>(`${this.baseUrl}/${id}/restore`);
    return response.data;
  }

  async permanentlyDeletePage(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}/permanent`);
  }

  async duplicatePage(id: string, newTitle?: string): Promise<Page> {
    const response = await api.post<Page>(`${this.baseUrl}/${id}/duplicate`, {
      title: newTitle,
    });
    return response.data;
  }

  async updatePageStatus(id: string, status: PageStatus): Promise<Page> {
    const response = await api.patch<Page>(`${this.baseUrl}/${id}/status`, {
      status,
    });
    return response.data;
  }

  async publishPage(id: string): Promise<Page> {
    return this.updatePageStatus(id, PageStatus.PUBLISHED);
  }

  async hidePage(id: string): Promise<Page> {
    return this.updatePageStatus(id, PageStatus.HIDDEN);
  }

  async unpublishPage(id: string): Promise<Page> {
    return this.updatePageStatus(id, PageStatus.DRAFT);
  }

  async getTrash(page = 1, pageSize = 20): Promise<TrashListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    const response = await api.get<TrashListResponse>(
      `${this.baseUrl}/trash?${params}`
    );
    return response.data;
  }

  async emptyTrash(): Promise<void> {
    await api.post(`${this.baseUrl}/trash/empty`);
  }

  async restoreAllFromTrash(): Promise<void> {
    await api.post(`${this.baseUrl}/trash/restore-all`);
  }

  async bulkDelete(ids: string[]): Promise<void> {
    await api.post(`${this.baseUrl}/bulk/delete`, { ids });
  }

  async bulkUpdateStatus(ids: string[], status: PageStatus): Promise<void> {
    await api.post(`${this.baseUrl}/bulk/status`, { ids, status });
  }

  async bulkRestore(ids: string[]): Promise<void> {
    await api.post(`${this.baseUrl}/bulk/restore`, { ids });
  }

  async getPageHistory(id: string): Promise<Page[]> {
    const response = await api.get<Page[]>(`${this.baseUrl}/${id}/history`);
    return response.data;
  }

  async revertToVersion(id: string, version: number): Promise<Page> {
    const response = await api.post<Page>(`${this.baseUrl}/${id}/revert`, {
      version,
    });
    return response.data;
  }

  async validateSlug(slug: string, excludeId?: string): Promise<boolean> {
    const params = new URLSearchParams({ slug });
    if (excludeId) {
      params.append('excludeId', excludeId);
    }

    const response = await api.get<{ available: boolean }>(
      `${this.baseUrl}/validate-slug?${params}`
    );
    return response.data.available;
  }
}

export default new PageService();
