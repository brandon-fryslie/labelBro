// Sentry error tracking integration
import { init, captureException, captureMessage, setUser, setTag, setContext, withScope } from '@sentry/browser';

interface ErrorTrackingConfig {
  dsn?: string;
  environment: 'development' | 'production' | 'staging';
  release?: string;
  sampleRate: number;
  tracesSampleRate: number;
}

class ErrorTrackingService {
  private isInitialized = false;
  private isDevelopment = process.env.NODE_ENV === 'development';

  public initialize(config?: Partial<ErrorTrackingConfig>): void {
    // Skip Sentry initialization in development unless explicitly configured
    if (this.isDevelopment && !config?.dsn) {
      console.log('🔧 Sentry disabled in development (no DSN provided)');
      return;
    }

    const defaultConfig: ErrorTrackingConfig = {
      environment: this.isDevelopment ? 'development' : 'production',
      sampleRate: this.isDevelopment ? 1.0 : 0.1, // 100% in dev, 10% in prod
      tracesSampleRate: this.isDevelopment ? 1.0 : 0.1,
      ...config
    };

    try {
      init({
        dsn: defaultConfig.dsn || process.env.REACT_APP_SENTRY_DSN,
        environment: defaultConfig.environment,
        release: defaultConfig.release || process.env.REACT_APP_VERSION,
        sampleRate: defaultConfig.sampleRate,
        tracesSampleRate: defaultConfig.tracesSampleRate,
        
        integrations: [
          // Add custom integrations if needed
        ],

        beforeSend: (event, hint) => {
          // Filter out noise in development
          if (this.isDevelopment) {
            console.log('📋 Sentry Event:', event);
            console.log('💡 Error Hint:', hint);
          }

          // Don't send certain errors in production
          if (event.exception) {
            const error = hint?.originalException;
            
            // Skip network errors that are not actionable
            if (error instanceof Error) {
              if (error.message.includes('Network request failed') ||
                  error.message.includes('Failed to fetch') ||
                  error.message.includes('Load failed')) {
                return null;
              }
            }
          }

          return event;
        },

        beforeBreadcrumb: (breadcrumb) => {
          // Filter out noisy breadcrumbs
          if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
            return null;
          }

          // Enhance UI breadcrumbs with more context
          if (breadcrumb.category === 'ui.click') {
            breadcrumb.data = {
              ...breadcrumb.data,
              timestamp: Date.now(),
              url: window.location.href
            };
          }

          return breadcrumb;
        }
      });

      // Set initial context using withScope
      withScope((scope) => {
        scope.setTag('component', 'labelBro-frontend');
        scope.setContext('browser', {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled
        });
        scope.setContext('application', {
          framework: 'React',
          version: process.env.REACT_APP_VERSION || 'unknown',
          build: process.env.REACT_APP_BUILD_ID || 'development'
        });
      });

      this.isInitialized = true;
      
      if (this.isDevelopment) {
        console.log('🔍 Sentry initialized for development');
      }
    } catch (error) {
      console.warn('Failed to initialize Sentry:', error);
    }
  }

  public captureError(error: Error, context?: Record<string, any>): void {
    if (this.isDevelopment) {
      console.error('🚨 Error captured:', error);
      if (context) console.log('📝 Error context:', context);
    }

    if (!this.isInitialized) {
      // Fallback to console in case Sentry isn't available
      console.error('Error (Sentry not initialized):', error);
      return;
    }

    if (context) {
      withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value);
        });
        captureException(error);
      });
    } else {
      captureException(error);
    }
  }

  public captureMessage(message: string, level: 'debug' | 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>): void {
    if (this.isDevelopment) {
      console.log(`📢 Message captured [${level}]:`, message);
      if (context) console.log('📝 Message context:', context);
    }

    if (!this.isInitialized) {
      console.log(`Message (Sentry not initialized) [${level}]:`, message);
      return;
    }

    if (context) {
      withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value);
        });
        captureMessage(message, level);
      });
    } else {
      captureMessage(message, level);
    }
  }

  public setUser(user: { id?: string; email?: string; username?: string; [key: string]: any }): void {
    if (!this.isInitialized) return;

    setUser(user);
    
    if (this.isDevelopment) {
      console.log('👤 User context set:', user);
    }
  }

  public setTag(key: string, value: string): void {
    if (!this.isInitialized) return;

    setTag(key, value);

    if (this.isDevelopment) {
      console.log(`🏷️ Tag set: ${key} = ${value}`);
    }
  }

  public setContext(key: string, context: Record<string, any>): void {
    if (!this.isInitialized) return;

    setContext(key, context);

    if (this.isDevelopment) {
      console.log(`📋 Context set: ${key}`, context);
    }
  }

  // Specialized error capturing methods for common use cases
  public captureApiError(error: Error, endpoint: string, method: string, statusCode?: number): void {
    this.captureError(error, {
      api: {
        endpoint,
        method,
        statusCode,
        timestamp: new Date().toISOString()
      }
    });
  }

  public captureValidationError(error: Error, validationTarget: string, inputData?: any): void {
    this.captureError(error, {
      validation: {
        target: validationTarget,
        inputData: inputData ? JSON.stringify(inputData) : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }

  public captureComponentError(error: Error, componentName: string, props?: Record<string, any>): void {
    this.captureError(error, {
      react: {
        component: componentName,
        props: props ? JSON.stringify(props) : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }

  public capturePerformanceIssue(message: string, metrics: Record<string, any>): void {
    this.captureMessage(message, 'warning', {
      performance: {
        ...metrics,
        timestamp: new Date().toISOString(),
        url: window.location.href
      }
    });
  }

  // Check if error tracking is available
  public isAvailable(): boolean {
    return this.isInitialized;
  }

  // Get current user context (useful for debugging)
  public getCurrentContext(): Record<string, any> {
    return {
      initialized: this.isInitialized,
      environment: this.isDevelopment ? 'development' : 'production',
      url: typeof window !== 'undefined' ? window.location.href : 'server-side',
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const errorTracking = new ErrorTrackingService();

// Export types for TypeScript support
export type { ErrorTrackingConfig };

// Initialize with sensible defaults
// Can be overridden by calling errorTracking.initialize(config) with specific settings
errorTracking.initialize();