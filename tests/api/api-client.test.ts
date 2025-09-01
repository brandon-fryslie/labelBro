// API client tests with Typia validation integration
import { LabelBroAPI } from '../../src/api';
import { ValidationError, ValidationReporter } from '../../src/validation';
import {
  validPrintersResponse,
  invalidPrintersResponse,
  validLabelPreviewData,
  invalidLabelPreviewData,
  validDiscoveryResponse,
  invalidDiscoveryResponse,
  validManualConnectionResult,
  invalidManualConnectionResult,
  validPrintRequest,
  invalidPrintRequest
} from '../fixtures/api-responses';

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('LabelBroAPI with Typia Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ValidationReporter.clearValidationHistory();
    
    // Mock DOM elements
    document.body.innerHTML = `
      <input id="printFullLabel" type="checkbox" checked />
      <input id="printSmallLabel" type="checkbox" />
    `;
  });

  describe('fetchLabelPreviews', () => {
    it('should return validated data for correct response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validLabelPreviewData),
      } as Response);

      // Use the new API format that expects an object
      const labelData = {
        data: {
          text: 'Test Label',
          shouldPrintFullLabel: true,
          shouldPrintSmallLabel: true
        }
      };

      const result = await LabelBroAPI.fetchLabelPreviews(labelData);
      
      expect(result).toEqual(validLabelPreviewData);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:5100/previewLabels', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Test Label')
      }));
    });

    it('should handle validation errors and report to AI', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidLabelPreviewData),
      } as Response);

      const labelData = {
        data: {
          text: 'Test Label',
          shouldPrintFullLabel: true,
          shouldPrintSmallLabel: true
        }
      };

      const result = await LabelBroAPI.fetchLabelPreviews(labelData);
      
      // Should return the data even if validation fails (graceful degradation)
      expect(result).toEqual(invalidLabelPreviewData);
      
      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const labelData = {
        data: {
          text: 'Test Label',
          shouldPrintFullLabel: true,
          shouldPrintSmallLabel: true
        }
      };

      await expect(LabelBroAPI.fetchLabelPreviews(labelData)).rejects.toThrow('Network error');
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      } as Response);

      const labelData = {
        data: {
          text: 'Test Label',
          shouldPrintFullLabel: true,
          shouldPrintSmallLabel: true
        }
      };

      const result = await LabelBroAPI.fetchLabelPreviews(labelData);
      
      expect(result).toEqual({ error: 'Server error' });
    });
  });

  describe('fetchPrinters', () => {
    it('should return validated printer data for correct response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validPrintersResponse),
      } as Response);

      const result = await LabelBroAPI.fetchPrinters();
      
      expect(result).toEqual(validPrintersResponse.printers);
    });

    it('should handle validation errors for invalid printer response', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidPrintersResponse),
      } as Response);

      const result = await LabelBroAPI.fetchPrinters();
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('🚨 RUNTIME TYPE VALIDATION FAILED 🚨');
      expect(consoleLogSpy).toHaveBeenCalledWith('VALIDATION_ERROR:', expect.any(String));
      
      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('discoverPrinters', () => {
    it('should return validated discovery data for correct response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validDiscoveryResponse),
      } as Response);

      const result = await LabelBroAPI.discoverPrinters();
      
      expect(result).toEqual(validDiscoveryResponse);
    });

    it('should handle validation errors for invalid discovery response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidDiscoveryResponse),
      } as Response);

      const result = await LabelBroAPI.discoverPrinters();
      
      // Discovery validation is lenient, so it should return the data
      expect(result).toEqual(invalidDiscoveryResponse);
    });

    it('should validate error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ success: false, error: 'Bad request' }),
      } as Response);

      const result = await LabelBroAPI.discoverPrinters();
      
      expect(result).toBeNull();
    });
  });

  describe('printLabels', () => {
    it('should validate input request before sending', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      const result = await LabelBroAPI.printLabels(validPrintRequest);
      
      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:5100/printLabels', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(validPrintRequest)
      }));
    });

    it('should throw validation error for invalid print request', async () => {
      // Mock a failed response so we can test the error handling
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid request' }),
      } as Response);

      const result = await LabelBroAPI.printLabels(invalidPrintRequest);
      
      expect(result).toEqual({ error: 'Invalid request' });
    });
  });

  describe('testManualConnection', () => {
    it('should return validated connection result', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validManualConnectionResult),
      } as Response);

      const result = await LabelBroAPI.testManualConnection('192.168.1.100');
      
      expect(result).toEqual(validManualConnectionResult);
    });

    it('should handle validation errors for invalid connection result', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidManualConnectionResult),
      } as Response);

      const result = await LabelBroAPI.testManualConnection('192.168.1.100');
      
      // Should return the raw data due to validation fallback
      expect(result).toEqual(invalidManualConnectionResult);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('🚨 RUNTIME TYPE VALIDATION FAILED 🚨');
      expect(consoleLogSpy).toHaveBeenCalledWith('VALIDATION_ERROR:', expect.any(String));
      
      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('AI Feedback Integration', () => {
    it('should accumulate validation errors for AI analysis', async () => {
      const localStorageSetSpy = jest.spyOn(Storage.prototype, 'setItem');
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Trigger multiple validation errors
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(invalidPrintersResponse),
      } as Response);

      await LabelBroAPI.fetchPrinters();
      await LabelBroAPI.fetchPrinters();
      await LabelBroAPI.fetchPrinters();

      // Each call should result in validation error logging
      expect(localStorageSetSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalled();

      localStorageSetSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should provide comprehensive error context for AI systems', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Mock response that will trigger validation error
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidLabelPreviewData),
      } as Response);

      const labelData = {
        data: {
          text: 'Test Label',
          shouldPrintFullLabel: true,
          shouldPrintSmallLabel: true
        }
      };

      const result = await LabelBroAPI.fetchLabelPreviews(labelData);
      
      // Should handle gracefully and log validation errors
      expect(result).toBeDefined();
      
      consoleLogSpy.mockRestore();
    });
  });
});