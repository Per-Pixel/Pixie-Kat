import { z } from 'zod';

// User validation schema
export const userSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name can only contain letters, spaces, hyphens, apostrophes, and periods'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase(),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be less than 20 characters')
    .optional()
    .or(z.literal('')),
  role: z.enum(['admin', 'reseller', 'support'], {
    errorMap: () => ({ message: 'Please select a valid role' }),
  }),
  status: z.enum(['active', 'inactive', 'suspended', 'pending'], {
    errorMap: () => ({ message: 'Please select a valid status' }),
  }).default('active'),
  avatar: z
    .string()
    .url('Please enter a valid avatar URL')
    .optional()
    .or(z.literal('')),
  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .optional(),
  timezone: z
    .string()
    .max(50, 'Timezone must be less than 50 characters')
    .optional(),
  language: z
    .string()
    .length(2, 'Language must be a 2-letter code')
    .regex(/^[a-z]{2}$/, 'Language must be lowercase letters')
    .default('en'),
  metadata: z
    .record(z.any())
    .optional(),
});

// User creation schema (includes password)
export const createUserSchema = userSchema.extend({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
);

// User update schema (all fields optional except validation rules)
export const updateUserSchema = userSchema.partial();

// User profile update schema (excludes role and status)
export const profileUpdateSchema = userSchema
  .omit({ role: true, status: true })
  .partial()
  .extend({
    currentPassword: z
      .string()
      .min(1, 'Current password is required')
      .optional(),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be less than 128 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
      .optional(),
    confirmNewPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.newPassword && !data.confirmNewPassword) return false;
      if (data.newPassword && data.newPassword !== data.confirmNewPassword) return false;
      return true;
    },
    {
      message: 'New passwords do not match',
      path: ['confirmNewPassword'],
    }
  )
  .refine(
    (data) => {
      if (data.newPassword && !data.currentPassword) return false;
      return true;
    },
    {
      message: 'Current password is required to change password',
      path: ['currentPassword'],
    }
  );

// User search filters schema
export const userFiltersSchema = z.object({
  search: z.string().optional(),
  role: z.enum(['admin', 'reseller', 'support']).optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'pending']).optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  lastActiveFrom: z.string().datetime().optional(),
  lastActiveTo: z.string().datetime().optional(),
  hasAvatar: z.boolean().optional(),
  sortBy: z.enum(['name', 'email', 'role', 'status', 'createdAt', 'lastActiveAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// Bulk operations schema
export const bulkUserOperationSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'suspend', 'delete', 'change_role']),
  userIds: z
    .array(z.string().uuid('Invalid user ID'))
    .min(1, 'At least one user must be selected')
    .max(100, 'Cannot process more than 100 users at once'),
  data: z.record(z.any()).optional(),
});

// User import schema
export const userImportSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'reseller', 'support']),
  status: z
    .enum(['active', 'inactive', 'suspended', 'pending'])
    .optional()
    .default('active'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .optional(),
});

// Password reset schema
export const passwordResetSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

// Password change schema
export const passwordChangeSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
);

// User avatar upload schema
export const avatarUploadSchema = z.object({
  file: z
    .instanceof(File, { message: 'Please select a valid image file' })
    .refine((file) => file.size <= 2 * 1024 * 1024, 'Avatar must be less than 2MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'Only JPEG, PNG, and WebP images are allowed'
    ),
});

// Export type definitions
export type UserFormData = z.infer<typeof userSchema>;
export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
export type UserFiltersData = z.infer<typeof userFiltersSchema>;
export type BulkUserOperationData = z.infer<typeof bulkUserOperationSchema>;
export type UserImportData = z.infer<typeof userImportSchema>;
export type PasswordResetData = z.infer<typeof passwordResetSchema>;
export type PasswordChangeData = z.infer<typeof passwordChangeSchema>;
export type AvatarUploadData = z.infer<typeof avatarUploadSchema>;

// Validation helper functions
export const validateUser = (data: unknown) => userSchema.safeParse(data);
export const validateCreateUser = (data: unknown) => createUserSchema.safeParse(data);
export const validateUpdateUser = (data: unknown) => updateUserSchema.safeParse(data);
export const validateProfileUpdate = (data: unknown) => profileUpdateSchema.safeParse(data);
export const validateUserFilters = (data: unknown) => userFiltersSchema.safeParse(data);
export const validateBulkUserOperation = (data: unknown) => bulkUserOperationSchema.safeParse(data);
export const validateUserImport = (data: unknown) => userImportSchema.safeParse(data);
export const validatePasswordReset = (data: unknown) => passwordResetSchema.safeParse(data);
export const validatePasswordChange = (data: unknown) => passwordChangeSchema.safeParse(data);
export const validateAvatarUpload = (data: unknown) => avatarUploadSchema.safeParse(data);

// Email validation helper
export const isValidEmail = (email: string): boolean => {
  return z.string().email().safeParse(email).success;
};

// Phone validation helper
export const isValidPhone = (phone: string): boolean => {
  if (!phone) return true; // Optional field
  return /^\+?[\d\s\-\(\)]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

// Password strength validation
export const getPasswordStrength = (password: string): {
  score: number;
  feedback: string[];
  isValid: boolean;
} => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else feedback.push('Password should be at least 8 characters');

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Password should contain lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Password should contain uppercase letters');

  if (/\d/.test(password)) score += 1;
  else feedback.push('Password should contain numbers');

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

  if (password.length >= 12) score += 1;

  const isValid = score >= 3;

  return { score, feedback, isValid };
};

// Role validation
export const isValidRole = (role: string): boolean => {
  return ['admin', 'reseller', 'support'].includes(role);
};

// Status validation
export const isValidStatus = (status: string): boolean => {
  return ['active', 'inactive', 'suspended', 'pending'].includes(status);
};

// Name validation helper
export const isValidName = (name: string): boolean => {
  return /^[a-zA-Z\s\-'\.]+$/.test(name) && name.length >= 2 && name.length <= 100;
};

// User form validation with custom rules
export const validateUserForm = (data: unknown): {
  isValid: boolean;
  errors: Record<string, string>;
  data?: UserFormData;
} => {
  const result = userSchema.safeParse(data);
  
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

// Bulk operation validation
export const validateBulkSelection = (userIds: string[]): { isValid: boolean; error?: string } => {
  if (userIds.length === 0) {
    return { isValid: false, error: 'No users selected' };
  }
  
  if (userIds.length > 100) {
    return { isValid: false, error: 'Cannot process more than 100 users at once' };
  }
  
  const invalidIds = userIds.filter(id => !z.string().uuid().safeParse(id).success);
  if (invalidIds.length > 0) {
    return { isValid: false, error: 'Some user IDs are invalid' };
  }
  
  return { isValid: true };
};
