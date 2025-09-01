import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorTracking } from '../utils/error-tracking';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

// Global error boundary that catches all unhandled React errors
export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to Sentry with React-specific context
    errorTracking.captureComponentError(error, 'GlobalErrorBoundary', {
      errorBoundary: true,
      componentStack: errorInfo.componentStack,
      errorBoundaryLocation: 'global'
    });

    // Store error info for display
    this.setState({
      error,
      errorInfo
    });

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 Global Error Boundary caught error:', error);
      console.error('📍 Component Stack:', errorInfo.componentStack);
    }
  }

  private handleRetry = (): void => {
    // Clear error state to retry rendering
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined
    });

    // Log retry attempt
    errorTracking.captureMessage('User retried after global error boundary', 'info', {
      action: 'error_boundary_retry',
      previousError: this.state.error?.message
    });
  };

  private handleReload = (): void => {
    // Log reload action
    errorTracking.captureMessage('User reloaded page after global error boundary', 'info', {
      action: 'error_boundary_reload',
      previousError: this.state.error?.message
    });

    // Reload the page
    window.location.reload();
  };

  private handleReport = (): void => {
    if (!this.state.error) return;

    // Send additional report with user feedback
    errorTracking.captureMessage('User reported error via error boundary', 'error', {
      action: 'user_error_report',
      error: this.state.error.message,
      stack: this.state.error.stack,
      componentStack: this.state.errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });

    alert('Error report sent. Thank you for helping us improve the application!');
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      // Render custom fallback UI or provided fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-600 mb-6">
                We're sorry, but something unexpected happened. The error has been reported automatically.
              </p>
              
              {/* Error details in development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                    Error Details (Development)
                  </summary>
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm font-mono text-red-800 mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </p>
                    {this.state.error.stack && (
                      <pre className="text-xs text-red-700 whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              {/* Action buttons */}
              <div className="space-y-3">
                <button
                  onClick={this.handleRetry}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Try Again
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={this.handleReload}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    Reload Page
                  </button>
                  
                  <button
                    onClick={this.handleReport}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Report Issue
                  </button>
                </div>
              </div>

              {/* Contact info */}
              <div className="mt-6 text-xs text-gray-500">
                <p>
                  If this problem persists, please contact support with error ID:{' '}
                  <code className="bg-gray-100 px-1 rounded">
                    {Date.now().toString(36)}
                  </code>
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}