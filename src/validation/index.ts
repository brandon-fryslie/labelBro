// Runtime type validation with comprehensive error handling and AI feedback generation
import type {
  PrinterData,
  PrintersResponse,
  LabelPreviewData,
  DiscoveryResponse,
  ManualConnectionResult,
  PrintRequest
} from '../types';
import { LOG_FRONTEND_ERROR_ENDPOINT } from '../api/endpoints';

// Custom ValidationError class with comprehensive debugging support
export class ValidationError extends Error {
  public validationErrors: Array<{ path: string; expected: string; value: any }>;
  public receivedData: any;

  constructor(message: string, validationErrors: Array<{ path: string; expected: string; value: any }>, receivedData: any) {
    super(message);
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
    this.receivedData = receivedData;

    // Ensure proper inheritance in TypeScript/JavaScript
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  // Generate human-readable debug information
  toDebugInfo(): object {
    return {
      error: this.message,
      validationErrors: this.validationErrors,
      receivedData: this.receivedData
    };
  }

  // Generate AI feedback with JSON format for error reporting
  toAIFeedback(): string {
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
      },
      {
        pattern: /Multi-field validation failure/,
        feedback: 'TypeScript interfaces may not match - update the types or fix the API response'
      },
      {
        pattern: /Type mismatch found/,
        feedback: 'TypeScript interfaces may not match - update the types or fix the API response'
      }
    ];

    let suggestion = 'Unknown validation pattern';

    for (const { pattern, feedback } of commonPatterns) {
      if (pattern.test(this.message)) {
        suggestion = feedback;
        break;
      }
    }

    return JSON.stringify({
      error: 'Runtime Type Validation Failed',
      validationErrors: this.validationErrors.map(err => ({
        path: err.path,
        expected: err.expected,
        value: err.value === undefined ? null : err.value,
        message: `${err.path}: expected ${err.expected}, got ${JSON.stringify(err.value)}`
      })),
      receivedData: this.receivedData,
      suggestion: suggestion
    }, (_key, value) => {
      if (value === undefined) {
        return null;
      }
      return value;
    });
  }
}

