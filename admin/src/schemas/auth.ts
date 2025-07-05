import { z } from 'zod';

// Login validation schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Change password validation schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Forgot password validation schema
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

// Reset password validation schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Profile update validation schema
export const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^\+?[\d\s\-\(\)]+$/.test(val), {
      message: 'Please enter a valid phone number',
    }),
});

// 2FA validation schema
export const twoFactorSchema = z.object({
  token: z
    .string()
    .min(6, 'Token must be 6 digits')
    .max(6, 'Token must be 6 digits')
    .regex(/^\d{6}$/, 'Token must contain only numbers'),
});

// User creation validation schema (for admin use)
export const createUserSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: passwordSchema,
  role: z.enum(['admin', 'reseller', 'support'], {
    required_error: 'Role is required',
  }),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^\+?[\d\s\-\(\)]+$/.test(val), {
      message: 'Please enter a valid phone number',
    }),
});

// User update validation schema (for admin use)
export const updateUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .optional(),
  email: z
    .string()
    .email('Please enter a valid email address')
    .optional(),
  role: z.enum(['admin', 'reseller', 'support']).optional(),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^\+?[\d\s\-\(\)]+$/.test(val), {
      message: 'Please enter a valid phone number',
    }),
  isActive: z.boolean().optional(),
});

// Session validation schema
export const sessionSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  refreshToken: z.string().min(1, 'Refresh token is required'),
  expiresAt: z.string().datetime(),
});

// API key validation schema
export const apiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'API key name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be less than 50 characters'),
  permissions: z
    .array(z.string())
    .min(1, 'At least one permission is required'),
  expiresAt: z
    .string()
    .datetime()
    .optional(),
});

// Permission validation schema
export const permissionSchema = z.object({
  resource: z.string().min(1, 'Resource is required'),
  actions: z
    .array(z.enum(['create', 'read', 'update', 'delete']))
    .min(1, 'At least one action is required'),
});

// Role validation schema
export const roleSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(30, 'Name must be less than 30 characters')
    .regex(/^[a-zA-Z_]+$/, 'Role name can only contain letters and underscores'),
  description: z
    .string()
    .max(200, 'Description must be less than 200 characters')
    .optional(),
  permissions: z
    .array(permissionSchema)
    .min(1, 'At least one permission is required'),
  isActive: z.boolean().default(true),
});

// Export type definitions
export type LoginFormData = z.infer<typeof loginSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
export type TwoFactorFormData = z.infer<typeof twoFactorSchema>;
export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
export type SessionData = z.infer<typeof sessionSchema>;
export type ApiKeyFormData = z.infer<typeof apiKeySchema>;
export type PermissionData = z.infer<typeof permissionSchema>;
export type RoleFormData = z.infer<typeof roleSchema>;

// Validation helper functions
export const validateLogin = (data: unknown) => loginSchema.safeParse(data);
export const validateChangePassword = (data: unknown) => changePasswordSchema.safeParse(data);
export const validateForgotPassword = (data: unknown) => forgotPasswordSchema.safeParse(data);
export const validateResetPassword = (data: unknown) => resetPasswordSchema.safeParse(data);
export const validateProfileUpdate = (data: unknown) => profileUpdateSchema.safeParse(data);
export const validateTwoFactor = (data: unknown) => twoFactorSchema.safeParse(data);
export const validateCreateUser = (data: unknown) => createUserSchema.safeParse(data);
export const validateUpdateUser = (data: unknown) => updateUserSchema.safeParse(data);
export const validateSession = (data: unknown) => sessionSchema.safeParse(data);
export const validateApiKey = (data: unknown) => apiKeySchema.safeParse(data);
export const validatePermission = (data: unknown) => permissionSchema.safeParse(data);
export const validateRole = (data: unknown) => roleSchema.safeParse(data);

// Password strength checker
export const checkPasswordStrength = (password: string): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} => {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) score += 1;
  else feedback.push('Use at least 8 characters');

  if (password.length >= 12) score += 1;
  else if (password.length >= 8) feedback.push('Consider using 12+ characters for better security');

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Include lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Include uppercase letters');

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Include numbers');

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push('Include special characters');

  // Common patterns check
  if (!/(.)\1{2,}/.test(password)) score += 1;
  else feedback.push('Avoid repeating characters');

  const isStrong = score >= 5;
  
  if (isStrong && feedback.length === 0) {
    feedback.push('Strong password!');
  }

  return { score, feedback, isStrong };
};

// Email validation helper
export const isValidEmail = (email: string): boolean => {
  return z.string().email().safeParse(email).success;
};

// Phone validation helper
export const isValidPhone = (phone: string): boolean => {
  return /^\+?[\d\s\-\(\)]+$/.test(phone);
};
