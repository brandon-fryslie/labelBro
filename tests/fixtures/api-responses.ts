// DEPRECATED: Legacy API response fixtures
// 
// This file is maintained for backward compatibility.
// New tests should use the standardized fixtures from:
// - ./printer-data.ts
// - ./label-data.ts  
// - ./discovery-data.ts
// - ./index.ts (for centralized imports)

import { basePrinterData } from './printer-data';
import { validBase64Image } from './label-data';

// Legacy printer data - use printer-data.ts for new tests
export const validPrinterData = {
  id: "printer_001",
  display_name: "Brother QL-800",
  is_connected: true,
  media_info: "62mm continuous tape",
  model: "QL-800",
  status: "ready",
  ip: "192.168.1.100",
  media_loaded: true,
  printer_ready: true,
  media_width: "62mm",
  media_type: "continuous"
};

export const invalidPrinterData = {
  id: "printer_001",
  display_name: "Brother QL-800",
  is_connected: "yes", // Should be boolean
  media_info: 123, // Should be string
  model: "QL-800",
  // Missing required status field
};

// Legacy printers response - use discovery-data.ts for new tests
export const validPrintersResponse = {
  printers: {
    "printer_001": validPrinterData,
    "printer_002": {
      ...validPrinterData,
      id: "printer_002",
      is_connected: false
    }
  }
};

export const invalidPrintersResponse = {
  printers: "not an object" // Should be Record<string, PrinterData>
};

// Legacy label preview data - use label-data.ts for new tests
export const validLabelPreviewData = {
  full_labels: [validBase64Image],
  small_labels: [validBase64Image]
};

export const invalidLabelPreviewData = {
  full_labels: "should be array", // Should be string[]
  small_labels: [123, 456], // Should be string[]
  error: true // Should be string if present
};

// Legacy discovery response - use discovery-data.ts for new tests
export const validDiscoveryResponse = {
  success: true,
  data: {
    printers: validPrintersResponse.printers,
    discovery_methods: {
      mdns: true,
      network_scan: false,
      usb: true
    }
  }
};

export const invalidDiscoveryResponse = {
  success: true,
  data: {
    printers: validPrintersResponse.printers,
    discovery_methods: {
      mdns: "yes", // Should be boolean
      network_scan: 1, // Should be boolean
      invalid_method: true // Unknown property
    }
  }
};

// Legacy manual connection result - use discovery-data.ts for new tests
export const validManualConnectionResult = {
  success: true,
  target: "192.168.1.100",
  printers_found: [validPrinterData]
};

export const invalidManualConnectionResult = {
  success: "true", // Should be boolean
  target: 192168, // Should be string
  printers_found: "none" // Should be array
};

// Legacy print request - use label-data.ts for new tests
export const validPrintRequest = {
  data: {
    text: "Test Label",
    shouldPrintFullLabel: true,
    shouldPrintSmallLabel: false,
    printer_id: "printer_001"
  }
};

export const invalidPrintRequest = {
  data: {
    text: 123, // Should be string
    shouldPrintFullLabel: "yes", // Should be boolean
    shouldPrintSmallLabel: "no", // Should be boolean
    // Missing printer_id (optional but if present should be string)
  }
};

// Legacy edge cases - use specific fixture files for new tests
export const edgeCaseResponses = {
  emptyPrintersResponse: {
    printers: {}
  },
  
  minimalPrinterData: {
    id: "minimal",
    display_name: "Minimal Printer",
    is_connected: false,
    model: "Basic",
    status: "offline"
  },
  
  maximalPrinterData: {
    id: "maximal",
    display_name: "Maximal Printer",
    is_connected: true,
    media_info: "62mm continuous tape with advanced features",
    model: "QL-800 Pro",
    status: "ready",
    model_number: "QL-800-PRO-V2",
    backend: "brother_ql",
    identifier: "Brother_QL-800_Pro_12345",
    ip: "192.168.1.255",
    media_loaded: true,
    printer_ready: true,
    media_width: "62mm",
    media_type: "continuous"
  },
  
  errorResponse: {
    error: "Discovery failed due to network timeout"
  },
  
  malformedJson: "{ invalid json structure",
  
  nullResponse: null,
  
  undefinedResponse: undefined,
  
  arrayInsteadOfObject: [validPrinterData],
  
  stringInsteadOfObject: "should be object",
  
  numberInsteadOfObject: 42
};

// Deprecation warnings for development
if (process.env.NODE_ENV === 'development') {
  const deprecationMessage = `
    ⚠️  DEPRECATION WARNING: api-responses.ts is deprecated
    
    Please migrate to the new standardized fixtures:
    - Use printer-data.ts for printer-related fixtures
    - Use label-data.ts for label and preview fixtures
    - Use discovery-data.ts for discovery and connection fixtures
    - Use index.ts for centralized imports
    
    Example migration:
    OLD: import { validPrinterData } from './fixtures/api-responses';
    NEW: import { basePrinterData } from './fixtures/printer-data';
    OR:  import { basePrinterData } from './fixtures';
  `;
  
  // Only log once per test run
  if (!global.__deprecationWarningShown) {
    console.warn(deprecationMessage);
    global.__deprecationWarningShown = true;
  }
}