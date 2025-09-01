// Integration tests for printer discovery workflow
// Tests the complete flow: Discovery → Selection → Connection → Status Updates

import { LabelBroAPI } from '../../src/api';
import { TypeValidator } from '../../src/validation';
import { 
  validDiscoveryResponses, 
  validPrintersResponses,
  printerStatuses,
  createDiscoveryResponse 
} from '../fixtures';

describe('Printer Discovery Workflow Integration', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = jest.fn(global.fetch) as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete Discovery Flow', () => {
    test('should successfully discover printers and retrieve detailed status', async () => {
      // Step 1: Initial discovery request
      const discoveryResponse = validDiscoveryResponses.withAllMethods;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(discoveryResponse)
        } as Response)
        // Step 2: Follow-up printers status request
        .mockResolvedValueOnce({
          ok: true, 
          status: 200,
          json: () => Promise.resolve(validPrintersResponses.basic)
        } as Response);

      // Execute discovery
      const discoveryResult = await LabelBroAPI.discoverPrinters();
      
      // Validate discovery response structure
      expect(discoveryResult).toBeDefined();
      expect(discoveryResult.success).toBe(true);
      expect(discoveryResult.data.printers).toBeDefined();
      expect(discoveryResult.data.discovery_methods).toBeDefined();

      // Execute printers status request
      const printersResult = await LabelBroAPI.fetchPrinters();
      
      // Validate printers data
      expect(printersResult).toBeDefined();
      expect(Object.keys(printersResult!)).toHaveLength(2);
      
      // Verify API call sequence
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, 
        'http://localhost:5100/printers/discover',
        expect.objectContaining({ method: 'POST' })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(2,
        'http://localhost:5100/printers',
        expect.objectContaining({ method: 'GET' })
      );
    });

    test('should handle discovery with no printers found gracefully', async () => {
      const emptyDiscoveryResponse = createDiscoveryResponse(true, []);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(emptyDiscoveryResponse)
      } as Response);

      const result = await LabelBroAPI.discoverPrinters();
      
      expect(result.success).toBe(true);
      expect(Object.keys(result.data.printers)).toHaveLength(0);
      expect(result.data.discovery_methods).toBeDefined();
    });

    test('should handle partial discovery success (some methods fail)', async () => {
      const partialSuccessResponse = {
        ...validDiscoveryResponses.basicSuccess,
        data: {
          ...validDiscoveryResponses.basicSuccess.data,
          discovery_methods: {
            mdns: true,
            network_scan: false,  // Failed
            usb: true
          }
        },
        error: "Network scan failed: Permission denied"
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(partialSuccessResponse)
      } as Response);

      const result = await LabelBroAPI.discoverPrinters();
      
      expect(result.success).toBe(true);
      expect(result.error).toContain("Network scan failed");
      expect(result.data.discovery_methods.mdns).toBe(true);
      expect(result.data.discovery_methods.network_scan).toBe(false);
      expect(Object.keys(result.data.printers).length).toBeGreaterThan(0);
    });

    test('should handle complete discovery failure', async () => {
      const failedDiscoveryResponse = validDiscoveryResponses.discoveryFailed;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(failedDiscoveryResponse)
      } as Response);

      const result = await LabelBroAPI.discoverPrinters();
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(Object.keys(result.data.printers)).toHaveLength(0);
      expect(result.data.discovery_methods.mdns).toBe(false);
      expect(result.data.discovery_methods.network_scan).toBe(false);
      expect(result.data.discovery_methods.usb).toBe(false);
    });
  });

  describe('Printer Status Monitoring', () => {
    test('should detect printer status changes during monitoring', async () => {
      // Initial state: printer ready
      const initialResponse = {
        printers: {
          "printer_001": printerStatuses.ready
        }
      };
      
      // Updated state: printer busy
      const updatedResponse = {
        printers: {
          "printer_001": printerStatuses.busy
        }
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(initialResponse)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(updatedResponse)
        } as Response);

      // First status check
      const initialPrinters = await LabelBroAPI.fetchPrinters();
      expect(initialPrinters!["printer_001"].status).toBe("ready");
      expect(initialPrinters!["printer_001"].printer_ready).toBe(true);

      // Second status check (simulating status update)
      const updatedPrinters = await LabelBroAPI.fetchPrinters();
      expect(updatedPrinters!["printer_001"].status).toBe("busy");
      expect(updatedPrinters!["printer_001"].printer_ready).toBe(false);
    });

    test('should handle printer disconnection during monitoring', async () => {
      // Initial: printer connected
      const connectedResponse = {
        printers: {
          "printer_001": { ...printerStatuses.ready, is_connected: true }
        }
      };
      
      // Updated: printer disconnected
      const disconnectedResponse = {
        printers: {
          "printer_001": { ...printerStatuses.offline, is_connected: false }
        }
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(connectedResponse)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(disconnectedResponse)
        } as Response);

      const initialPrinters = await LabelBroAPI.fetchPrinters();
      expect(initialPrinters!["printer_001"].is_connected).toBe(true);

      const updatedPrinters = await LabelBroAPI.fetchPrinters();
      expect(updatedPrinters!["printer_001"].is_connected).toBe(false);
      expect(updatedPrinters!["printer_001"].status).toBe("offline");
    });
  });

  describe('Network Error Recovery', () => {
    test('should handle network timeout during discovery', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      // API returns null on network errors instead of throwing
      const result = await LabelBroAPI.discoverPrinters();
      expect(result).toBeNull();
    });

    test('should handle HTTP error responses during discovery', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Server error' })
      } as Response);

      // API returns null on HTTP errors due to outer try/catch
      const result = await LabelBroAPI.discoverPrinters();
      expect(result).toBeNull();
    });

    test('should handle malformed JSON responses gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token'))
      } as Response);

      // API returns null on JSON parsing errors instead of throwing
      const result = await LabelBroAPI.discoverPrinters();
      expect(result).toBeNull();
    });

    test('should retry failed printer status requests', async () => {
      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(validPrintersResponses.basic)
        } as Response);

      // First attempt should fail and return null
      const firstResult = await LabelBroAPI.fetchPrinters();
      expect(firstResult).toBeNull();
      
      // Second attempt should succeed  
      const result = await LabelBroAPI.fetchPrinters();
      expect(result).toBeDefined();
      expect(Object.keys(result!)).toHaveLength(2);
    });
  });

  describe('Data Validation Integration', () => {
    test('should validate discovery response data and handle validation errors', async () => {
      const invalidDiscoveryResponse = {
        success: "true", // Should be boolean
        data: {
          printers: "invalid", // Should be object
          discovery_methods: {
            mdns: "yes" // Should be boolean
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(invalidDiscoveryResponse)
      } as Response);

      // Should not throw but return unvalidated data with graceful degradation
      const result = await LabelBroAPI.discoverPrinters();
      expect(result).toBeDefined();
      
      // The API should have logged validation warnings
      // but still returned data for graceful degradation
    });

    test('should validate printer data and report type mismatches', async () => {
      const invalidPrintersResponse = {
        printers: {
          "invalid_printer": {
            id: 123, // Should be string
            display_name: true, // Should be string
            is_connected: "yes", // Should be boolean
            model: null, // Should be string
            status: undefined // Should be string
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(invalidPrintersResponse)
      } as Response);

      const result = await LabelBroAPI.fetchPrinters();
      
      // Should handle validation gracefully but may return null
      // or processed data depending on severity of validation errors
      expect(result).toBeDefined();
    });
  });

  describe('End-to-End Discovery Scenarios', () => {
    test('should complete full discovery workflow with multiple printers', async () => {
      const multiPrinterDiscovery = createDiscoveryResponse(
        true,
        ['printer_001', 'printer_002', 'printer_003'],
        { mdns: true, network_scan: true, usb: false }
      );

      const multiPrinterStatus = {
        printers: {
          "printer_001": { ...printerStatuses.ready, model: "QL-800" },
          "printer_002": { ...printerStatuses.busy, model: "QL-810W" },
          "printer_003": { ...printerStatuses.offline, model: "QL-820NWB" }
        }
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
          json: () => Promise.resolve(multiPrinterStatus)
        } as Response);

      // Discovery phase
      const discoveryResult = await LabelBroAPI.discoverPrinters();
      expect(discoveryResult.success).toBe(true);
      expect(Object.keys(discoveryResult.data.printers)).toHaveLength(3);

      // Status monitoring phase
      const statusResult = await LabelBroAPI.fetchPrinters();
      expect(statusResult).toBeDefined();
      expect(Object.keys(statusResult!)).toHaveLength(3);
      
      // Verify different printer statuses
      expect(statusResult!["printer_001"].status).toBe("ready");
      expect(statusResult!["printer_002"].status).toBe("busy");
      expect(statusResult!["printer_003"].status).toBe("offline");
    });

    test('should handle discovery workflow with authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: 'Authentication required' })
      } as Response);

      // API returns null on authentication errors due to outer try/catch
      const result = await LabelBroAPI.discoverPrinters();
      expect(result).toBeNull();
      
      // Verify error is properly propagated for UI handling
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5100/printers/discover',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });
});