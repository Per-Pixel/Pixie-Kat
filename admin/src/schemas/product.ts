import { z } from 'zod';

// Product validation schema
export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .min(2, 'Product name must be at least 2 characters')
    .max(200, 'Product name must be less than 200 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  gameId: z
    .string()
    .uuid('Please select a valid game'),
  category: z
    .string()
    .min(1, 'Category is required')
    .max(50, 'Category must be less than 50 characters'),
  type: z.enum(['currency', 'item', 'package', 'subscription'], {
    errorMap: () => ({ message: 'Please select a valid product type' }),
  }),
  price: z
    .number()
    .min(0.01, 'Price must be greater than 0')
    .max(10000, 'Price cannot exceed $10,000')
    .multipleOf(0.01, 'Price must have at most 2 decimal places'),
  originalPrice: z
    .number()
    .min(0, 'Original price must be non-negative')
    .max(10000, 'Original price cannot exceed $10,000')
    .multipleOf(0.01, 'Original price must have at most 2 decimal places')
    .optional(),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code')
    .regex(/^[A-Z]{3}$/, 'Currency must be uppercase letters')
    .default('USD'),
  stock: z
    .number()
    .int('Stock must be a whole number')
    .min(0, 'Stock cannot be negative')
    .max(1000000, 'Stock cannot exceed 1,000,000'),
  minStock: z
    .number()
    .int('Minimum stock must be a whole number')
    .min(0, 'Minimum stock cannot be negative')
    .default(10),
  maxStock: z
    .number()
    .int('Maximum stock must be a whole number')
    .min(1, 'Maximum stock must be at least 1')
    .default(1000),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  tags: z
    .array(z.string().min(1).max(30))
    .max(10, 'Cannot have more than 10 tags')
    .optional(),
  imageUrl: z
    .string()
    .url('Please enter a valid image URL')
    .optional()
    .or(z.literal('')),
  metadata: z
    .record(z.any())
    .optional(),
  sortOrder: z
    .number()
    .int('Sort order must be an integer')
    .min(0, 'Sort order must be non-negative')
    .optional(),
}).refine(
  (data) => !data.originalPrice || data.originalPrice >= data.price,
  {
    message: 'Original price must be greater than or equal to current price',
    path: ['originalPrice'],
  }
).refine(
  (data) => data.maxStock >= data.minStock,
  {
    message: 'Maximum stock must be greater than or equal to minimum stock',
    path: ['maxStock'],
  }
).refine(
  (data) => data.stock <= data.maxStock,
  {
    message: 'Current stock cannot exceed maximum stock',
    path: ['stock'],
  }
);

// Product update schema (all fields optional except validation rules)
export const updateProductSchema = productSchema.partial();

// Product pricing schema
export const productPricingSchema = z.object({
  price: z
    .number()
    .min(0.01, 'Price must be greater than 0')
    .max(10000, 'Price cannot exceed $10,000')
    .multipleOf(0.01, 'Price must have at most 2 decimal places'),
  originalPrice: z
    .number()
    .min(0, 'Original price must be non-negative')
    .max(10000, 'Original price cannot exceed $10,000')
    .multipleOf(0.01, 'Original price must have at most 2 decimal places')
    .optional(),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code')
    .regex(/^[A-Z]{3}$/, 'Currency must be uppercase letters'),
  effectiveFrom: z
    .string()
    .datetime('Please enter a valid date and time')
    .optional(),
  effectiveTo: z
    .string()
    .datetime('Please enter a valid date and time')
    .optional(),
}).refine(
  (data) => !data.originalPrice || data.originalPrice >= data.price,
  {
    message: 'Original price must be greater than or equal to current price',
    path: ['originalPrice'],
  }
);

// Stock management schema
export const stockUpdateSchema = z.object({
  stock: z
    .number()
    .int('Stock must be a whole number')
    .min(0, 'Stock cannot be negative')
    .max(1000000, 'Stock cannot exceed 1,000,000'),
  reason: z
    .string()
    .min(1, 'Reason is required')
    .max(200, 'Reason must be less than 200 characters'),
  type: z.enum(['adjustment', 'restock', 'sale', 'return', 'damage', 'expired'], {
    errorMap: () => ({ message: 'Please select a valid stock update type' }),
  }),
});

