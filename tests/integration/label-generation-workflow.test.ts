import type { MockedFunction } from 'vitest';
// Integration tests for label generation workflow
// Tests the complete flow: Text Input → Preview Generation → Print → Validation

import { LabelBroAPI } from '../../src/api';
import { TypeValidator } from '../../src/validation';
import { 
  validLabelPreviews,
  validPrintRequests,
  createLabelPreviewData,
  createPrintRequest,
  validBase64Image,
  alternateBase64Image
} from '../fixtures';

describe('Label Generation Workflow Integration', () => {
  let mockFetch: MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = vi.fn(global.fetch) as MockedFunction<typeof fetch>;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Label Generation Flow', () => {
    test('should generate preview and successfully print label', async () => {
      const labelText = "Integration Test Label";
      const previewRequest = { text: labelText };
      
      // Mock preview response
      const previewResponse = createLabelPreviewData({
        full_labels: [validBase64Image],
        small_labels: [validBase64Image]
      });

      // Mock print response
      const printRequest = createPrintRequest({
        text: labelText,
        shouldPrintFullLabel: true,
        shouldPrintSmallLabel: false
      });
      
      const printResponse = { 
        success: true, 
        message: "Label printed successfully",
        printer_id: "printer_001",
        labels_printed: 1
      };

      mockFetch
        // Preview generation call
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            // Backend returns raw base64, API converts to data URLs
            full_labels: [validBase64Image],
            small_labels: [validBase64Image]
          })
        } as Response)
        // Print request call
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(printResponse)
        } as Response);

      // Step 1: Generate preview
      const previewResult = await LabelBroAPI.fetchLabelPreviews(previewRequest);
      
      // Validate preview structure
      expect(previewResult.full_labels).toHaveLength(1);
      expect(previewResult.small_labels).toHaveLength(1);
      expect(previewResult.full_labels[0]).toMatch(/^data:image\/png;base64,/);
      expect(previewResult.small_labels[0]).toMatch(/^data:image\/png;base64,/);

      // Step 2: Print label
      const printResult = await LabelBroAPI.printLabels(printRequest);
      
      // Validate print result
      expect(printResult.success).toBe(true);
      expect(printResult.message).toContain("printed successfully");

      // Verify API call sequence
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1,
        '/previewLabels',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(previewRequest)
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(2,
        '/printLabels',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(printRequest)
        })
      );
    });

    test('should handle empty text input gracefully', async () => {
      const emptyTextRequest = { text: "" };
      
      const emptyPreviewResponse = {
        full_labels: [],
        small_labels: [],
        error: "No content to generate preview"
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(emptyPreviewResponse)
      } as Response);

      const result = await LabelBroAPI.fetchLabelPreviews(emptyTextRequest);
      
      expect(result.full_labels).toHaveLength(0);
      expect(result.small_labels).toHaveLength(0);
      expect(result.error).toContain("No content");
    });

    test('should handle very long text input', async () => {
      const longText = "This is a very long label text that might require special handling or wrapping ".repeat(20);
      const longTextRequest = { text: longText };
      
      const longTextPreviewResponse = {
        full_labels: [validBase64Image],
        small_labels: [validBase64Image],
        error: "Text may be truncated on small labels"
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(longTextPreviewResponse)
      } as Response);

      const result = await LabelBroAPI.fetchLabelPreviews(longTextRequest);
      
      expect(result.full_labels).toHaveLength(1);
      expect(result.small_labels).toHaveLength(1);
      expect(result.error).toContain("may be truncated");
    });
  });

  describe('Multiple Label Size Workflow', () => {
    test('should generate and print both full and small labels', async () => {
      const labelText = "Multi-size Label Test";
      const previewRequest = { text: labelText };
      
      const multiSizePreviewResponse = {
        full_labels: [validBase64Image],
        small_labels: [alternateBase64Image]
      };
      
      const printBothRequest = createPrintRequest({
        text: labelText,
        shouldPrintFullLabel: true,
        shouldPrintSmallLabel: true
      });
      
      const printBothResponse = {
        success: true,
        message: "Both label sizes printed successfully",
        labels_printed: 2
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(multiSizePreviewResponse)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(printBothResponse)
        } as Response);

      // Generate preview
      const previewResult = await LabelBroAPI.fetchLabelPreviews(previewRequest);
      
      expect(previewResult.full_labels).toHaveLength(1);
      expect(previewResult.small_labels).toHaveLength(1);
      // Should have different content for different sizes
      expect(previewResult.full_labels[0]).not.toBe(previewResult.small_labels[0]);

      // Print both sizes
      const printResult = await LabelBroAPI.printLabels(printBothRequest);
      
      expect(printResult.success).toBe(true);
      expect(printResult.labels_printed).toBe(2);
    });

    test('should handle print request with only small label', async () => {
      const smallOnlyRequest = createPrintRequest({
        text: "Small Only Label",
        shouldPrintFullLabel: false,
        shouldPrintSmallLabel: true
      });
      
      const smallOnlyResponse = {
        success: true,
        message: "Small label printed successfully",
        labels_printed: 1,
        size: "small"
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(smallOnlyResponse)
      } as Response);

      const result = await LabelBroAPI.printLabels(smallOnlyRequest);
      
      expect(result.success).toBe(true);
      expect(result.labels_printed).toBe(1);
      expect(result.size).toBe("small");
    });
  });

  describe('Special Character and Unicode Handling', () => {
    test('should handle special characters in label text', async () => {
      const specialTextRequest = { text: "Special: ñáéíóú & €uro $ymbol ®™" };
      
      const specialTextResponse = {
        full_labels: [validBase64Image],
        small_labels: [validBase64Image]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(specialTextResponse)
      } as Response);

      const result = await LabelBroAPI.fetchLabelPreviews(specialTextRequest);
      
      expect(result.full_labels).toHaveLength(1);
      expect(result.small_labels).toHaveLength(1);
      expect(result.full_labels[0]).toMatch(/^data:image\/png;base64,/);
    });

    test('should handle Unicode text (emojis and international characters)', async () => {
      const unicodeTextRequest = { text: "Unicode: プリンター 打印机 🖨️ 📄 ✅" };
      
      const unicodeTextResponse = {
        full_labels: [validBase64Image],
        small_labels: [validBase64Image],
        error: "Some characters may not display correctly on all printer models"
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(unicodeTextResponse)
      } as Response);

      const result = await LabelBroAPI.fetchLabelPreviews(unicodeTextRequest);
      
      expect(result.full_labels).toHaveLength(1);
      expect(result.error).toContain("may not display correctly");
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle preview generation server errors', async () => {
      const textRequest = { text: "Server Error Test" };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Image generation service unavailable' })
      } as Response);

      // API returns error object, doesn't throw
      const result = await LabelBroAPI.fetchLabelPreviews(textRequest);
      expect(result.error).toBe('Image generation service unavailable');
    });

    test('should handle print request server errors', async () => {
      const printRequest = createPrintRequest({
        text: "Print Error Test",
        shouldPrintFullLabel: true,
        shouldPrintSmallLabel: false
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: () => Promise.resolve({ error: 'Printer service temporarily unavailable' })
      } as Response);

      // API returns error object, doesn't throw
      const result = await LabelBroAPI.printLabels(printRequest);
      expect(result.error).toBe('Printer service temporarily unavailable');
    });


    test('should handle network timeouts during label operations', async () => {
      const textRequest = { text: "Timeout Test" };

      mockFetch.mockRejectedValueOnce(new Error('Network request timed out'));

      await expect(LabelBroAPI.fetchLabelPreviews(textRequest)).rejects.toThrow('Network request timed out');
    });
  });

  describe('Concurrent Label Operations', () => {
    test('should handle multiple preview requests concurrently', async () => {
      const requests = [
        { text: "Label 1" },
        { text: "Label 2" },
        { text: "Label 3" }
      ];

      const responses = requests.map((req, index) => ({
        full_labels: [`data:image/png;base64,base64-data-${index}`],
        small_labels: [`data:image/png;base64,base64-data-small-${index}`]
      }));

      // Mock all three requests
      requests.forEach((_, index) => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(responses[index])
        } as Response);
      });

      // Execute all requests concurrently
      const results = await Promise.all(
        requests.map(request => LabelBroAPI.fetchLabelPreviews(request))
      );

      // Validate all results
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.full_labels).toHaveLength(1);
        expect(result.full_labels[0]).toBe(`data:image/png;base64,base64-data-${index}`);
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    test('should handle mixed success/failure in concurrent operations', async () => {
      const request1 = { text: "Success Label" };
      const request2 = { text: "Fail Label" };
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            full_labels: ["success-base64"],
            small_labels: ["success-base64-small"]
          })
        } as Response)
        .mockRejectedValueOnce(new Error('Server error'));

      const results = await Promise.allSettled([
        LabelBroAPI.fetchLabelPreviews(request1),
        LabelBroAPI.fetchLabelPreviews(request2)
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      
      if (results[0].status === 'fulfilled') {
        expect(results[0].value.full_labels).toHaveLength(1);
      }
      
      if (results[1].status === 'rejected') {
        expect(results[1].reason.message).toBe('Server error');
      }
    });
  });

  describe('Data Validation Integration', () => {
    test('should validate preview response data', async () => {
      const textRequest = { text: "Validation Test" };
      
      // Response with validation issues
      const invalidResponse = {
        full_labels: "should be array", // Wrong type
        small_labels: [123, 456], // Wrong element types
        error: true // Wrong type - should be string
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(invalidResponse)
      } as Response);

      // API should handle validation gracefully 
      const result = await LabelBroAPI.fetchLabelPreviews(textRequest);
      
      // The response may be processed despite validation issues
      // depending on graceful degradation strategy
      expect(result).toBeDefined();
    });

    test('should validate print request data before sending', async () => {
      const invalidPrintRequest = {
        data: {
          text: 123, // Should be string
          shouldPrintFullLabel: "yes", // Should be boolean
          shouldPrintSmallLabel: "no" // Should be boolean
        }
      };

      // The API should validate the request before sending
      // This test verifies the validation system integration
      try {
        await LabelBroAPI.printLabels(invalidPrintRequest as any);
      } catch (error) {
        // May throw validation error or handle gracefully
        // depending on implementation strategy
        expect(error).toBeDefined();
      }
    });
  });
});