// Test fixtures for API responses - both valid and invalid

export const validPrinterData = {
  id: "printer_001",
  display_name: "Brother QL-800",
  is_connected: true,
  media_info: "62mm continuous tape",
  model: "QL-800",
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
  // Missing required fields
};

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

export const validLabelPreviewData = {
  full_labels: ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="],
  small_labels: ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="]
};

export const invalidLabelPreviewData = {
  full_labels: "should be array", // Should be string[]
  small_labels: [123, 456], // Should be string[]
  error: true // Should be string if present
};

export const validDiscoveryResponse = {
  printers: validPrintersResponse.printers,
  discovery_methods: {
    mdns: true,
    network_scan: false,
    usb: true
  }
};

export const invalidDiscoveryResponse = {
  printers: validPrintersResponse.printers,
  discovery_methods: {
    mdns: "yes", // Should be boolean
    network_scan: 1, // Should be boolean
    invalid_method: true // Unknown property
  }
};

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

// Edge cases for comprehensive testing
export const edgeCaseResponses = {
  emptyPrintersResponse: {
    printers: {}
  },
  
  minimalPrinterData: {
    id: "minimal",
    display_name: "Minimal Printer",
    is_connected: false
  },
  
  maximalPrinterData: {
    id: "maximal",
    display_name: "Maximal Printer",
    is_connected: true,
    media_info: "62mm continuous tape with advanced features",
    model: "QL-800 Pro",
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