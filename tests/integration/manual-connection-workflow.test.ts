// Integration tests for manual printer connection workflow
// Tests the complete flow: IP Input → Connection Test → Result Processing → Status Update

import { LabelBroAPI } from '../../src/api';
import { TypeValidator } from '../../src/validation';
import { 
  validManualConnectionResults,
  validPrintersResponses,
  printerStatuses,
  createManualConnectionResult,
  createPrinterData
} from '../fixtures';

describe('Manual Connection Workflow Integration', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = jest.fn(global.fetch) as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Successful Manual Connection Flow', () => {
    test('should successfully connect to printer via IP address', async () => {
      const targetIp = "192.168.1.100";
      const expectedPrinter = createPrinterData({
        id: "manual_printer_001",
        display_name: "Brother QL-800 (Manual)",
        ip: targetIp,
        is_connected: true,
        status: "ready"
      });
      
      const connectionResult = createManualConnectionResult(true, targetIp, {
        printers_found: [expectedPrinter]
      });

      // Mock follow-up status request
      const statusResponse = {
        printers: {
          [expectedPrinter.id]: expectedPrinter
        }
      };

      mockFetch
        // Manual connection test
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(connectionResult)
        } as Response)
        // Follow-up status check
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(statusResponse)
        } as Response);

      // Step 1: Test manual connection
      const testResult = await LabelBroAPI.testManualConnection(targetIp);
      
      expect(testResult.success).toBe(true);
      expect(testResult.target).toBe(targetIp);
      expect(testResult.printers_found).toHaveLength(1);
      expect(testResult.printers_found![0].ip).toBe(targetIp);
      expect(testResult.printers_found![0].is_connected).toBe(true);

      // Step 2: Verify printer status after connection
      const statusResult = await LabelBroAPI.fetchPrinters();
      
      expect(statusResult).toBeDefined();
      expect(statusResult![expectedPrinter.id]).toBeDefined();
      expect(statusResult![expectedPrinter.id].ip).toBe(targetIp);
      expect(statusResult![expectedPrinter.id].status).toBe("ready");

      // Verify API call sequence
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1,
        'http://localhost:5100/printers/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ip: targetIp })
        })
      );
    });

    test('should handle connection to hostname instead of IP', async () => {
      const hostname = "printer.local";
      const resolvedIp = "192.168.1.150";
      
      const connectionResult = createManualConnectionResult(true, hostname, {
        target: hostname,
        printers_found: [{
          ...printerStatuses.ready,
          id: "hostname_printer",
          display_name: "Network Printer",
          ip: resolvedIp
        }]
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(connectionResult)
      } as Response);

      const result = await LabelBroAPI.testManualConnection(hostname);
      
      expect(result.success).toBe(true);
      expect(result.target).toBe(hostname);
      expect(result.printers_found).toHaveLength(1);
      expect(result.printers_found![0].ip).toBe(resolvedIp);
    });

    test('should handle connection with specific port', async () => {
      const targetWithPort = "192.168.1.100:9100";
      const connectionResult = createManualConnectionResult(true, targetWithPort, {
        model: "QL-800",
        printers_found: [{
          ...printerStatuses.ready,
          id: "port_specific_printer",
          ip: "192.168.1.100"
        }]
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(connectionResult)
      } as Response);

      const result = await LabelBroAPI.testManualConnection(targetWithPort);
      
      expect(result.success).toBe(true);
      expect(result.target).toBe(targetWithPort);
      expect(result.model).toBe("QL-800");
      expect(result.printers_found).toHaveLength(1);
    });
  });

  describe('Connection Failure Scenarios', () => {
    test('should handle connection timeout', async () => {
      const targetIp = "192.168.1.200";
      const timeoutResult = createManualConnectionResult(false, targetIp, {
        error: "Connection timeout: Host unreachable after 5 seconds"
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(timeoutResult)
      } as Response);

      const result = await LabelBroAPI.testManualConnection(targetIp);
      
      expect(result.success).toBe(false);
      expect(result.target).toBe(targetIp);
      expect(result.error).toContain("timeout");
      expect(result.printers_found).toBeUndefined();
    });

    test('should handle DNS resolution failure', async () => {
      const invalidHostname = "nonexistent.printer.local";
      const dnsFailureResult = createManualConnectionResult(false, invalidHostname, {
        error: "DNS resolution failed: Host not found"
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(dnsFailureResult)
      } as Response);

      const result = await LabelBroAPI.testManualConnection(invalidHostname);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("DNS resolution failed");
    });

    test('should handle port closed/refused connections', async () => {
      const targetIp = "192.168.1.100";
      const portClosedResult = createManualConnectionResult(false, targetIp, {
        error: "Connection refused: Port 9100 is closed or service not running"
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(portClosedResult)
      } as Response);

      const result = await LabelBroAPI.testManualConnection(targetIp);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("Connection refused");
    });

    test('should handle invalid IP address format', async () => {
      const invalidIp = "999.999.999.999";
      const invalidIpResult = createManualConnectionResult(false, invalidIp, {
        error: "Invalid IP address format"
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(invalidIpResult)
      } as Response);

      const result = await LabelBroAPI.testManualConnection(invalidIp);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid IP address");
    });
  });

  describe('Multiple Printer Discovery', () => {
    test('should handle subnet scan finding multiple printers', async () => {
      const subnet = "192.168.1.0/24";
      const multipleResults = createManualConnectionResult(true, subnet, {
        printers_found: [
          {
            ...printerStatuses.ready,
            id: "subnet_printer_1",
            ip: "192.168.1.100",
            model: "QL-800"
          },
          {
            ...printerStatuses.busy,
            id: "subnet_printer_2", 
            ip: "192.168.1.101",
            model: "QL-810W"
          },
          {
            ...printerStatuses.ready,
            id: "subnet_printer_3",
            ip: "192.168.1.102", 
            model: "QL-820NWB"
          }
        ]
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(multipleResults)
      } as Response);

      const result = await LabelBroAPI.testManualConnection(subnet);
      
      expect(result.success).toBe(true);
      expect(result.printers_found).toHaveLength(3);
      expect(result.printers_found![0].ip).toBe("192.168.1.100");
      expect(result.printers_found![1].ip).toBe("192.168.1.101");
      expect(result.printers_found![2].ip).toBe("192.168.1.102");
      
      // Verify different models detected
      const models = result.printers_found!.map(p => p.model);
      expect(models).toContain("QL-800");
      expect(models).toContain("QL-810W");
      expect(models).toContain("QL-820NWB");
    });

    test('should handle scan finding no printers', async () => {
      const subnet = "10.0.0.0/24";
      const noResultsFound = createManualConnectionResult(true, subnet, {
        printers_found: []
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(noResultsFound)
      } as Response);

      const result = await LabelBroAPI.testManualConnection(subnet);
      
      expect(result.success).toBe(true);
      expect(result.printers_found).toHaveLength(0);
      expect(result.target).toBe(subnet);
    });
  });

  describe('Network Error Handling', () => {
    test('should handle network connectivity issues during connection test', async () => {
      const targetIp = "192.168.1.100";

      mockFetch.mockRejectedValueOnce(new Error('Network error: Unable to reach server'));

      await expect(LabelBroAPI.testManualConnection(targetIp)).rejects.toThrow('Network error');
    });

    test('should handle server errors during connection test', async () => {
      const targetIp = "192.168.1.100";

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Connection service unavailable' })
      } as Response);

      await expect(LabelBroAPI.testManualConnection(targetIp)).rejects.toThrow();
    });

    test('should handle malformed JSON in connection response', async () => {
      const targetIp = "192.168.1.100";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input'))
      } as Response);

      await expect(LabelBroAPI.testManualConnection(targetIp)).rejects.toThrow('Unexpected end of JSON input');
    });
  });

  describe('Connection State Management', () => {
    test('should handle successful connection followed by disconnection', async () => {
      const targetIp = "192.168.1.100";
      const printerId = "connection_state_printer";
      
      // Initial successful connection
      const successResult = createManualConnectionResult(true, targetIp, {
        printers_found: [{
          ...printerStatuses.ready,
          id: printerId,
          ip: targetIp,
          is_connected: true
        }]
      });

      // Later status check showing disconnection
      const disconnectedStatus = {
        printers: {
          [printerId]: {
            ...printerStatuses.offline,
            id: printerId,
            ip: targetIp,
            is_connected: false
          }
        }
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(successResult)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(disconnectedStatus)
        } as Response);

      // Initial connection
      const connectionResult = await LabelBroAPI.testManualConnection(targetIp);
      expect(connectionResult.success).toBe(true);
      expect(connectionResult.printers_found![0].is_connected).toBe(true);

      // Later status check
      const statusResult = await LabelBroAPI.fetchPrinters();
      expect(statusResult![printerId].is_connected).toBe(false);
      expect(statusResult![printerId].status).toBe("offline");
    });

    test('should handle connection state changes during long operations', async () => {
      const targetIp = "192.168.1.100";
      const printerId = "state_change_printer";

      // Connection starts as ready
      const initialResult = createManualConnectionResult(true, targetIp, {
        printers_found: [{
          ...printerStatuses.ready,
          id: printerId,
          ip: targetIp
        }]
      });

      // Status changes to busy (printer in use)
      const busyStatus = {
        printers: {
          [printerId]: {
            ...printerStatuses.busy,
            id: printerId,
            ip: targetIp
          }
        }
      };

      // Status returns to ready
      const readyStatus = {
        printers: {
          [printerId]: {
            ...printerStatuses.ready,
            id: printerId,
            ip: targetIp
          }
        }
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(initialResult)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(busyStatus)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(readyStatus)
        } as Response);

      // Initial connection
      const connectionResult = await LabelBroAPI.testManualConnection(targetIp);
      expect(connectionResult.printers_found![0].status).toBe("ready");

      // Check during operation
      const busyResult = await LabelBroAPI.fetchPrinters();
      expect(busyResult![printerId].status).toBe("busy");

      // Check after operation
      const readyResult = await LabelBroAPI.fetchPrinters();
      expect(readyResult![printerId].status).toBe("ready");
    });
  });

  describe('Data Validation Integration', () => {
    test('should validate manual connection response data', async () => {
      const targetIp = "192.168.1.100";
      
      // Response with validation issues
      const invalidResponse = {
        success: "true", // Should be boolean
        target: 192168, // Should be string
        printers_found: "none", // Should be array
        error: 404 // Should be string if present
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(invalidResponse)
      } as Response);

      // API should handle validation gracefully with degradation
      const result = await LabelBroAPI.testManualConnection(targetIp);
      expect(result).toBeDefined();
    });

    test('should handle connection results with invalid printer data', async () => {
      const targetIp = "192.168.1.100";
      
      const responseWithInvalidPrinter = createManualConnectionResult(true, targetIp, {
        printers_found: [
          // Valid printer
          {
            ...printerStatuses.ready,
            id: "valid_printer",
            ip: targetIp
          },
          // Invalid printer data
          {
            id: 123, // Should be string
            display_name: true, // Should be string
            is_connected: "yes", // Should be boolean
            model: null, // Should be string
            status: undefined // Should be string
          } as any
        ]
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(responseWithInvalidPrinter)
      } as Response);

      const result = await LabelBroAPI.testManualConnection(targetIp);
      
      // Should still process valid data while handling invalid gracefully
      expect(result.success).toBe(true);
      expect(result.printers_found).toHaveLength(2);
      expect(result.printers_found![0].id).toBe("valid_printer");
    });
  });

  describe('Performance and Concurrent Operations', () => {
    test('should handle multiple concurrent connection tests', async () => {
      const targets = ["192.168.1.100", "192.168.1.101", "192.168.1.102"];
      
      const responses = targets.map((ip, index) =>
        createManualConnectionResult(true, ip, {
          printers_found: [{
            ...printerStatuses.ready,
            id: `concurrent_printer_${index}`,
            ip: ip
          }]
        })
      );

      // Mock all responses
      responses.forEach(response => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(response)
        } as Response);
      });

      // Execute concurrent connection tests
      const results = await Promise.all(
        targets.map(target => LabelBroAPI.testManualConnection(target))
      );

      // Validate all results
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.target).toBe(targets[index]);
        expect(result.printers_found).toHaveLength(1);
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    test('should handle mixed success/failure in concurrent connection tests', async () => {
      const successTarget = "192.168.1.100";
      const failureTarget = "192.168.1.200";
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(createManualConnectionResult(true, successTarget))
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(createManualConnectionResult(false, failureTarget, {
            error: "Connection timeout"
          }))
        } as Response);

      const results = await Promise.allSettled([
        LabelBroAPI.testManualConnection(successTarget),
        LabelBroAPI.testManualConnection(failureTarget)
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled'); // No throw, just failed connection

      if (results[0].status === 'fulfilled') {
        expect(results[0].value.success).toBe(true);
      }
      if (results[1].status === 'fulfilled') {
        expect(results[1].value.success).toBe(false);
      }
    });
  });
});