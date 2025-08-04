// Comprehensive Typia validation tests for AI feedback
import { TypeValidator, ValidationError, ValidationReporter } from '../../src/validation';
import {
  validPrinterData,
  invalidPrinterData,
  validPrintersResponse,
  invalidPrintersResponse,
  validLabelPreviewData,
  invalidLabelPreviewData,
  validDiscoveryResponse,
  invalidDiscoveryResponse,
  validManualConnectionResult,
  invalidManualConnectionResult,
  validPrintRequest,
  invalidPrintRequest,
  edgeCaseResponses
} from '../fixtures/api-responses';

describe('Typia Runtime Type Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ValidationReporter.clearValidationHistory();
  });

  describe('PrinterData Validation', () => {
    it('should validate correct PrinterData', () => {
      expect(() => {
        const result = TypeValidator.validatePrinterData(validPrinterData);
        expect(result).toEqual(validPrinterData);
      }).not.toThrow();
    });

    it('should throw ValidationError for invalid PrinterData', () => {
      expect(() => {
        TypeValidator.validatePrinterData(invalidPrinterData);
      }).toThrow(ValidationError);
    });

    it('should provide detailed error information for AI feedback', () => {
      try {
        TypeValidator.validatePrinterData(invalidPrinterData);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        
        expect(validationError.validationErrors.length).toBeGreaterThan(0);
        expect(validationError.receivedData).toEqual(invalidPrinterData);
        
        const aiFeedback = validationError.toAIFeedback();
        expect(aiFeedback).toContain('Runtime Type Validation Failed');
        expect(aiFeedback).toContain('validationErrors');
        expect(aiFeedback).toContain('suggestion');
      }
    });

    it('should handle edge cases', () => {
      const edgeCases = [
        null,
        undefined,
        "string instead of object",
        42,
        [],
        { id: "test" }, // Missing required fields
      ];

      edgeCases.forEach((testCase, index) => {
        expect(() => {
          TypeValidator.validatePrinterData(testCase);
        }).toThrow(ValidationError, `Edge case ${index} should fail validation`);
      });
    });
  });

  describe('PrintersResponse Validation', () => {
    it('should validate correct PrintersResponse', () => {
      expect(() => {
        const result = TypeValidator.validatePrintersResponse(validPrintersResponse);
        expect(result).toEqual(validPrintersResponse);
      }).not.toThrow();
    });

    it('should throw ValidationError for invalid PrintersResponse', () => {
      expect(() => {
        TypeValidator.validatePrintersResponse(invalidPrintersResponse);
      }).toThrow(ValidationError);
    });

    it('should handle empty printers object', () => {
      expect(() => {
        TypeValidator.validatePrintersResponse(edgeCaseResponses.emptyPrintersResponse);
      }).not.toThrow();
    });
  });

  describe('LabelPreviewData Validation', () => {
    it('should validate correct LabelPreviewData', () => {
      expect(() => {
        const result = TypeValidator.validateLabelPreviewData(validLabelPreviewData);
        expect(result).toEqual(validLabelPreviewData);
      }).not.toThrow();
    });

    it('should throw ValidationError for invalid LabelPreviewData', () => {
      expect(() => {
        TypeValidator.validateLabelPreviewData(invalidLabelPreviewData);
      }).toThrow(ValidationError);
    });

    it('should validate LabelPreviewData with error field', () => {
      const dataWithError = {
        full_labels: [],
        small_labels: [],
        error: "Preview generation failed"
      };

      expect(() => {
        const result = TypeValidator.validateLabelPreviewData(dataWithError);
        expect(result).toEqual(dataWithError);
      }).not.toThrow();
    });
  });

  describe('DiscoveryResponse Validation', () => {
    it('should validate correct DiscoveryResponse', () => {
      expect(() => {
        const result = TypeValidator.validateDiscoveryResponse(validDiscoveryResponse);
        expect(result).toEqual(validDiscoveryResponse);
      }).not.toThrow();
    });

    it('should throw ValidationError for invalid DiscoveryResponse', () => {
      expect(() => {
        TypeValidator.validateDiscoveryResponse(invalidDiscoveryResponse);
      }).toThrow(ValidationError);
    });
  });

  describe('ManualConnectionResult Validation', () => {
    it('should validate correct ManualConnectionResult', () => {
      expect(() => {
        const result = TypeValidator.validateManualConnectionResult(validManualConnectionResult);
        expect(result).toEqual(validManualConnectionResult);
      }).not.toThrow();
    });

    it('should throw ValidationError for invalid ManualConnectionResult', () => {
      expect(() => {
        TypeValidator.validateManualConnectionResult(invalidManualConnectionResult);
      }).toThrow(ValidationError);
    });
  });

  describe('PrintRequest Validation', () => {
    it('should validate correct PrintRequest', () => {
      expect(() => {
        const result = TypeValidator.validatePrintRequest(validPrintRequest);
        expect(result).toEqual(validPrintRequest);
      }).not.toThrow();
    });

    it('should throw ValidationError for invalid PrintRequest', () => {
      expect(() => {
        TypeValidator.validatePrintRequest(invalidPrintRequest);
      }).toThrow(ValidationError);
    });
  });

  describe('Generic Validation', () => {
    it('should work with generic validate method', () => {
      expect(() => {
        const result = TypeValidator.validate<typeof validPrinterData>(validPrinterData, 'TestPrinterData');
        expect(result).toEqual(validPrinterData);
      }).not.toThrow();
    });

    it('should work with assert method', () => {
      expect(() => {
        const result = TypeValidator.assert<typeof validPrinterData>(validPrinterData, 'TestPrinterData');
        expect(result).toEqual(validPrinterData);
      }).not.toThrow();
    });
  });

  describe('ValidationReporter', () => {
    it('should log validation errors with AI feedback', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      try {
        TypeValidator.validatePrinterData(invalidPrinterData);
      } catch (error) {
        if (error instanceof ValidationError) {
          ValidationReporter.logValidationError(error);
          
          expect(consoleSpy).toHaveBeenCalledWith('🚨 RUNTIME TYPE VALIDATION FAILED 🚨');
          expect(consoleSpy).toHaveBeenCalledWith('AI Feedback:', expect.stringContaining('Runtime Type Validation Failed'));
        }
      }
      
      consoleSpy.mockRestore();
    });

    it('should report to AI systems', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const localStorageSetSpy = jest.spyOn(localStorage, 'setItem');
      
      try {
        TypeValidator.validatePrinterData(invalidPrinterData);
      } catch (error) {
        if (error instanceof ValidationError) {
          ValidationReporter.reportToAI(error);
          
          expect(consoleLogSpy).toHaveBeenCalledWith('AI_FEEDBACK:', expect.stringContaining('Runtime Type Validation Failed'));
          expect(localStorageSetSpy).toHaveBeenCalledWith('typia_validation_errors', expect.any(String));
        }
      }
      
      consoleLogSpy.mockRestore();
    });

    it('should manage validation history', () => {
      const mockHistory = [
        { timestamp: '2024-01-01T00:00:00.000Z', feedback: 'test error 1' },
        { timestamp: '2024-01-01T00:01:00.000Z', feedback: 'test error 2' }
      ];
      
      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(mockHistory));
      
      const history = ValidationReporter.getValidationHistory();
      expect(history).toEqual(mockHistory);
      
      ValidationReporter.clearValidationHistory();
      expect(localStorage.removeItem).toHaveBeenCalledWith('typia_validation_errors');
    });
  });

  describe('AI Feedback Integration', () => {
    it('should generate structured feedback for AI systems', () => {
      try {
        TypeValidator.validatePrinterData(invalidPrinterData);
      } catch (error) {
        if (error instanceof ValidationError) {
          const feedback = error.toAIFeedback();
          const parsedFeedback = JSON.parse(feedback);
          
          expect(parsedFeedback).toHaveProperty('error', 'Runtime Type Validation Failed');
          expect(parsedFeedback).toHaveProperty('validationErrors');
          expect(parsedFeedback).toHaveProperty('receivedData');
          expect(parsedFeedback).toHaveProperty('suggestion');
          
          expect(parsedFeedback.validationErrors).toBeInstanceOf(Array);
          expect(parsedFeedback.validationErrors.length).toBeGreaterThan(0);
          
          parsedFeedback.validationErrors.forEach((validationError: any) => {
            expect(validationError).toHaveProperty('path');
            expect(validationError).toHaveProperty('expected');
            expect(validationError).toHaveProperty('value');
            expect(validationError).toHaveProperty('message');
          });
        }
      }
    });

    it('should provide actionable suggestions for type mismatches', () => {
      const testCases = [
        { data: { is_connected: "true" }, field: 'is_connected' },
        { data: { id: 123 }, field: 'id' },
        { data: { printers: "invalid" }, field: 'printers' }
      ];

      testCases.forEach(({ data, field }) => {
        try {
          TypeValidator.validate(data, 'TestType');
        } catch (error) {
          if (error instanceof ValidationError) {
            const feedback = error.toAIFeedback();
            expect(feedback).toContain('TypeScript interfaces may not match');
            expect(feedback).toContain('update the types or fix the API response');
          }
        }
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large objects efficiently', () => {
      const largeObject = {
        printers: {}
      };
      
      // Create 1000 printers
      for (let i = 0; i < 1000; i++) {
        largeObject.printers[`printer_${i}`] = {
          ...validPrinterData,
          id: `printer_${i}`
        };
      }

      const startTime = performance.now();
      expect(() => {
        TypeValidator.validatePrintersResponse(largeObject);
      }).not.toThrow();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should handle deeply nested invalid data', () => {
      const deeplyNested = {
        printers: {
          printer1: {
            id: "printer1",
            display_name: "Test",
            is_connected: {
              deeply: {
                nested: {
                  invalid: "structure"
                }
              }
            }
          }
        }
      };

      expect(() => {
        TypeValidator.validatePrintersResponse(deeplyNested);
      }).toThrow(ValidationError);
    });

    it('should handle circular references gracefully', () => {
      const circularObject: any = {
        id: "test",
        display_name: "Test",
        is_connected: true
      };
      circularObject.self = circularObject;

      expect(() => {
        TypeValidator.validatePrinterData(circularObject);
      }).toThrow(); // May throw due to circular reference or validation failure
    });
  });
});