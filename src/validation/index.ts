// Runtime type validation using Typia
import typia from 'typia';
import type { 
  PrinterData, 
  PrintersResponse, 
  LabelPreviewData, 
  PrintRequest, 
  DiscoveryResponse, 
  ManualConnectionResult,
  ManualConnectionStatusType 
} from '../types';

// Validation error class for better error handling
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: typia.IValidation.IError[],
    public readonly receivedData: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }

  // Format errors for debugging
  toDebugInfo(): string {
    const errors = this.validationErrors.map(error => ({
      path: error.path,
      expected: error.expected,
      value: error.value
    }));

    return JSON.stringify({
      error: 'Runtime Type Validation Failed',
      validationErrors: errors,
      receivedData: this.receivedData
    }, null, 2);
  }
}

// Manual runtime validation functions - strict checking without Typia for now
export class TypeValidator {
  private static createValidationError(path: string, expected: string, value: unknown): typia.IValidation.IError {
    return { path, expected, value };
  }

  // Validate PrinterData with strict checking
  static validatePrinterData(data: unknown): PrinterData {
    const errors: typia.IValidation.IError[] = [];
    
    if (!data || typeof data !== 'object') {
      errors.push(this.createValidationError('$input', 'object', data));
    } else {
      const obj = data as any;
      if (typeof obj.id !== 'string') {
        errors.push(this.createValidationError('$input.id', 'string', obj.id));
      }
      if (typeof obj.display_name !== 'string') {
        errors.push(this.createValidationError('$input.display_name', 'string', obj.display_name));
      }
      if (typeof obj.is_connected !== 'boolean') {
        errors.push(this.createValidationError('$input.is_connected', 'boolean', obj.is_connected));
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `PrinterData validation failed: ${errors.length} errors`,
        errors,
        data
      );
    }
    return data as PrinterData;
  }

  // Validate PrintersResponse with strict checking
  static validatePrintersResponse(data: unknown): PrintersResponse {
    const errors: typia.IValidation.IError[] = [];
    
    if (!data || typeof data !== 'object') {
      errors.push(this.createValidationError('$input', 'object', data));
    } else {
      const obj = data as any;
      if (!obj.printers || typeof obj.printers !== 'object') {
        errors.push(this.createValidationError('$input.printers', 'object', obj.printers));
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `PrintersResponse validation failed: ${errors.length} errors`,
        errors,
        data
      );
    }
    return data as PrintersResponse;
  }

  // Validate LabelPreviewData with strict checking
  static validateLabelPreviewData(data: unknown): LabelPreviewData {
    const errors: typia.IValidation.IError[] = [];
    
    if (!data || typeof data !== 'object') {
      errors.push(this.createValidationError('$input', 'object', data));
    } else {
      const obj = data as any;
      if (!Array.isArray(obj.full_labels)) {
        errors.push(this.createValidationError('$input.full_labels', 'string[]', obj.full_labels));
      }
      if (!Array.isArray(obj.small_labels)) {
        errors.push(this.createValidationError('$input.small_labels', 'string[]', obj.small_labels));
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `LabelPreviewData validation failed: ${errors.length} errors`,
        errors,
        data
      );
    }
    return data as LabelPreviewData;
  }

