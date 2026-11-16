import type { Mock, MockedFunction } from 'vitest';
// Integration tests for cross-system error logging (frontend -> backend)
import { ValidationError, ValidationReporter } from '../../src/validation';
import { TypeScriptErrorReporter } from '../../src/utils/error-reporter';

// Mock fetch for testing
global.fetch = vi.fn();

describe('Cross-System Error Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'logged' })
    } as Response);
  });

  describe('Typia Validation Error Reporting', () => {
    it('should send validation errors to backend endpoint', async () => {
      const mockValidationError = new ValidationError(
        'PrinterData validation failed: 3 errors',
        [
          { path: '$input.id', expected: 'string', value: 123 },
          { path: '$input.display_name', expected: 'string', value: null },
          { path: '$input.is_connected', expected: 'boolean', value: 'yes' }
        ],
        { id: 123, display_name: null, is_connected: 'yes' }
      );

      ValidationReporter.sendToBackend(mockValidationError);

      // Allow async operation to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify the request was made with correct structure
      expect(fetch).toHaveBeenCalledWith('/log-frontend-error', expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }));

      // Parse and verify the request body structure
      const callArgs = (fetch as MockedFunction<typeof fetch>).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string);
      
      expect(requestBody).toMatchObject({
        type: 'TYPIA_VALIDATION_ERROR',
        message: 'PrinterData validation failed: 3 errors',
        source: 'typescript-validation',
        details: {
          validationErrors: [
            { path: '$input.id', expected: 'string', value: 123 },
            { path: '$input.display_name', expected: 'string', value: null },
            { path: '$input.is_connected', expected: 'boolean', value: 'yes' }
          ],
          receivedData: { id: 123, display_name: null, is_connected: 'yes' }
        }
      });
      
      expect(requestBody.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle backend unavailable gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();
      (fetch as MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network error')
      );

      const mockValidationError = new ValidationError(
        'Test error',
        [],
        {}
      );

      ValidationReporter.sendToBackend(mockValidationError);

      // Allow async operation to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send validation error to backend:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should maintain existing console logging behavior', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
      
      const mockValidationError = new ValidationError(
        'Test validation error',
        [
          { path: '$input.test', expected: 'string', value: 123 }
        ],
        { test: 123 }
      );

      ValidationReporter.reportToAI(mockValidationError);

      expect(consoleSpy).toHaveBeenCalledWith(
        'AI_FEEDBACK:',
        expect.stringContaining('Runtime Type Validation Failed')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('JavaScript Runtime Error Reporting', () => {
    it('should send runtime errors to backend endpoint', async () => {
      const testError = new Error('Test runtime error');
      testError.stack = 'Error: Test runtime error\n    at test.js:1:1';

      await TypeScriptErrorReporter.reportRuntimeError(testError, 'test-context');

      expect(fetch).toHaveBeenCalledWith('/log-frontend-error', expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }));
      
      const callArgs = (fetch as MockedFunction<typeof fetch>).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string);
      
      expect(requestBody).toMatchObject({
        type: 'JAVASCRIPT_RUNTIME_ERROR',
        message: 'Test runtime error',
        source: 'javascript-runtime',
        details: {
          stack: 'Error: Test runtime error\n    at test.js:1:1',
          name: 'Error',
          context: 'test-context',
          errorType: 'runtime'
        }
      });
      
      expect(requestBody.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle compilation errors with file location', async () => {
      const compilationError = {
        message: 'Type "number" is not assignable to type "string"',
        file: 'src/test.ts',
        line: 42,
        column: 15,
        code: 'TS2322'
      };

      await TypeScriptErrorReporter.reportCompilationError(compilationError);

      expect(fetch).toHaveBeenCalledWith('/log-frontend-error', expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }));
      
      const callArgs = (fetch as MockedFunction<typeof fetch>).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string);
      
      expect(requestBody).toMatchObject({
        type: 'TYPESCRIPT_COMPILATION_ERROR',
        message: 'Type "number" is not assignable to type "string"',
        source: 'typescript-compiler',
        details: {
          file: 'src/test.ts',
          line: 42,
          column: 15,
          code: 'TS2322',
          errorType: 'compilation'
        }
      });
      
      expect(requestBody.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Error Data Format Validation', () => {
    it('should send properly formatted validation error data', async () => {
      const mockError = new ValidationError(
        'Complex validation error',
        [
          { path: '$input.printers.printer1.id', expected: 'string', value: undefined },
          { path: '$input.printers.printer2.is_connected', expected: 'boolean', value: 'true' }
        ],
        {
          printers: {
            printer1: { id: undefined, display_name: 'Test' },
            printer2: { id: 'test', is_connected: 'true' }
          }
        }
      );

      ValidationReporter.sendToBackend(mockError);
      await new Promise(resolve => setTimeout(resolve, 10));

      const callArgs = (fetch as MockedFunction<typeof fetch>).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string);

      expect(requestBody).toMatchObject({
        type: 'TYPIA_VALIDATION_ERROR',
        message: 'Complex validation error',
        source: 'typescript-validation',
        details: {
          validationErrors: expect.arrayContaining([
            expect.objectContaining({
              path: expect.any(String),
              expected: expect.any(String),
              value: expect.anything()
            })
          ]),
          receivedData: expect.any(Object)
        }
      });

      expect(requestBody.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should preserve all validation error details for AI feedback', () => {
      const mockError = new ValidationError(
        'Multi-field validation failure',
        [
          { path: '$input.id', expected: 'string', value: 42 },
          { path: '$input.tags[0]', expected: 'string', value: null },
          { path: '$input.metadata.created', expected: 'Date', value: 'invalid-date' }
        ],
        {
          id: 42,
          tags: [null, 'valid-tag'],
          metadata: { created: 'invalid-date', updated: new Date() }
        }
      );

      const feedback = mockError.toAIFeedback();
      const parsedFeedback = JSON.parse(feedback);

      expect(parsedFeedback).toMatchObject({
        error: 'Runtime Type Validation Failed',
        validationErrors: [
          { path: '$input.id', expected: 'string', value: 42 },
          { path: '$input.tags[0]', expected: 'string', value: null },
          { path: '$input.metadata.created', expected: 'Date', value: 'invalid-date' }
        ],
        receivedData: expect.objectContaining({
          id: 42,
          tags: [null, 'valid-tag']
        }),
        suggestion: expect.stringContaining('TypeScript interfaces may not match')
      });
    });
  });

  describe('LocalStorage Integration', () => {
    beforeEach(() => {
      // Mock localStorage
      const localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn()
      };
      Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    });

    it('should store validation errors in localStorage for debugging', () => {
      const mockError = new ValidationError('Test error', [], {});
      
      (localStorage.getItem as Mock).mockReturnValue('[]');

      ValidationReporter.reportToAI(mockError);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'typia_validation_errors',
        expect.stringContaining('"feedback"')
      );
    });

    it('should limit localStorage to 50 most recent errors', () => {
      const mockExistingErrors = Array(49).fill(null).map((_, i) => ({
        timestamp: `2024-01-${i.toString().padStart(2, '0')}T00:00:00.000Z`,
        feedback: JSON.stringify({ message: `Error ${i}` })
      }));

      (localStorage.getItem as Mock).mockReturnValue(JSON.stringify(mockExistingErrors));

      const mockError = new ValidationError('Final validation error', [], {});
      ValidationReporter.reportToAI(mockError);

      expect(localStorage.setItem).toHaveBeenCalled();
      const lastCall = (localStorage.setItem as Mock).mock.calls.slice(-1)[0];
      const storedData = JSON.parse(lastCall[1]);
      
      // Should maintain 50 item limit
      expect(storedData).toHaveLength(50);
      
      // Should contain the new error
      const lastEntry = storedData[storedData.length - 1];
      expect(lastEntry.feedback).toContain('Runtime Type Validation Failed');
      
      // Should still contain one of the original errors (not the very first, as it gets rotated out)
      const hasOriginalError = storedData.some(entry => 
        entry.feedback.includes('Error ') && !entry.feedback.includes('Runtime Type Validation Failed')
      );
      expect(hasOriginalError).toBe(true);
    });
  });
});