// Product search filters schema
export const productFiltersSchema = z.object({
  search: z.string().optional(),
  gameId: z.string().uuid().optional(),
  category: z.string().optional(),
  type: z.enum(['currency', 'item', 'package', 'subscription']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  featured: z.boolean().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  inStock: z.boolean().optional(),
  lowStock: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(['name', 'price', 'stock', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// Bulk operations schema
export const bulkProductOperationSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'delete', 'update_price', 'update_stock', 'feature', 'unfeature']),
  productIds: z
    .array(z.string().uuid('Invalid product ID'))
    .min(1, 'At least one product must be selected')
    .max(100, 'Cannot process more than 100 products at once'),
  data: z.record(z.any()).optional(),
});

// Product import schema
export const productImportSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  gameId: z.string().uuid('Invalid game ID'),
  category: z.string().min(1, 'Category is required'),
  type: z.enum(['currency', 'item', 'package', 'subscription']),
  price: z
    .union([z.number(), z.string()])
    .transform((val) => {
      if (typeof val === 'string') {
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
      }
      return val;
    }),
  stock: z
    .union([z.number(), z.string()])
    .transform((val) => {
      if (typeof val === 'string') {
        const num = parseInt(val, 10);
        return isNaN(num) ? 0 : num;
      }
      return val;
    }),
  isActive: z
    .union([z.boolean(), z.string()])
    .transform((val) => {
      if (typeof val === 'string') {
        return val.toLowerCase() === 'true' || val === '1';
      }
      return val;
    })
    .optional(),
});

// Product clone schema
export const productCloneSchema = z.object({
  name: z
    .string()
    .min(1, 'New product name is required')
    .min(2, 'Product name must be at least 2 characters')
    .max(200, 'Product name must be less than 200 characters'),
  gameId: z
    .string()
    .uuid('Please select a valid game')
    .optional(),
  copyStock: z.boolean().default(false),
  copyImages: z.boolean().default(true),
});

// Export type definitions
export type ProductFormData = z.infer<typeof productSchema>;
export type UpdateProductFormData = z.infer<typeof updateProductSchema>;
export type ProductPricingData = z.infer<typeof productPricingSchema>;
export type StockUpdateData = z.infer<typeof stockUpdateSchema>;
export type ProductFiltersData = z.infer<typeof productFiltersSchema>;
export type BulkProductOperationData = z.infer<typeof bulkProductOperationSchema>;
export type ProductImportData = z.infer<typeof productImportSchema>;
export type ProductCloneData = z.infer<typeof productCloneSchema>;

// Validation helper functions
export const validateProduct = (data: unknown) => productSchema.safeParse(data);
export const validateUpdateProduct = (data: unknown) => updateProductSchema.safeParse(data);
export const validateProductPricing = (data: unknown) => productPricingSchema.safeParse(data);
export const validateStockUpdate = (data: unknown) => stockUpdateSchema.safeParse(data);
export const validateProductFilters = (data: unknown) => productFiltersSchema.safeParse(data);
export const validateBulkProductOperation = (data: unknown) => bulkProductOperationSchema.safeParse(data);
export const validateProductImport = (data: unknown) => productImportSchema.safeParse(data);
export const validateProductClone = (data: unknown) => productCloneSchema.safeParse(data);

// Price validation helpers
export const isValidPrice = (price: number): boolean => {
  return price > 0 && price <= 10000 && Number((price * 100).toFixed(0)) / 100 === price;
};

export const isValidCurrency = (currency: string): boolean => {
  return /^[A-Z]{3}$/.test(currency);
};

// Stock validation helpers
export const isValidStock = (stock: number): boolean => {
  return Number.isInteger(stock) && stock >= 0 && stock <= 1000000;
};

export const isStockLow = (current: number, minimum: number): boolean => {
  return current <= minimum;
};

// Product type validation
export const isValidProductType = (type: string): boolean => {
  return ['currency', 'item', 'package', 'subscription'].includes(type);
};

// Tag validation
export const validateTags = (tags: string[]): { isValid: boolean; error?: string } => {
  if (tags.length > 10) {
    return { isValid: false, error: 'Cannot have more than 10 tags' };
  }
  
  const invalidTags = tags.filter(tag => !tag || tag.length > 30);
  if (invalidTags.length > 0) {
    return { isValid: false, error: 'Tags must be 1-30 characters long' };
  }
  
  return { isValid: true };
};

// Product form validation with custom rules
export const validateProductForm = (data: unknown): {
  isValid: boolean;
  errors: Record<string, string>;
  data?: ProductFormData;
} => {
  const result = productSchema.safeParse(data);
  
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

// Discount calculation validation
export const validateDiscount = (originalPrice: number, salePrice: number): {
  isValid: boolean;
  discountPercent?: number;
  error?: string;
} => {
  if (salePrice > originalPrice) {
    return { isValid: false, error: 'Sale price cannot be higher than original price' };
  }
  
  if (salePrice <= 0) {
    return { isValid: false, error: 'Sale price must be greater than 0' };
  }
  
  const discountPercent = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
  
  return { isValid: true, discountPercent };
};