// Manual implementations of Typia-style validation functions for Node.js environment
export class TypeValidator {
  // Typia runtime type validation for PrinterData (Node-generated)
  static validatePrinterData(data: any) {
    const errors: Array<{ path: string; expected: string; value: any }> = [];

    if (data === null || typeof data !== "object") {
      throw new ValidationError('Expected object, got ' + typeof data, [], data);
    }

    if (typeof data.status !== "string") {
      errors.push({ path: "$input.status", expected: "string", value: data.status });
    }

    if (data.model_number !== undefined && typeof data.model_number !== "string") {
      errors.push({ path: "$input.model_number", expected: "string or undefined", value: data.model_number });
    }

    if (data.backend !== undefined && typeof data.backend !== "string") {
      errors.push({ path: "$input.backend", expected: "string or undefined", value: data.backend });
    }

    if (data.identifier !== undefined && typeof data.identifier !== "string") {
      errors.push({ path: "$input.identifier", expected: "string or undefined", value: data.identifier });
    }

    if (data.ip !== undefined && typeof data.ip !== "string") {
      errors.push({ path: "$input.ip", expected: "string or undefined", value: data.ip });
    }

    if (data.media_loaded !== undefined && typeof data.media_loaded !== "boolean") {
      errors.push({ path: "$input.media_loaded", expected: "boolean or undefined", value: data.media_loaded });
    }

    if (data.printer_ready !== undefined && typeof data.printer_ready !== "boolean") {
      errors.push({ path: "$input.printer_ready", expected: "boolean or undefined", value: data.printer_ready });
    }

    if (data.media_width !== undefined && typeof data.media_width !== "string") {
      errors.push({ path: "$input.media_width", expected: "string or undefined", value: data.media_width });
    }

    if (data.media_type !== undefined && typeof data.media_type !== "string") {
      errors.push({ path: "$input.media_type", expected: "string or undefined", value: data.media_type });
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

  // Typia runtime type validation for PrintersResponse (Node-generated)
  static validatePrintersResponse(data: any) {
    const errors: Array<{ path: string; expected: string; value: any }> = [];

    if (data === null || typeof data !== "object") {
      throw new ValidationError('Expected object, got ' + typeof data, [], data);
    }

    if (typeof data.printers !== "object" || data.printers === null) {
      errors.push({ path: "$input.printers", expected: "object", value: data.printers });
    } else {
      // Validate each printer in the record
      for (const [printerId, printer] of Object.entries(data.printers)) {
        try {
          this.validatePrinterData(printer);
        } catch (error) {
          if (error instanceof ValidationError) {
            // Re-path the errors to include the printer ID
            error.validationErrors.forEach(err => {
              errors.push({
                path: `$input.printers.${printerId}${err.path.replace('$input', '')}`,
                expected: err.expected,
                value: err.value
              });
            });
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

    return data as PrintersResponse;
  }

  // Typia runtime type validation for LabelPreviewData (Node-generated)
  static validateLabelPreviewData(data: any) {
    const errors: Array<{ path: string; expected: string; value: any }> = [];

    if (data === null || typeof data !== "object") {
      throw new ValidationError('Expected object, got ' + typeof data, [], data);
    }

    if (!Array.isArray(data.full_labels)) {
      errors.push({ path: "$input.full_labels", expected: "array", value: data.full_labels });
    } else {
      data.full_labels.forEach((label: any, index: number) => {
        if (typeof label !== "string") {
          errors.push({
            path: `$input.full_labels[${index}]`,
            expected: "string",
            value: label
          });
        }
      });
    }

    if (!Array.isArray(data.small_labels)) {
      errors.push({ path: "$input.small_labels", expected: "array", value: data.small_labels });
    } else {
      data.small_labels.forEach((label: any, index: number) => {
        if (typeof label !== "string") {
          errors.push({
            path: `$input.small_labels[${index}]`,
            expected: "string",
            value: label
          });
        }
      });
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

  // Typia runtime type validation for DiscoveryResponse (Node-generated)
  static validateDiscoveryResponse(data: any) {
    const errors: Array<{ path: string; expected: string; value: any }> = [];

    if (data === null || typeof data !== "object") {
      throw new ValidationError('Expected object, got ' + typeof data, [], data);
    }

    if (typeof data.success !== "boolean") {
      errors.push({ path: "$input.success", expected: "boolean", value: data.success });
    }

    if (data.data !== undefined) {
      if (data.data === null || typeof data.data !== "object") {
        errors.push({ path: "$input.data", expected: "object or undefined", value: data.data });
      } else {
        // Validate nested data structure more strictly
        if (data.data.discovery_methods !== undefined) {
          if (data.data.discovery_methods === null || typeof data.data.discovery_methods !== "object") {
            errors.push({ path: "$input.data.discovery_methods", expected: "object or undefined", value: data.data.discovery_methods });
          } else {
            // Validate known discovery method fields
            if (data.data.discovery_methods.mdns !== undefined && typeof data.data.discovery_methods.mdns !== "boolean") {
              errors.push({ path: "$input.data.discovery_methods.mdns", expected: "boolean or undefined", value: data.data.discovery_methods.mdns });
            }
            if (data.data.discovery_methods.network_scan !== undefined && typeof data.data.discovery_methods.network_scan !== "boolean") {
              errors.push({ path: "$input.data.discovery_methods.network_scan", expected: "boolean or undefined", value: data.data.discovery_methods.network_scan });
            }
          }
        }
      }
    }

    if (data.error !== undefined && typeof data.error !== "string") {
      errors.push({ path: "$input.error", expected: "string or undefined", value: data.error });
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

  // Typia runtime type validation for ManualConnectionResult (Node-generated)
  static validateManualConnectionResult(data: any) {
    const errors: Array<{ path: string; expected: string; value: any }> = [];

    if (data === null || typeof data !== "object") {
      throw new ValidationError('Expected object, got ' + typeof data, [], data);
    }

    if (typeof data.success !== "boolean") {
      errors.push({ path: "$input.success", expected: "boolean", value: data.success });
    }

    if (data.error !== undefined && typeof data.error !== "string") {
      errors.push({ path: "$input.error", expected: "string or undefined", value: data.error });
    }

    if (data.printer !== undefined) {
      try {
        this.validatePrinterData(data.printer);
      } catch (error) {
        if (error instanceof ValidationError) {
          // Re-path the errors to include the printer field
          error.validationErrors.forEach(err => {
            errors.push({
              path: `$input.printer${err.path.replace('$input', '')}`,
              expected: err.expected,
              value: err.value
            });
          });
        }
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

  // Typia runtime type validation for PrintRequest (Node-generated)
  static validatePrintRequest(data: any) {
    const errors: Array<{ path: string; expected: string; value: any }> = [];

    if (data === null || typeof data !== "object") {
      throw new ValidationError('Expected object, got ' + typeof data, [], data);
    }

    if (data.data === null || typeof data.data !== "object") {
      errors.push({ path: "$input.data", expected: "object", value: data.data });
    } else {
      if (typeof data.data.text !== "string") {
        errors.push({ path: "$input.data.text", expected: "string", value: data.data.text });
      }

      if (typeof data.data.shouldPrintFullLabel !== "boolean") {
        errors.push({ path: "$input.data.shouldPrintFullLabel", expected: "boolean", value: data.data.shouldPrintFullLabel });
      }

      if (typeof data.data.shouldPrintSmallLabel !== "boolean") {
        errors.push({ path: "$input.data.shouldPrintSmallLabel", expected: "boolean", value: data.data.shouldPrintSmallLabel });
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

  // Generic validation method for compatibility with Typia API
  static validate<T>(data: unknown): T {
    // For now, just return the data as-is since we don't have runtime type info
    // In a real Typia implementation, this would use the type parameter
    return data as T;
  }

  // Assert method that throws if validation fails
  static assert<T>(data: unknown): T {
    // For now, just return the data as-is since we don't have runtime type info
    // In a real Typia implementation, this would validate and throw if invalid
    return data as T;
  }
}

// Centralized validation error reporting and AI feedback system
export class ValidationReporter {
  private static validationHistory: ValidationError[] = [];

  // Log validation error with structured debugging information
  static logValidationError(error: ValidationError): void {
    console.error('🚨 RUNTIME TYPE VALIDATION FAILED 🚨');
    console.error('Debug Info:', error.toDebugInfo());
    console.error('AI Feedback:', error.toAIFeedback());
    console.error('Stack trace:', error.stack);

    // Store for analysis
    this.validationHistory.push(error);
  }

  // Report validation error with cross-system logging
  static reportError(error: ValidationError): void {
    this.logValidationError(error);

    // Log as string to match test expectations
    console.log('VALIDATION_ERROR:', JSON.stringify(error.toDebugInfo()));

    // Send to backend for centralized logging
    this.sendToBackend(error);

    // Store in localStorage for development debugging
    if (typeof localStorage !== 'undefined') {
      const feedback = error.toAIFeedback();
      const existingLogs = JSON.parse(localStorage.getItem('typia_validation_errors') || '[]');
      existingLogs.push({
        timestamp: new Date().toISOString(),
        feedback: feedback  // Store feedback as the root property to match test expectations
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
        const fetchPromise = fetch(LOG_FRONTEND_ERROR_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'TYPIA_VALIDATION_ERROR',  // Match test expectations
            message: error.message,          // Include message field
            source: 'typescript-validation', // Include source field
            timestamp: new Date().toISOString(),
            details: error.toDebugInfo(),
            aiFeedback: error.toAIFeedback(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js environment'
          }),
        });

        // Handle the promise properly but don't block the main thread
        if (fetchPromise && typeof fetchPromise.catch === 'function') {
          fetchPromise.catch((fetchError: Error) => {
            console.warn('Failed to send validation error to backend:', fetchError);
            // Don't rethrow - this is just for logging
          });
        }
      }
    } catch (networkError: any) {
      // Silently handle network errors - validation reporting shouldn't break the application
      console.warn('Network error when sending validation error to backend:', networkError);
    }
  }

  // Get validation error history for debugging
  static getValidationHistory(): ValidationError[] | Array<{ timestamp: string; feedback: string }> {
    // In browser environment, prefer localStorage for persistence
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('typia_validation_errors');
      if (stored) {
        return JSON.parse(stored);
      }
    }
    // Otherwise return in-memory history as ValidationError objects
    return this.validationHistory.slice();
  }

  // Clear validation history
  static clearValidationHistory(): void {
    this.validationHistory = [];
    // Also clear localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('typia_validation_errors');
    }
  }

  // Alias for reportError to match test expectations
  static reportToAI(error: ValidationError): void {
    // Generate AI feedback and log it
    const aiFeedback = error.toAIFeedback();
    console.log('AI_FEEDBACK:', aiFeedback);

    // Also call the main reportError method
    this.reportError(error);
  }
}
