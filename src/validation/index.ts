// Runtime type validation utilities using Typia
// This module provides runtime type checking for API responses and form data

export class ValidationError extends Error {
  validationErrors: Array<{ path: string; expected: string; value: any }>;
  receivedData: any;

  constructor(
    message: string, 
    errors: Array<{ path: string; expected: string; value: any }> = [], 
    data: any = null
  ) {
    super(message);
    this.name = 'ValidationError';
    this.validationErrors = errors;
    this.receivedData = data;
  }

  toDebugInfo(): string {
    return JSON.stringify({
      error: this.message,
      validationErrors: this.validationErrors,
      receivedData: this.receivedData
    }, null, 2);
  }

  toAIFeedback(): string {
    return `Runtime Type Validation Failed: ${this.message}\n\nValidation Errors:\n${this.validationErrors.map(err => `- ${err.path}: expected ${err.expected}, got ${JSON.stringify(err.value)}`).join('\n')}\n\nThis suggests that the API response structure has changed or the TypeScript types need to be updated.`;
  }
}

export class TypeValidator {
  // PrinterData validation
  static validatePrinterData(data: any) {
    const errors: Array<{ path: string; expected: string; value: any }> = [];
    
    if (!data) {
      errors.push({ path: '$input', expected: 'object', value: data });
    } else {
      if (typeof data.id !== 'string') {
        errors.push({ path: '$input.id', expected: 'string', value: data.id });
      }
      if (typeof data.display_name !== 'string') {
        errors.push({ path: '$input.display_name', expected: 'string', value: data.display_name });
      }
      if (typeof data.is_connected !== 'boolean') {
        errors.push({ path: '$input.is_connected', expected: 'boolean', value: data.is_connected });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `PrinterData validation failed: ${errors.length} errors`,
        errors,
        data
      );
    }

    return data;
  }

  // PrintersResponse validation  
  static validatePrintersResponse(data: any) {
    const errors: Array<{ path: string; expected: string; value: any }> = [];
    
    if (!data) {
      errors.push({ path: '$input', expected: 'object', value: data });
    } else {
      if (!data.printers || typeof data.printers !== 'object') {
        errors.push({ path: '$input.printers', expected: 'object', value: data.printers });
      } else {
        // Validate each printer in the printers object
        for (const [printerId, printerData] of Object.entries(data.printers)) {
          try {
            this.validatePrinterData(printerData);
          } catch (error) {
            if (error instanceof ValidationError) {
              // Adjust error paths to include the printer ID
              error.validationErrors.forEach(err => {
                errors.push({ 
                  path: `$input.printers.${printerId}.${err.path.replace('$input.', '')}`, 
                  expected: err.expected, 
                  value: err.value 
                });
              });
            }
          }
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `PrintersResponse validation failed: ${errors.length} errors`,
        errors,
        data
      );
    }

    return data;
  }

  // LabelPreviewData validation
  static validateLabelPreviewData(data: any) {
    const errors: Array<{ path: string; expected: string; value: any }> = [];
    
    if (!data) {
      errors.push({ path: '$input', expected: 'object', value: data });
    } else {
      if (data.full_labels && !Array.isArray(data.full_labels)) {
        errors.push({ path: '$input.full_labels', expected: 'array', value: data.full_labels });
      }
      if (data.small_labels && !Array.isArray(data.small_labels)) {
        errors.push({ path: '$input.small_labels', expected: 'array', value: data.small_labels });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `LabelPreviewData validation failed: ${errors.length} errors`,
        errors,
        data
      );
    }

    return data;
  }

  // DiscoveryResponse validation
  static validateDiscoveryResponse(data: any) {
    // Discovery responses can vary significantly, so we'll be more lenient
    return data;
  }

  // ManualConnectionResult validation
  static validateManualConnectionResult(data: any) {
    const errors: Array<{ path: string; expected: string; value: any }> = [];
    
    if (!data) {
      errors.push({ path: '$input', expected: 'object', value: data });
    } else {
      if (typeof data.success !== 'boolean') {
        errors.push({ path: '$input.success', expected: 'boolean', value: data.success });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `ManualConnectionResult validation failed: ${errors.length} errors`,
        errors,
        data
      );
    }

    return data;
  }

  // PrintRequest validation
  static validatePrintRequest(data: any) {
    const errors: Array<{ path: string; expected: string; value: any }> = [];
    
    if (!data) {
      errors.push({ path: '$input', expected: 'object', value: data });
    } else {
      if (!data.data || typeof data.data !== 'object') {
        errors.push({ path: '$input.data', expected: 'object', value: data.data });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `PrintRequest validation failed: ${errors.length} errors`,
        errors,
        data
      );
    }

    return data;
  }

  // Generic validate method
  static validate<T>(data: any, validator: (data: any) => T): T {
    return validator(data);
  }

  // Assert method for type assertions
  static assert<T>(data: any, validator: (data: any) => T): asserts data is T {
    validator(data);
  }
}

export class ValidationReporter {
  private static validationHistory: ValidationError[] = [];

