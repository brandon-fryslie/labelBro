// Optimized Sentry error tracking integration - minimal bundle size
// Import only essential functions to exclude heavy features like Replay, Feedback, Canvas
import {
  init,
  captureException,
  captureMessage,
  setUser,
  setTag,
  setContext,
  withScope,
  // Import only essential browser integrations to minimize bundle size
  globalHandlersIntegration,
  breadcrumbsIntegration,
  linkedErrorsIntegration,
  browserTracingIntegration,
  dedupeIntegration,
  inboundFiltersIntegration
} from '@sentry/browser';

interface ErrorTrackingConfig {
  dsn?: string | undefined;
  environment: 'development' | 'production' | 'staging';
  release?: string | undefined;
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
      tracesSampleRate: this.isDevelopment ? 1.0 : 0.05, // Reduced for production
      ...config
    };

    // Ensure DSN and release are defined before passing to init
    const dsn = defaultConfig.dsn || process.env.REACT_APP_SENTRY_DSN;
    const release = defaultConfig.release || process.env.REACT_APP_VERSION;

    // Skip initialization if no DSN is available
    if (!dsn) {
      console.log('🔧 Sentry disabled (no DSN configured)');
      return;
    }

    try {
      // Build the config object conditionally to satisfy exactOptionalPropertyTypes
      const sentryConfig: any = {
        dsn: dsn,
        environment: defaultConfig.environment,
        sampleRate: defaultConfig.sampleRate,
        tracesSampleRate: defaultConfig.tracesSampleRate,

        // Minimal integrations - exclude heavy features to reduce bundle size
        integrations: [
          // Essential error handling
          globalHandlersIntegration({
            onunhandledrejection: true,
            onerror: true,
          }),

          // Basic breadcrumbs - minimal configuration
          breadcrumbsIntegration({
            console: false, // Disable console breadcrumbs to reduce noise and bundle size
            dom: true,      // Keep DOM events for UI debugging
            fetch: false,   // Disable fetch tracking to reduce bundle size
            history: false, // Disable history tracking to reduce bundle size
            sentry: false,  // Disable Sentry breadcrumbs to reduce noise
            xhr: false,     // Disable XHR tracking to reduce bundle size
          }),

          // Error deduplication
          dedupeIntegration(),

          // Basic error filtering
          inboundFiltersIntegration(),

          // Linked error handling
          linkedErrorsIntegration({
            key: 'cause',
            limit: 3, // Limit chain depth to reduce processing
          }),

          // Minimal tracing - disabled most features for bundle size
          browserTracingIntegration({
            enableLongTask: false, // Disable long task tracking
            enableInp: false, // Disable INP tracking
          }),
        ],

        // Exclude heavy features completely (these are auto-included by default)
        // replayIntegration - EXCLUDED (294KB)
        // feedbackIntegration - EXCLUDED (75KB)
        // replayCanvasIntegration - EXCLUDED (31KB)

        beforeSend: (event: any, hint: any) => {
          // Filter out noise in development
          if (this.isDevelopment) {
            console.log('📋 Sentry Event:', event);
            console.log('💡 Error Hint:', hint);
          }

          // Don't send certain errors in production to reduce noise
          if (event.exception) {
            const error = hint?.originalException;

            // Skip network errors that are not actionable
            if (error instanceof Error) {
              if (error.message.includes('Network request failed') ||
                  error.message.includes('Failed to fetch') ||
                  error.message.includes('Load failed') ||
                  error.message.includes('ResizeObserver loop limit exceeded') ||
                  error.message.includes('Non-Error promise rejection')) {
                return null;
              }
            }
          }

          return event;
        },

        beforeBreadcrumb: (breadcrumb: any) => {
          // Minimal breadcrumb filtering
          if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
            return null;
          }

          // Only keep essential UI breadcrumbs
          if (breadcrumb.category === 'ui.click') {
            breadcrumb.data = {
              ...breadcrumb.data,
              timestamp: Date.now(),
            };
          }

          return breadcrumb;
        }
      };

      // Only add release if it's defined (satisfies exactOptionalPropertyTypes)
      if (release) {
        sentryConfig.release = release;
      }

      init(sentryConfig);

      // Set minimal context using withScope
      withScope((scope) => {
        scope.setTag('component', 'labelBro-frontend');
        scope.setContext('browser', {
          userAgent: navigator.userAgent,
          language: navigator.language,
        });
        scope.setContext('application', {
          framework: 'React',
          version: process.env.REACT_APP_VERSION || 'unknown',
        });
      });

      this.isInitialized = true;

      if (this.isDevelopment) {
        console.log('🔍 Sentry initialized (minimal bundle configuration)');
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

// Initialize with sensible defaults - minimal configuration for bundle size
errorTracking.initialize();
