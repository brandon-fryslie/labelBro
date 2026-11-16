import type { MockedFunction } from 'vitest';
// End-to-end integration tests for complete application workflows
// Tests the full user journey: Discovery → Connection → Label Creation → Print

import { LabelBroAPI } from '../../src/api';
import { TypeValidator } from '../../src/validation';
import { 
  validDiscoveryResponses,
  validPrintersResponses,
  printerStatuses,
  validLabelPreviews,
  validPrintRequests,
  createPrinterData,
  createLabelPreviewData,
  createPrintRequest,
  validBase64Image
} from '../fixtures';

describe('End-to-End Application Workflow Integration', () => {
  let mockFetch: MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = vi.fn(global.fetch) as MockedFunction<typeof fetch>;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete User Journey: Auto Discovery → Label → Print', () => {
    test('should complete full workflow from discovery to successful print', async () => {
      const labelText = "End-to-End Test Label";
      const selectedPrinterId = "e2e_printer_001";
      
      // Workflow step responses
      const discoveryResponse = {
        success: true,
        data: {
          printers: {
            [selectedPrinterId]: {
              ...printerStatuses.ready,
              id: selectedPrinterId,
              display_name: "E2E Test Printer",
              model: "QL-800"
            }
          },
          discovery_methods: {
            mdns: true,
            network_scan: false,
            usb: true
          }
        }
      };

      const printersStatusResponse = {
        printers: {
          [selectedPrinterId]: {
            ...discoveryResponse.data.printers[selectedPrinterId],
            is_connected: true,
            printer_ready: true
          }
        }
      };

      const previewResponse = {
        full_labels: [validBase64Image],
        small_labels: [validBase64Image]
      };

      const printResponse = {
        success: true,
        message: "Label printed successfully",
        printer_id: selectedPrinterId,
        labels_printed: 1,
        job_id: "e2e_job_123"
      };

      // Mock the complete API call sequence
      mockFetch
        // Step 1: Discover printers
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(discoveryResponse)
        } as Response)
        // Step 2: Get printer status
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(printersStatusResponse)
        } as Response)
        // Step 3: Generate label preview
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(previewResponse)
        } as Response)
        // Step 4: Print label
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(printResponse)
        } as Response);

      // Execute the complete workflow
      
      // Step 1: Discover available printers
      const discoveryResult = await LabelBroAPI.discoverPrinters();
      expect(discoveryResult.success).toBe(true);
      expect(discoveryResult.data.printers[selectedPrinterId]).toBeDefined();

      // Step 2: Check printer status
      const statusResult = await LabelBroAPI.fetchPrinters();
      expect(statusResult![selectedPrinterId].is_connected).toBe(true);
      expect(statusResult![selectedPrinterId].printer_ready).toBe(true);

      // Step 3: Generate label preview
      const previewResult = await LabelBroAPI.fetchLabelPreviews({ text: labelText });
      expect(previewResult.full_labels).toHaveLength(1);
      expect(previewResult.full_labels[0]).toMatch(/^data:image\/png;base64,/);

      // Step 4: Print the label
      const printRequest = createPrintRequest({
        text: labelText,
        shouldPrintFullLabel: true,
        shouldPrintSmallLabel: false,
        printer_id: selectedPrinterId
      });
      const printResult = await LabelBroAPI.printLabels(printRequest);
      
      expect(printResult.success).toBe(true);
      expect(printResult.printer_id).toBe(selectedPrinterId);
      expect(printResult.labels_printed).toBe(1);

      // Verify complete API call sequence
      expect(mockFetch).toHaveBeenCalledTimes(4);
      
      // Verify each API call was made correctly
      expect(mockFetch).toHaveBeenNthCalledWith(1,
        '/printers/discover',
        expect.objectContaining({ method: 'POST' })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(2,
        '/printers',
        expect.objectContaining({ method: 'GET' })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(3,
        '/previewLabels',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ text: labelText })
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(4,
        '/printLabels',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(printRequest)
        })
      );
    });

    test('should complete workflow with multiple label sizes', async () => {
      const labelText = "Multi-Size E2E Test";
      const printerId = "multi_size_printer";

      // Setup responses for multi-size workflow
      const discoveryResponse = {
        success: true,
        data: {
          printers: {
            [printerId]: printerStatuses.ready
          },
          discovery_methods: { mdns: true, network_scan: true, usb: false }
        }
      };

      const previewResponse = {
        full_labels: [validBase64Image],
        small_labels: [validBase64Image]
      };

      const printBothResponse = {
        success: true,
        message: "Both label sizes printed successfully",
        printer_id: printerId,
        labels_printed: 2,
        sizes: ["full", "small"]
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(discoveryResponse)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(previewResponse)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(printBothResponse)
        } as Response);

      // Execute workflow
      const discoveryResult = await LabelBroAPI.discoverPrinters();
      expect(discoveryResult.success).toBe(true);

      const previewResult = await LabelBroAPI.fetchLabelPreviews({ text: labelText });
      expect(previewResult.full_labels).toHaveLength(1);
      expect(previewResult.small_labels).toHaveLength(1);

      const printBothRequest = createPrintRequest({
        text: labelText,
        shouldPrintFullLabel: true,
        shouldPrintSmallLabel: true,
        printer_id: printerId
      });
      const printResult = await LabelBroAPI.printLabels(printBothRequest);

      expect(printResult.success).toBe(true);
      expect(printResult.labels_printed).toBe(2);
      expect(printResult.sizes).toEqual(["full", "small"]);
    });
  });

  describe('Complete User Journey: Manual Connection → Label → Print', () => {
    test('should complete full manual connection workflow', async () => {
      const targetIp = "192.168.1.100";
      const labelText = "Manual Connection Test";
      const printerId = "manual_e2e_printer";

      // Manual connection workflow responses
      const connectionResult = {
        success: true,
        target: targetIp,
        printers_found: [{
          ...printerStatuses.ready,
          id: printerId,
          display_name: "Manual Test Printer",
          ip: targetIp,
          is_connected: true
        }]
      };

      const statusAfterConnection = {
        printers: {
          [printerId]: {
            ...connectionResult.printers_found[0],
            printer_ready: true
          }
        }
      };

      const previewResponse = {
        full_labels: [validBase64Image],
        small_labels: [validBase64Image]
      };

      const printResponse = {
        success: true,
        message: "Manual connection print successful",
        printer_id: printerId,
        labels_printed: 1
      };

      mockFetch
        // Step 1: Test manual connection
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(connectionResult)
        } as Response)
        // Step 2: Check status after connection
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(statusAfterConnection)
        } as Response)
        // Step 3: Generate preview
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(previewResponse)
        } as Response)
        // Step 4: Print
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(printResponse)
        } as Response);

      // Execute manual connection workflow
      const connectionTestResult = await LabelBroAPI.testManualConnection(targetIp);
      expect(connectionTestResult.success).toBe(true);
      expect(connectionTestResult.printers_found).toHaveLength(1);

      const statusResult = await LabelBroAPI.fetchPrinters();
      expect(statusResult![printerId].is_connected).toBe(true);

      const previewResult = await LabelBroAPI.fetchLabelPreviews({ text: labelText });
      expect(previewResult.full_labels).toHaveLength(1);

      const printRequest = createPrintRequest({
        text: labelText,
        shouldPrintFullLabel: true,
        shouldPrintSmallLabel: false,
        printer_id: printerId
      });
      const printResult = await LabelBroAPI.printLabels(printRequest);

      expect(printResult.success).toBe(true);
      expect(printResult.printer_id).toBe(printerId);
    });
  });

  describe('Error Recovery Workflows', () => {
    test('should handle printer disconnection mid-workflow', async () => {
      const printerId = "disconnect_test_printer";
      const labelText = "Disconnection Test";

      // Start with successful discovery
      const initialDiscovery = {
        success: true,
        data: {
          printers: {
            [printerId]: {
              ...printerStatuses.ready,
              id: printerId,
              is_connected: true
            }
          },
          discovery_methods: { mdns: true, network_scan: false, usb: true }
        }
      };

      // Preview generation succeeds
      const previewResponse = {
        full_labels: [validBase64Image],
        small_labels: []
      };

      // But printer is disconnected before print
      const disconnectedStatus = {
        printers: {
          [printerId]: {
            ...printerStatuses.offline,
            id: printerId,
            is_connected: false
          }
        }
      };

      // Print fails due to disconnection
      const printFailureResponse = {
        success: false,
        error: "Printer not available: Connection lost",
        printer_id: printerId
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(initialDiscovery)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(previewResponse)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(disconnectedStatus)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(printFailureResponse)
        } as Response);

      // Initial workflow starts successfully
      const discoveryResult = await LabelBroAPI.discoverPrinters();
      expect(discoveryResult.success).toBe(true);

      const previewResult = await LabelBroAPI.fetchLabelPreviews({ text: labelText });
      expect(previewResult.full_labels).toHaveLength(1);

      // Check status reveals disconnection
      const statusResult = await LabelBroAPI.fetchPrinters();
      expect(statusResult![printerId].is_connected).toBe(false);

      // Print attempt fails gracefully
      const printRequest = createPrintRequest({
        text: labelText,
        shouldPrintFullLabel: true,
        shouldPrintSmallLabel: false,
        printer_id: printerId
      });
      const printResult = await LabelBroAPI.printLabels(printRequest);

      expect(printResult.success).toBe(false);
      expect(printResult.error).toContain("Connection lost");
    });

    test('should handle network failure during workflow', async () => {
      const labelText = "Network Failure Test";

      // Discovery succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(validDiscoveryResponses.basicSuccess)
        } as Response)
        // Preview generation fails due to network
        .mockRejectedValueOnce(new Error('Network timeout'));

      const discoveryResult = await LabelBroAPI.discoverPrinters();
      expect(discoveryResult.success).toBe(true);

      // Preview fails due to network issue
      await expect(
        LabelBroAPI.fetchLabelPreviews({ text: labelText })
      ).rejects.toThrow('Network timeout');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('should handle server errors during workflow', async () => {
      const labelText = "Server Error Test";

      // Discovery succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(validDiscoveryResponses.basicSuccess)
        } as Response)
        // Preview generation fails with server error
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ error: 'Image generation service unavailable' })
        } as Response);

      const discoveryResult = await LabelBroAPI.discoverPrinters();
      expect(discoveryResult.success).toBe(true);

      // Preview fails with server error - API returns error object, doesn't throw
      const previewResult = await LabelBroAPI.fetchLabelPreviews({ text: labelText });
      expect(previewResult.error).toBe('Image generation service unavailable');
    });
  });

  describe('Complex Multi-Printer Workflows', () => {
    test('should handle workflow with printer selection changes', async () => {
      const labelText = "Printer Selection Test";
      const printer1Id = "selection_printer_1";
      const printer2Id = "selection_printer_2";

      // Discovery finds multiple printers
      const multiPrinterDiscovery = {
        success: true,
        data: {
          printers: {
            [printer1Id]: {
              ...printerStatuses.busy,
              id: printer1Id,
              display_name: "Printer 1 (Busy)"
            },
            [printer2Id]: {
              ...printerStatuses.ready,
              id: printer2Id,
              display_name: "Printer 2 (Ready)"
            }
          },
          discovery_methods: { mdns: true, network_scan: true, usb: false }
        }
      };

      const previewResponse = {
        full_labels: [validBase64Image],
        small_labels: [validBase64Image]
      };

      const printSuccessResponse = {
        success: true,
        message: "Printed to selected printer",
        printer_id: printer2Id,
        labels_printed: 1
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(multiPrinterDiscovery)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(previewResponse)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(printSuccessResponse)
        } as Response);

      // Discover multiple printers
      const discoveryResult = await LabelBroAPI.discoverPrinters();
      expect(Object.keys(discoveryResult.data.printers)).toHaveLength(2);
      expect(discoveryResult.data.printers[printer1Id].status).toBe("busy");
      expect(discoveryResult.data.printers[printer2Id].status).toBe("ready");

      // Generate preview (printer-agnostic)
      const previewResult = await LabelBroAPI.fetchLabelPreviews({ text: labelText });
      expect(previewResult.full_labels).toHaveLength(1);

      // Print to the ready printer (user would select this)
      const printRequest = createPrintRequest({
        text: labelText,
        shouldPrintFullLabel: true,
        shouldPrintSmallLabel: false,
        printer_id: printer2Id // Select the ready printer
      });
      const printResult = await LabelBroAPI.printLabels(printRequest);

      expect(printResult.success).toBe(true);
      expect(printResult.printer_id).toBe(printer2Id);
    });

    test('should handle concurrent operations across multiple printers', async () => {
      const labelText1 = "Concurrent Label 1";
      const labelText2 = "Concurrent Label 2";
      const printer1Id = "concurrent_printer_1";
      const printer2Id = "concurrent_printer_2";

      // Mock responses for concurrent operations
      const preview1Response = {
        full_labels: [validBase64Image],
        small_labels: []
      };

      const preview2Response = {
        full_labels: [],
        small_labels: [validBase64Image]
      };

      const print1Response = {
        success: true,
        message: "Printer 1 job completed",
        printer_id: printer1Id,
        labels_printed: 1
      };

      const print2Response = {
        success: true,
        message: "Printer 2 job completed", 
        printer_id: printer2Id,
        labels_printed: 1
      };

      mockFetch
        // Two concurrent preview requests
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(preview1Response)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(preview2Response)
        } as Response)
        // Two concurrent print requests
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(print1Response)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(print2Response)
        } as Response);

      // Execute concurrent operations
      const [previewResult1, previewResult2] = await Promise.all([
        LabelBroAPI.fetchLabelPreviews({ text: labelText1 }),
        LabelBroAPI.fetchLabelPreviews({ text: labelText2 })
      ]);

      expect(previewResult1.full_labels).toHaveLength(1);
      expect(previewResult2.small_labels).toHaveLength(1);

      const printRequest1 = createPrintRequest({
        text: labelText1,
        shouldPrintFullLabel: true,
        shouldPrintSmallLabel: false,
        printer_id: printer1Id
      });

      const printRequest2 = createPrintRequest({
        text: labelText2,
        shouldPrintFullLabel: false,
        shouldPrintSmallLabel: true,
        printer_id: printer2Id
      });

      const [printResult1, printResult2] = await Promise.all([
        LabelBroAPI.printLabels(printRequest1),
        LabelBroAPI.printLabels(printRequest2)
      ]);

      expect(printResult1.success).toBe(true);
      expect(printResult1.printer_id).toBe(printer1Id);
      expect(printResult2.success).toBe(true);
      expect(printResult2.printer_id).toBe(printer2Id);

      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('Data Consistency Throughout Workflow', () => {
    test('should maintain data consistency across workflow steps', async () => {
      const labelText = "Consistency Test Label";
      const printerId = "consistency_printer";
      const jobId = "consistency_job_123";

      // Workflow with consistent data tracking
      const discoveryResponse = {
        success: true,
        data: {
          printers: {
            [printerId]: {
              ...printerStatuses.ready,
              id: printerId,
              display_name: "Consistency Test Printer",
              model: "QL-800",
              ip: "192.168.1.100"
            }
          },
          discovery_methods: { mdns: true, network_scan: false, usb: true }
        }
      };

      const previewResponse = {
        full_labels: [validBase64Image],
        small_labels: [validBase64Image],
        metadata: {
          text: labelText,
          character_count: labelText.length,
          estimated_print_time: "2 seconds"
        }
      };

      const printResponse = {
        success: true,
        message: "Label printed successfully",
        printer_id: printerId,
        labels_printed: 1,
        job_id: jobId,
        text_printed: labelText,
        timestamp: new Date().toISOString()
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(discoveryResponse)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(previewResponse)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(printResponse)
        } as Response);

      // Verify data consistency throughout workflow
      const discoveryResult = await LabelBroAPI.discoverPrinters();
      const discoveredPrinter = discoveryResult.data.printers[printerId];
      
      const previewResult = await LabelBroAPI.fetchLabelPreviews({ text: labelText });
      
      const printRequest = createPrintRequest({
        text: labelText,
        shouldPrintFullLabel: true,
        shouldPrintSmallLabel: true,
        printer_id: printerId
      });
      const printResult = await LabelBroAPI.printLabels(printRequest);

      // Verify consistent data across all steps
      expect(discoveredPrinter.id).toBe(printerId);
      expect(previewResult.metadata.text).toBe(labelText);
      expect(printResult.printer_id).toBe(printerId);
      expect(printResult.text_printed).toBe(labelText);
      expect(printResult.job_id).toBe(jobId);
    });
  });
});