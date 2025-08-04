// TypeScript compilation error reporter for cross-system logging
export class TypeScriptErrorReporter {
  // Send TypeScript compilation errors to backend
  static async reportCompilationError(error: {
    message: string;
    file?: string;
    line?: number;
    column?: number;
    code?: string;
  }): Promise<void> {
    try {
      await fetch('/log-frontend-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'TYPESCRIPT_COMPILATION_ERROR',
          message: error.message,
          source: 'typescript-compiler',
          timestamp: new Date().toISOString(),
          details: {
            file: error.file,
            line: error.line,
            column: error.column,
            code: error.code,
            errorType: 'compilation'
          }
        })
      });
    } catch (backendError) {
      // Don't throw - just log that backend logging failed
      console.warn('Failed to send TypeScript error to backend:', backendError);
    }
  }

  // Send generic JavaScript runtime errors to backend
  static async reportRuntimeError(error: Error, context?: string): Promise<void> {
    try {
      await fetch('/log-frontend-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'JAVASCRIPT_RUNTIME_ERROR',
          message: error.message,
          source: 'javascript-runtime',
          timestamp: new Date().toISOString(),
          details: {
            stack: error.stack,
            name: error.name,
            context: context,
            errorType: 'runtime'
          }
        })
      });
    } catch (backendError) {
      // Don't throw - just log that backend logging failed
      console.warn('Failed to send runtime error to backend:', backendError);
    }
  }

  // Set up global error handlers for unhandled errors
  static setupGlobalErrorHandlers(): void {
    // Handle unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportRuntimeError(new Error(event.message), `${event.filename}:${event.lineno}:${event.colno}`);
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      this.reportRuntimeError(error, 'unhandled-promise-rejection');
    });
  }
}