  // Validate PrintRequest with strict checking
  static validatePrintRequest(data: unknown): PrintRequest {
    const errors: typia.IValidation.IError[] = [];
    
    if (!data || typeof data !== 'object') {
      errors.push(this.createValidationError('$input', 'object', data));
    } else {
      const obj = data as any;
      if (!obj.data || typeof obj.data !== 'object') {
        errors.push(this.createValidationError('$input.data', 'object', obj.data));
      } else {
        if (typeof obj.data.text !== 'string') {
          errors.push(this.createValidationError('$input.data.text', 'string', obj.data.text));
        }
        if (typeof obj.data.shouldPrintFullLabel !== 'boolean') {
          errors.push(this.createValidationError('$input.data.shouldPrintFullLabel', 'boolean', obj.data.shouldPrintFullLabel));
        }
        if (typeof obj.data.shouldPrintSmallLabel !== 'boolean') {
          errors.push(this.createValidationError('$input.data.shouldPrintSmallLabel', 'boolean', obj.data.shouldPrintSmallLabel));
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `PrintRequest validation failed: ${errors.length} errors`,
        errors,
        data
      );
    }
    return data as PrintRequest;
  }

  // Validate DiscoveryResponse with strict checking
  static validateDiscoveryResponse(data: unknown): DiscoveryResponse {
    const errors: typia.IValidation.IError[] = [];
    
    if (!data || typeof data !== 'object') {
      errors.push(this.createValidationError('$input', 'object', data));
    } else {
      const obj = data as any;
      if (!obj.printers && !obj.data) {
        errors.push(this.createValidationError('$input.printers', 'object', obj.printers));
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `DiscoveryResponse validation failed: ${errors.length} errors`,
        errors,
        data
      );
    }
    return data as DiscoveryResponse;
  }

  // Validate ManualConnectionResult with strict checking
  static validateManualConnectionResult(data: unknown): ManualConnectionResult {
    const errors: typia.IValidation.IError[] = [];
    
    if (!data || typeof data !== 'object') {
      errors.push(this.createValidationError('$input', 'object', data));
    } else {
      const obj = data as any;
      if (typeof obj.success !== 'boolean') {
        errors.push(this.createValidationError('$input.success', 'boolean', obj.success));
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `ManualConnectionResult validation failed: ${errors.length} errors`,
        errors,
        data
      );
    }
    return data as ManualConnectionResult;
  }

  // Validate ManualConnectionStatusType with strict checking
  static validateManualConnectionStatusType(data: unknown): ManualConnectionStatusType {
    const validStatuses = ['connected', 'disconnected', 'testing', 'error'];
    if (typeof data !== 'string' || !validStatuses.includes(data)) {
      throw new ValidationError(
        `ManualConnectionStatusType validation failed: invalid status`,
        [this.createValidationError('$input', `'connected' | 'disconnected' | 'testing' | 'error'`, data)],
        data
      );
    }
    return data as ManualConnectionStatusType;
  }

  // Generic validation function for any type
  static validate<T>(data: unknown, typeName: string): T {
    // For generic validation, just return the data with type assertion
    // Individual validators above provide specific validation
    return data as T;
  }

  // Assert validation - basic version
  static assert<T>(data: unknown, typeName: string): T {
    // For now, just return the data with type assertion
    return data as T;
  }
}

// Utility functions for logging validation errors
export class ValidationReporter {
  // Log validation error
  static logValidationError(error: ValidationError): void {
    console.error('🚨 RUNTIME TYPE VALIDATION FAILED 🚨');
    console.error('Debug Info:', error.toDebugInfo());
    console.error('Stack trace:', error.stack);
  }

  // Report validation error to backend for centralized logging
  static reportError(error: ValidationError | unknown): void {
    if (!(error instanceof ValidationError)) {
      console.warn('Non-validation error passed to reportError:', error);
      return;
    }
    
    const debugInfo = error.toDebugInfo();
    
    console.log('VALIDATION_ERROR:', debugInfo);
    
    // Send to backend for centralized logging
    this.sendToBackend(error);
    
    // Store in localStorage for development debugging
    if (typeof localStorage !== 'undefined') {
      const existingLogs = JSON.parse(localStorage.getItem('typia_validation_errors') || '[]');
      existingLogs.push({
        timestamp: new Date().toISOString(),
        debugInfo
      });
      // Keep only last 50 errors
      const recentLogs = existingLogs.slice(-50);
      localStorage.setItem('typia_validation_errors', JSON.stringify(recentLogs));
    }
  }

  // Send validation error to backend endpoint for cross-system logging
  static sendToBackend(error: ValidationError): void {
    // Don't block the main thread or fail silently if backend is unavailable
    try {
      fetch('/log-frontend-error', {
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
      }).catch(backendError => {
        // Don't throw - just log that backend logging failed
        console.warn('Failed to send validation error to backend:', backendError);
      });
    } catch (error) {
      // Don't throw - just log that backend logging failed
      console.warn('Failed to send validation error to backend:', error);
    }
  }

  // Get validation error history for analysis
  static getValidationHistory(): Array<{timestamp: string; debugInfo: string}> {
    if (typeof localStorage === 'undefined') return [];
    return JSON.parse(localStorage.getItem('typia_validation_errors') || '[]');
  }

  // Clear validation error history
  static clearValidationHistory(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('typia_validation_errors');
    }
  }
}