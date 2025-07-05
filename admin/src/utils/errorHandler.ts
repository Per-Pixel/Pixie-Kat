import { toast } from 'react-hot-toast';
import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ErrorResponse {
  message: string;
  code?: string;
  errors?: ValidationError[];
  details?: any;
}

// Error types
export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  SERVER = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly code?: string;
  public readonly status?: number;
  public readonly details?: any;
  public readonly timestamp: string;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    code?: string,
    status?: number,
    details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.code = code;
    this.status = status;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// Error handler class
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: AppError[] = [];
  private maxLogSize = 100;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Handle different types of errors
  handleError(error: unknown, context?: string): AppError {
    const appError = this.parseError(error, context);
    this.logError(appError);
    this.displayError(appError);
    return appError;
  }

  // Parse different error types into AppError
  private parseError(error: unknown, context?: string): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof AxiosError) {
      return this.parseAxiosError(error, context);
    }

    if (error instanceof Error) {
      return new AppError(
        error.message,
        ErrorType.UNKNOWN,
        ErrorSeverity.MEDIUM,
        undefined,
        undefined,
        { originalError: error.name, context }
      );
    }

    return new AppError(
      'An unknown error occurred',
      ErrorType.UNKNOWN,
      ErrorSeverity.MEDIUM,
      undefined,
      undefined,
      { originalError: error, context }
    );
  }

  // Parse Axios errors
  private parseAxiosError(error: AxiosError, context?: string): AppError {
    const response = error.response;
    const status = response?.status;
    const data = response?.data as ErrorResponse;

    let type = ErrorType.NETWORK;
    let severity = ErrorSeverity.MEDIUM;
    let message = 'Network error occurred';

    if (status) {
      switch (true) {
        case status === 400:
          type = ErrorType.VALIDATION;
          message = data?.message || 'Invalid request data';
          break;
        case status === 401:
          type = ErrorType.AUTHENTICATION;
          severity = ErrorSeverity.HIGH;
          message = data?.message || 'Authentication required';
          break;
        case status === 403:
          type = ErrorType.AUTHORIZATION;
          severity = ErrorSeverity.HIGH;
          message = data?.message || 'Access denied';
          break;
        case status === 404:
          type = ErrorType.NOT_FOUND;
          message = data?.message || 'Resource not found';
          break;
        case status >= 500:
          type = ErrorType.SERVER;
          severity = ErrorSeverity.HIGH;
          message = data?.message || 'Server error occurred';
          break;
        default:
          message = data?.message || error.message || 'Request failed';
      }
    } else if (error.code === 'NETWORK_ERROR') {
      type = ErrorType.NETWORK;
      severity = ErrorSeverity.HIGH;
      message = 'Network connection failed';
    } else if (error.code === 'ECONNABORTED') {
      type = ErrorType.NETWORK;
      message = 'Request timeout';
    }

    return new AppError(
      message,
      type,
      severity,
      data?.code || error.code,
      status,
      {
        url: error.config?.url,
        method: error.config?.method,
        errors: data?.errors,
        context,
      }
    );
  }

  // Log error
  private logError(error: AppError): void {
    this.errorLog.unshift(error);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Log to console based on severity
    const logData = {
      message: error.message,
      type: error.type,
      severity: error.severity,
      code: error.code,
      status: error.status,
      details: error.details,
      timestamp: error.timestamp,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('🔴 CRITICAL ERROR:', logData);
        break;
      case ErrorSeverity.HIGH:
        console.error('🟠 HIGH SEVERITY ERROR:', logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('🟡 MEDIUM SEVERITY ERROR:', logData);
        break;
      case ErrorSeverity.LOW:
        console.info('🟢 LOW SEVERITY ERROR:', logData);
        break;
    }

    // Send to external logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(error);
    }
  }

  // Display error to user
  private displayError(error: AppError): void {
    const shouldShowToast = this.shouldShowToast(error);
    
    if (shouldShowToast) {
      const message = this.getUserFriendlyMessage(error);
      
      switch (error.severity) {
        case ErrorSeverity.CRITICAL:
        case ErrorSeverity.HIGH:
          toast.error(message, { duration: 6000 });
          break;
        case ErrorSeverity.MEDIUM:
          toast.error(message, { duration: 4000 });
          break;
        case ErrorSeverity.LOW:
          toast(message, { duration: 2000 });
          break;
      }
    }
  }

  // Determine if error should show toast
  private shouldShowToast(error: AppError): boolean {
    // Don't show toast for certain error types
    const silentErrors = [ErrorType.AUTHENTICATION];
    return !silentErrors.includes(error.type);
  }

  // Get user-friendly error message
  private getUserFriendlyMessage(error: AppError): string {
    const friendlyMessages: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: 'Connection problem. Please check your internet connection.',
      [ErrorType.VALIDATION]: error.message,
      [ErrorType.AUTHENTICATION]: 'Please log in to continue.',
      [ErrorType.AUTHORIZATION]: 'You don\'t have permission to perform this action.',
      [ErrorType.NOT_FOUND]: 'The requested resource was not found.',
      [ErrorType.SERVER]: 'Server error. Please try again later.',
      [ErrorType.UNKNOWN]: 'Something went wrong. Please try again.',
    };

    return friendlyMessages[error.type] || error.message;
  }

  // Send error to external logging service
  private sendToLoggingService(error: AppError): void {
    // Implement external logging service integration
    // e.g., Sentry, LogRocket, etc.
    try {
      // Example: Send to logging service
      // loggingService.captureError(error);
    } catch (loggingError) {
      console.error('Failed to send error to logging service:', loggingError);
    }
  }

  // Get error log
  getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  // Clear error log
  clearErrorLog(): void {
    this.errorLog = [];
  }

  // Get errors by type
  getErrorsByType(type: ErrorType): AppError[] {
    return this.errorLog.filter(error => error.type === type);
  }

  // Get errors by severity
  getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errorLog.filter(error => error.severity === severity);
  }

  // Get recent errors
  getRecentErrors(minutes: number = 30): AppError[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.errorLog.filter(error => new Date(error.timestamp) > cutoff);
  }
}

// Global error handler instance
export const errorHandler = ErrorHandler.getInstance();

// Utility functions
export const handleApiError = (error: unknown, context?: string): AppError => {
  return errorHandler.handleError(error, context);
};

export const createValidationError = (field: string, message: string): AppError => {
  return new AppError(
    `${field}: ${message}`,
    ErrorType.VALIDATION,
    ErrorSeverity.LOW,
    'VALIDATION_ERROR',
    400,
    { field }
  );
};

export const createNetworkError = (message?: string): AppError => {
  return new AppError(
    message || 'Network connection failed',
    ErrorType.NETWORK,
    ErrorSeverity.HIGH,
    'NETWORK_ERROR'
  );
};

export const createAuthError = (message?: string): AppError => {
  return new AppError(
    message || 'Authentication failed',
    ErrorType.AUTHENTICATION,
    ErrorSeverity.HIGH,
    'AUTH_ERROR',
    401
  );
};

// React error boundary helper
export const getErrorBoundaryFallback = (error: Error, errorInfo: any) => {
  const appError = new AppError(
    error.message,
    ErrorType.UNKNOWN,
    ErrorSeverity.CRITICAL,
    'REACT_ERROR',
    undefined,
    { stack: error.stack, errorInfo }
  );
  
  errorHandler.handleError(appError, 'React Error Boundary');
  
  return {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please refresh the page and try again.',
    canRetry: true,
  };
};
