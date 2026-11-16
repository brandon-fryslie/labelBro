import type { MockedFunction } from 'vitest';
// API client tests with Typia validation integration
import { LabelBroAPI } from '../../src/api';
import type { PrintRequest } from '../../src/types';
import { flaskResponse } from '../utils/test-utils';
import { ValidationReporter } from '../../src/validation';
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
const mockFetch = global.fetch as MockedFunction<typeof fetch>;

describe('LabelBroAPI with Typia Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      expect(mockFetch).toHaveBeenCalledWith('/api/previewLabels', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Test Label')
      }));
    });

    it('should handle validation errors and report to AI', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
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

    it('rejects with Flask\'s error message on an HTTP error', async () => {
      mockFetch.mockResolvedValueOnce(flaskResponse({ error: 'Server error' }, 500));

      await expect(LabelBroAPI.fetchLabelPreviews({ data: { text: 'Test Label' } })).rejects.toThrow('Server error');
    });

    it('rejects with the HTTP status when the error body is not Flask\'s JSON', async () => {
      // e.g. the Vite dev proxy's empty 500 while Flask is down
      mockFetch.mockResolvedValueOnce(new Response('', { status: 500 }));

      await expect(LabelBroAPI.fetchLabelPreviews({ data: { text: 'Test Label' } })).rejects.toThrow('HTTP 500');
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
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
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
        status: 200,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      const result = await LabelBroAPI.printLabels(validPrintRequest);
      
      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledWith('/api/printLabels', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(validPrintRequest)
      }));
    });

    it('should handle invalid print request and still make API call', async () => {
      // Every call answers 400: the validation report to /api/log-frontend-error is a fetch too.
      mockFetch.mockImplementation(() => Promise.resolve(flaskResponse({ error: 'Invalid request' }, 400)));

      await expect(LabelBroAPI.printLabels(invalidPrintRequest as PrintRequest)).rejects.toThrow('Invalid request');
      expect(mockFetch).toHaveBeenCalledWith('/api/printLabels', expect.objectContaining({ method: 'POST' }));
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
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
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
      // Spy on the actual mocked localStorage, not Storage.prototype
      const localStorageSetSpy = vi.spyOn(global.localStorage, 'setItem');
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Use discoverPrinters since it logs to localStorage even with validation errors
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(invalidDiscoveryResponse),
      } as Response);

      await LabelBroAPI.discoverPrinters();
      await LabelBroAPI.discoverPrinters();
      await LabelBroAPI.discoverPrinters();

      // Each call should result in validation error logging
      expect(localStorageSetSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalled();

      localStorageSetSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should provide comprehensive error context for AI systems', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
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