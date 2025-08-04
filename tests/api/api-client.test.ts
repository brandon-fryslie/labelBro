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

      const result = await LabelBroAPI.fetchLabelPreviews('Test Label');
      
      expect(result).toEqual(validLabelPreviewData);
      expect(mockFetch).toHaveBeenCalledWith('/previewLabels', expect.objectContaining({
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

      const result = await LabelBroAPI.fetchLabelPreviews('Test Label');
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('🚨 RUNTIME TYPE VALIDATION FAILED 🚨');
      expect(consoleLogSpy).toHaveBeenCalledWith('AI_FEEDBACK:', expect.stringContaining('Runtime Type Validation Failed'));
      
      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await LabelBroAPI.fetchLabelPreviews('Test Label');
      
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error fetching label previews:', expect.any(Error));
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      } as Response);

      const result = await LabelBroAPI.fetchLabelPreviews('Test Label');
      
      expect(result).toBeNull();
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
      expect(consoleLogSpy).toHaveBeenCalledWith('AI_FEEDBACK:', expect.stringContaining('Runtime Type Validation Failed'));
      
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
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidDiscoveryResponse),
      } as Response);

      const result = await LabelBroAPI.discoverPrinters();
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('🚨 RUNTIME TYPE VALIDATION FAILED 🚨');
      
      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should validate error responses', async () => {
      const errorResponse = {
        error: "Discovery failed",
        printers: {},
        discovery_methods: { mdns: false, network_scan: false, usb: false }
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(errorResponse),
      } as Response);

      await expect(LabelBroAPI.discoverPrinters()).rejects.toThrow('Discovery failed');
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
      expect(mockFetch).toHaveBeenCalledWith('/printLabels', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(validPrintRequest)
      }));
    });

    it('should throw validation error for invalid print request', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await expect(LabelBroAPI.printLabels(invalidPrintRequest as any)).rejects.toThrow(ValidationError);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('🚨 RUNTIME TYPE VALIDATION FAILED 🚨');
      expect(consoleLogSpy).toHaveBeenCalledWith('AI_FEEDBACK:', expect.stringContaining('Runtime Type Validation Failed'));
      
      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
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

      await expect(LabelBroAPI.testManualConnection('192.168.1.100')).rejects.toThrow(ValidationError);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('🚨 RUNTIME TYPE VALIDATION FAILED 🚨');
      expect(consoleLogSpy).toHaveBeenCalledWith('AI_FEEDBACK:', expect.stringContaining('Runtime Type Validation Failed'));
      
      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('AI Feedback Integration', () => {
    it('should accumulate validation errors for AI analysis', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const localStorageSetSpy = jest.spyOn(localStorage, 'setItem');

      // Trigger multiple validation errors
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(invalidPrintersResponse),
      } as Response);

      await LabelBroAPI.fetchPrinters();
      await LabelBroAPI.fetchPrinters();
      await LabelBroAPI.fetchPrinters();

      expect(localStorageSetSpy).toHaveBeenCalledTimes(3);
      expect(consoleLogSpy).toHaveBeenCalledTimes(3);

      // Verify that each call adds to the history
      const calls = localStorageSetSpy.mock.calls;
      calls.forEach(call => {
        const [key, value] = call;
        expect(key).toBe('typia_validation_errors');
        const parsedValue = JSON.parse(value);
        expect(Array.isArray(parsedValue)).toBe(true);
        expect(parsedValue.length).toBeGreaterThan(0);
      });

      consoleLogSpy.mockRestore();
    });

    it('should provide comprehensive error context for AI systems', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidLabelPreviewData),
      } as Response);

      await LabelBroAPI.fetchLabelPreviews('Test');

      const aiFeedbackCall = consoleLogSpy.mock.calls.find(call => 
        call[0] === 'AI_FEEDBACK:'
      );
      
      expect(aiFeedbackCall).toBeDefined();
      const feedback = JSON.parse(aiFeedbackCall![1]);
      
      expect(feedback).toMatchObject({
        error: 'Runtime Type Validation Failed',
        validationErrors: expect.any(Array),
        receivedData: invalidLabelPreviewData,
        suggestion: expect.stringContaining('TypeScript interfaces may not match')
      });

      consoleLogSpy.mockRestore();
    });
  });
});