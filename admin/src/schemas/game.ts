import { z } from 'zod';

// Game validation schema
export const gameSchema = z.object({
  name: z
    .string()
    .min(1, 'Game name is required')
    .min(2, 'Game name must be at least 2 characters')
    .max(100, 'Game name must be less than 100 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be less than 1000 characters'),
  category: z
    .string()
    .min(1, 'Category is required')
    .max(50, 'Category must be less than 50 characters'),
  imageUrl: z
    .string()
    .url('Please enter a valid image URL')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean().default(true),
  sortOrder: z
    .number()
    .int('Sort order must be an integer')
    .min(0, 'Sort order must be non-negative')
    .optional(),
  metadata: z
    .record(z.any())
    .optional(),
});

// Game update schema (all fields optional except validation rules)
export const updateGameSchema = gameSchema.partial();

// Game category schema
export const gameCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .min(2, 'Category name must be at least 2 characters')
    .max(50, 'Category name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Category name can only contain letters, numbers, spaces, hyphens, and underscores'),
  description: z
    .string()
    .max(200, 'Description must be less than 200 characters')
    .optional(),
});

// Game search filters schema
export const gameFiltersSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  hasProducts: z.boolean().optional(),
  sortBy: z.enum(['name', 'category', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// Game bulk operations schema
export const bulkGameOperationSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'delete', 'update_category']),
  gameIds: z
    .array(z.string().uuid('Invalid game ID'))
    .min(1, 'At least one game must be selected')
    .max(100, 'Cannot process more than 100 games at once'),
  data: z.record(z.any()).optional(),
});

// Game import schema
export const gameImportSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isActive: z
    .union([z.boolean(), z.string()])
    .transform((val) => {
      if (typeof val === 'string') {
        return val.toLowerCase() === 'true' || val === '1';
      }
      return val;
    })
    .optional(),
  sortOrder: z
    .union([z.number(), z.string()])
    .transform((val) => {
      if (typeof val === 'string') {
        const num = parseInt(val, 10);
        return isNaN(num) ? undefined : num;
      }
      return val;
    })
    .optional(),
});

// Game clone schema
export const gameCloneSchema = z.object({
  name: z
    .string()
    .min(1, 'New game name is required')
    .min(2, 'Game name must be at least 2 characters')
    .max(100, 'Game name must be less than 100 characters'),
  includeProducts: z.boolean().default(true),
  copyImages: z.boolean().default(false),
});

// Game image upload schema
export const gameImageUploadSchema = z.object({
  file: z
    .instanceof(File, { message: 'Please select a valid image file' })
    .refine((file) => file.size <= 5 * 1024 * 1024, 'Image must be less than 5MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type),
      'Only JPEG, PNG, WebP, and GIF images are allowed'
    ),
  alt: z
    .string()
    .max(200, 'Alt text must be less than 200 characters')
    .optional(),
});

// Export type definitions
export type GameFormData = z.infer<typeof gameSchema>;
export type UpdateGameFormData = z.infer<typeof updateGameSchema>;
export type GameCategoryFormData = z.infer<typeof gameCategorySchema>;
export type GameFiltersData = z.infer<typeof gameFiltersSchema>;
export type BulkGameOperationData = z.infer<typeof bulkGameOperationSchema>;
export type GameImportData = z.infer<typeof gameImportSchema>;
export type GameCloneData = z.infer<typeof gameCloneSchema>;
export type GameImageUploadData = z.infer<typeof gameImageUploadSchema>;

// Validation helper functions
export const validateGame = (data: unknown) => gameSchema.safeParse(data);
export const validateUpdateGame = (data: unknown) => updateGameSchema.safeParse(data);
export const validateGameCategory = (data: unknown) => gameCategorySchema.safeParse(data);
export const validateGameFilters = (data: unknown) => gameFiltersSchema.safeParse(data);
export const validateBulkGameOperation = (data: unknown) => bulkGameOperationSchema.safeParse(data);
export const validateGameImport = (data: unknown) => gameImportSchema.safeParse(data);
export const validateGameClone = (data: unknown) => gameCloneSchema.safeParse(data);
export const validateGameImageUpload = (data: unknown) => gameImageUploadSchema.safeParse(data);

// Game name validation helper
export const isValidGameName = (name: string): boolean => {
  return gameSchema.shape.name.safeParse(name).success;
};

// Category name validation helper
export const isValidCategoryName = (name: string): boolean => {
  return gameCategorySchema.shape.name.safeParse(name).success;
};

// Image URL validation helper
export const isValidImageUrl = (url: string): boolean => {
  if (!url) return true; // Optional field
  return z.string().url().safeParse(url).success;
};

// Game metadata validation
export const validateGameMetadata = (metadata: unknown): boolean => {
  try {
    if (typeof metadata !== 'object' || metadata === null) return false;
    
    // Check if all values are serializable
    JSON.stringify(metadata);
    return true;
  } catch {
    return false;
  }
};

// Game status validation
export const isValidGameStatus = (status: string): boolean => {
  return ['active', 'inactive'].includes(status);
};

// Sort order validation
export const isValidSortOrder = (order: number): boolean => {
  return Number.isInteger(order) && order >= 0;
};

// Bulk operation validation
export const validateBulkSelection = (gameIds: string[]): { isValid: boolean; error?: string } => {
  if (gameIds.length === 0) {
    return { isValid: false, error: 'No games selected' };
  }
  
  if (gameIds.length > 100) {
    return { isValid: false, error: 'Cannot process more than 100 games at once' };
  }
  
  const invalidIds = gameIds.filter(id => !z.string().uuid().safeParse(id).success);
  if (invalidIds.length > 0) {
    return { isValid: false, error: 'Some game IDs are invalid' };
  }
  
  return { isValid: true };
};

// Game form validation with custom rules
export const validateGameForm = (data: unknown): {
  isValid: boolean;
  errors: Record<string, string>;
  data?: GameFormData;
} => {
  const result = gameSchema.safeParse(data);
  
  if (result.success) {
    return { isValid: true, errors: {}, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((error) => {
    const path = error.path.join('.');
    errors[path] = error.message;
  });
  
  return { isValid: false, errors };
};