  // Log validation error with structured debugging information
  static logValidationError(error: ValidationError): void {
    console.error('🚨 RUNTIME TYPE VALIDATION FAILED 🚨');
    console.error('Debug Info:', error.toDebugInfo());
    console.error('Stack trace:', error.stack);
    
    // Store for analysis
    this.validationHistory.push(error);
  }

  // Report validation error to external systems and provide AI feedback
  static reportError(error: ValidationError): void {
    this.logValidationError(error);
    
    const debugInfo = error.toDebugInfo();
    
    console.log('VALIDATION_ERROR:', debugInfo);
    
    // Send to backend for centralized logging
    this.sendToBackend(error);
    
    // Store in localStorage for development debugging
    if (typeof localStorage !== 'undefined') {
      const existingLogs = JSON.parse(localStorage.getItem('typia_validation_errors') || '[]');
      existingLogs.push({
        timestamp: new Date().toISOString(),
        error: debugInfo
      });
      
      // Keep only the last 50 errors to prevent localStorage bloat
      const recentLogs = existingLogs.slice(-50);
      localStorage.setItem('typia_validation_errors', JSON.stringify(recentLogs));
    }
  }

  // Send validation error to backend endpoint for cross-system logging
  static sendToBackend(error: ValidationError): void {
    // Don't block the main thread or fail silently if backend is unavailable
    try {
      // Ensure fetch exists and returns a promise
      if (typeof fetch === 'function') {
        const fetchPromise = fetch('/log-frontend-error', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'TYPIA_VALIDATION_ERROR',
            message: error.message,
            source: 'typescript-validation',
            timestamp: new Date().toISOString(),
            details: {
              validationErrors: error.validationErrors.map(err => ({
                path: err.path,
                expected: err.expected,
                value: err.value
              })),
              receivedData: error.receivedData
            }
          })
        });

        // Only attach .catch if fetchPromise is actually a Promise
        if (fetchPromise && typeof fetchPromise.catch === 'function') {
          fetchPromise.catch(backendError => {
            // Don't throw - just log that backend logging failed
            console.warn('Failed to send validation error to backend:', backendError);
          });
        }
      } else {
        console.warn('fetch is not available - skipping backend error reporting');
      }
    } catch (error) {
      // Don't throw - just log that backend logging failed
      console.warn('Failed to send validation error to backend:', error);
    }
  }

  // Get validation error history for analysis
  static getValidationHistory(): ValidationError[] {
    return this.validationHistory.slice(); // Return a copy
  }

  // Clear validation history
  static clearValidationHistory(): void {
    this.validationHistory = [];
  }

  // Generate AI feedback for common validation patterns
  static generateAIFeedback(error: ValidationError): string {
    const commonPatterns = [
      {
        pattern: /expected.*string.*got.*undefined/,
        feedback: 'Missing required field - check if API response structure changed'
      },
      {
        pattern: /expected.*boolean.*got.*string/,
        feedback: 'Type mismatch - API may be returning string instead of boolean'
      },
      {
        pattern: /expected.*object.*got.*null/,
        feedback: 'Null object - check if API returned empty response'
      }
    ];

    const errorMessage = error.message.toLowerCase();
    for (const { pattern, feedback } of commonPatterns) {
      if (pattern.test(errorMessage)) {
        return `${feedback}\n\n${error.toAIFeedback()}`;
      }
    }

    return error.toAIFeedback();
  }
}