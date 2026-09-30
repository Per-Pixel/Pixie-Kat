// API Response Types
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface BulkOperationResult<T> {
  success: T[];
  failed: Array<{
    item: T;
    error: string;
  }>;
  total: number;
  successCount: number;
  failedCount: number;
}

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  fields?: string[];
  filters?: Record<string, unknown>;
}

export interface ImportResult {
  imported: number;
  failed: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}

// HTTP Status Codes
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type HttpStatus = typeof HttpStatus[keyof typeof HttpStatus];

// API Request Types
export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

export interface CreateRequest<T> {
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
}

export interface UpdateRequest<T> {
  data: Partial<T>;
}

export interface BulkUpdateRequest<T> {
  updates: Array<{
    id: string;
    data: Partial<T>;
  }>;
}

export interface BulkDeleteRequest {
  ids: string[];
}
