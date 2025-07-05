import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { errorHandler, AppError, ErrorType, ErrorSeverity } from '../utils/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Create AppError for consistent error handling
    const appError = new AppError(
      error.message,
      ErrorType.UNKNOWN,
      ErrorSeverity.CRITICAL,
      'REACT_ERROR_BOUNDARY',
      undefined,
      {
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      }
    );

    // Log error through error handler
    errorHandler.handleError(appError, 'React Error Boundary');

    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send error to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportErrorToService(error, errorInfo);
    }
  }

  private reportErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Implement error reporting to external service
    // e.g., Sentry, LogRocket, Bugsnag, etc.
    try {
      // Example implementation
      console.error('Reporting error to external service:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
      });
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private renderErrorDetails = () => {
    const { error, errorInfo, errorId } = this.state;
    const { showDetails = process.env.NODE_ENV === 'development' } = this.props;

    if (!showDetails || !error) return null;

    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-2 mb-3">
          <Bug className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Error Details</span>
          {errorId && (
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
              ID: {errorId}
            </span>
          )}
        </div>
        
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-medium text-gray-600 mb-1">Error Message:</h4>
            <p className="text-sm text-gray-800 font-mono bg-white p-2 rounded border">
              {error.message}
            </p>
          </div>
          
          {error.stack && (
            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-1">Stack Trace:</h4>
              <pre className="text-xs text-gray-700 bg-white p-2 rounded border overflow-auto max-h-32">
                {error.stack}
              </pre>
            </div>
          )}
          
          {errorInfo?.componentStack && (
            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-1">Component Stack:</h4>
              <pre className="text-xs text-gray-700 bg-white p-2 rounded border overflow-auto max-h-32">
                {errorInfo.componentStack}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, this.state.errorInfo!);
      }

      // Default error UI
      const canRetry = this.retryCount < this.maxRetries;

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              
              <h1 className="text-lg font-semibold text-gray-900 mb-2">
                Something went wrong
              </h1>
              
              <p className="text-sm text-gray-600 mb-6">
                We're sorry, but something unexpected happened. Please try refreshing the page or contact support if the problem persists.
              </p>
              
              <div className="space-y-3">
                {canRetry && (
                  <button
                    onClick={this.handleRetry}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again ({this.maxRetries - this.retryCount} attempts left)
                  </button>
                )}
                
                <button
                  onClick={this.handleReload}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  Go to Homepage
                </button>
              </div>
              
              {this.state.errorId && (
                <p className="text-xs text-gray-500 mt-4">
                  Error ID: {this.state.errorId}
                </p>
              )}
            </div>
            
            {this.renderErrorDetails()}
          </div>
        </div>
      );
    }

    return children;
  }
}

// Hook for using error boundary in functional components
export const useErrorHandler = () => {
  const throwError = (error: Error) => {
    throw error;
  };

  const handleError = (error: unknown, context?: string) => {
    const appError = errorHandler.handleError(error, context);
    
    // In development, throw the error to trigger error boundary
    if (process.env.NODE_ENV === 'development') {
      throwError(new Error(appError.message));
    }
    
    return appError;
  };

  return { handleError, throwError };
};

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Async error boundary for handling async errors
export class AsyncErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `async_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidMount() {
    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    
    this.setState({
      hasError: true,
      error,
      errorId: `unhandled_promise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });

    // Prevent the default browser behavior
    event.preventDefault();
  };

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Handle the error similar to regular ErrorBoundary
    const appError = new AppError(
      error.message,
      ErrorType.UNKNOWN,
      ErrorSeverity.CRITICAL,
      'ASYNC_ERROR_BOUNDARY',
      undefined,
      {
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        async: true,
      }
    );

    errorHandler.handleError(appError, 'Async Error Boundary');
    this.setState({ errorInfo });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorBoundary {...this.props}>
          {this.props.children}
        </ErrorBoundary>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
