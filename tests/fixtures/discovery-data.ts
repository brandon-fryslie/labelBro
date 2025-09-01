// Standardized discovery and connection data fixtures for testing
import type { DiscoveryResponse, ManualConnectionResult, PrintersResponse } from '../../src/types';
import { basePrinterData, completePrinterData, printerStatuses } from './printer-data';

// Valid discovery response scenarios
export const validDiscoveryResponses = {
  // Basic successful discovery
  basicSuccess: {
    success: true,
    data: {
      printers: {
        "printer_001": basePrinterData,
        "printer_002": {
          ...basePrinterData,
          id: "printer_002",
          display_name: "Second Printer",
          is_connected: false
        }
      }
    }
  } as DiscoveryResponse,

  // Discovery with all method types
  withAllMethods: {
    success: true,
    data: {
      printers: {
        "printer_complete": completePrinterData
      },
      discovery_methods: {
        mdns: true,
        network_scan: true,
        usb: false
      }
    }
  } as DiscoveryResponse,

  // Discovery with no printers found
  noPrintersFound: {
    success: true,
    data: {
      printers: {},
      discovery_methods: {
        mdns: true,
        network_scan: true,
        usb: true
      }
    }
  } as DiscoveryResponse,

  // Discovery with multiple printer statuses
  multipleStatuses: {
    success: true,
    data: {
      printers: {
        "ready_printer": printerStatuses.ready,
        "offline_printer": printerStatuses.offline,
        "busy_printer": printerStatuses.busy,
        "error_printer": printerStatuses.error
      },
      discovery_methods: {
        mdns: true,
        network_scan: false,
        usb: true
      }
    }
  } as DiscoveryResponse,

  // Discovery with only MDNS
  mdnsOnly: {
    success: true,
    data: {
      printers: {
        "mdns_printer": {
          ...basePrinterData,
          id: "mdns_printer",
          display_name: "MDNS Discovered Printer"
        }
      },
      discovery_methods: {
        mdns: true,
        network_scan: false,
        usb: false
      }
    }
  } as DiscoveryResponse,

  // Discovery with error message but success=true
  successWithWarning: {
    success: true,
    data: {
      printers: {
        "printer_with_warning": basePrinterData
      },
      discovery_methods: {
        mdns: true,
        network_scan: false,
        usb: false
      }
    },
    error: "Some discovery methods failed, but found printers via MDNS"
  } as DiscoveryResponse,

  // Failed discovery
  discoveryFailed: {
    success: false,
    data: {
      printers: {},
      discovery_methods: {
        mdns: false,
        network_scan: false,
        usb: false
      }
    },
    error: "All discovery methods failed"
  } as DiscoveryResponse
} as const;

// Invalid discovery response data for validation testing
export const invalidDiscoveryResponses = {
  // Missing required fields
  missingSuccess: {
    data: {
      printers: {},
      discovery_methods: {
        mdns: true
      }
    }
  },

  missingData: {
    success: true
  },

  missingPrinters: {
    success: true,
    data: {
      discovery_methods: {
        mdns: true
      }
    }
  },

  // Wrong types
  successWrongType: {
    success: "true", // Should be boolean
    data: {
      printers: {},
      discovery_methods: {
        mdns: true
      }
    }
  },

  dataWrongType: {
    success: true,
    data: "should be object" // Should be object
  },

  printersWrongType: {
    success: true,
    data: {
      printers: "should be object", // Should be Record<string, PrinterData>
      discovery_methods: {
        mdns: true
      }
    }
  },

  discoveryMethodsWrongType: {
    success: true,
    data: {
      printers: {},
      discovery_methods: "should be object" // Should be object
    }
  },

  // Discovery methods with wrong types
  mdnsWrongType: {
    success: true,
    data: {
      printers: {},
      discovery_methods: {
        mdns: "yes", // Should be boolean
        network_scan: true,
        usb: true
      }
    }
  },

  networkScanWrongType: {
    success: true,
    data: {
      printers: {},
      discovery_methods: {
        mdns: true,
        network_scan: 1, // Should be boolean
        usb: true
      }
    }
  },

  // Unknown discovery methods
  unknownDiscoveryMethods: {
    success: true,
    data: {
      printers: {},
      discovery_methods: {
        mdns: true,
        network_scan: true,
        usb: true,
        bluetooth: true, // Unknown method
        serial: false // Unknown method
      }
    }
  },

  errorWrongType: {
    success: false,
    data: {
      printers: {},
      discovery_methods: {
        mdns: false
      }
    },
    error: 123 // Should be string
  }
} as const;

// Valid manual connection result scenarios
export const validManualConnectionResults = {
  // Successful connection with printer found
  success: {
    success: true,
    target: "192.168.1.100",
    printers_found: [completePrinterData]
  } as ManualConnectionResult,

  // Successful connection with multiple printers
  multipleFound: {
    success: true,
    target: "192.168.1.0/24",
    printers_found: [
      basePrinterData,
      {
        ...basePrinterData,
        id: "printer_subnet_2",
        ip: "192.168.1.101"
      }
    ]
  } as ManualConnectionResult,

  // Successful scan but no printers found
  noPrintersFound: {
    success: true,
    target: "192.168.1.200",
    printers_found: []
  } as ManualConnectionResult,

  // Connection with specific model info
  withModel: {
    success: true,
    model: "QL-800",
    target: "printer.local",
    printers_found: [{
      ...basePrinterData,
      model: "QL-800",
      ip: "192.168.1.150"
    }]
  } as ManualConnectionResult,

  // Failed connection
  connectionFailed: {
    success: false,
    target: "192.168.1.999",
    error: "Connection timeout: Host unreachable"
  } as ManualConnectionResult,

  // Network error
  networkError: {
    success: false,
    target: "invalid.host.name",
    error: "DNS resolution failed"
  } as ManualConnectionResult,

  // Port closed
  portClosed: {
    success: false,
    target: "192.168.1.100:9100",
    error: "Connection refused: Port 9100 closed"
  } as ManualConnectionResult
} as const;

// Invalid manual connection result data
export const invalidManualConnectionResults = {
  // Missing required fields
  missingSuccess: {
    target: "192.168.1.100",
    printers_found: []
  },

  // Wrong types
  successWrongType: {
    success: "true", // Should be boolean
    target: "192.168.1.100",
    printers_found: []
  },

  targetWrongType: {
    success: true,
    target: 192168, // Should be string
    printers_found: []
  },

  modelWrongType: {
    success: true,
    model: 123, // Should be string
    target: "192.168.1.100",
    printers_found: []
  },

  printersFoundWrongType: {
    success: true,
    target: "192.168.1.100",
    printers_found: "none" // Should be array
  },

  errorWrongType: {
    success: false,
    target: "192.168.1.100",
    error: 404 // Should be string
  }
} as const;

// Printers response scenarios (for API endpoints)
export const validPrintersResponses = {
  // Basic printers response
  basic: {
    printers: {
      "printer_001": basePrinterData,
      "printer_002": {
        ...basePrinterData,
        id: "printer_002",
        is_connected: false
      }
    }
  } as PrintersResponse,

  // Empty printers response
  empty: {
    printers: {}
  } as PrintersResponse,

  // Single printer response
  single: {
    printers: {
      "only_printer": completePrinterData
    }
  } as PrintersResponse,

  // Many printers response
  many: {
    printers: Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [
        `printer_${i + 1}`,
        {
          ...basePrinterData,
          id: `printer_${i + 1}`,
          display_name: `Printer ${i + 1}`,
          ip: `192.168.1.${100 + i}`
        }
      ])
    )
  } as PrintersResponse
} as const;

// Invalid printers response data
export const invalidPrintersResponses = {
  // Missing printers field
  missingPrinters: {},

  // Wrong type for printers
  printersWrongType: {
    printers: "should be object" // Should be Record<string, PrinterData>
  },

  printersNull: {
    printers: null as any
  },

  printersUndefined: {
    printers: undefined as any
  },

  // Printers with invalid printer data
  invalidPrinterData: {
    printers: {
      "valid_printer": basePrinterData,
      "invalid_printer": {
        id: 123, // Wrong type
        display_name: "Invalid Printer"
        // Missing required fields
      }
    }
  }
} as const;

// Collections for easy test iteration
export const allValidDiscoveryResponses = Object.values(validDiscoveryResponses);
export const allInvalidDiscoveryResponses = Object.values(invalidDiscoveryResponses);
export const allValidManualConnectionResults = Object.values(validManualConnectionResults);
export const allInvalidManualConnectionResults = Object.values(invalidManualConnectionResults);
export const allValidPrintersResponses = Object.values(validPrintersResponses);
export const allInvalidPrintersResponses = Object.values(invalidPrintersResponses);

// Helper functions for test data creation
export const createDiscoveryResponse = (
  success: boolean = true,
  printerIds: string[] = ["printer_001"],
  methods: Partial<DiscoveryResponse['data']['discovery_methods']> = {}
): DiscoveryResponse => ({
  success,
  data: {
    printers: Object.fromEntries(
      printerIds.map(id => [id, { ...basePrinterData, id }])
    ),
    discovery_methods: {
      mdns: true,
      network_scan: false,
      usb: false,
      ...methods
    }
  }
});

export const createManualConnectionResult = (
  success: boolean = true,
  target: string = "192.168.1.100",
  overrides: Partial<ManualConnectionResult> = {}
): ManualConnectionResult => ({
  success,
  target,
  ...(success ? {
    printers_found: [basePrinterData]
  } : {
    error: "Connection failed"
  }),
  ...overrides
});

export const createPrintersResponse = (printerCount: number = 1): PrintersResponse => ({
  printers: Object.fromEntries(
    Array.from({ length: printerCount }, (_, i) => [
      `printer_${i + 1}`,
      { ...basePrinterData, id: `printer_${i + 1}` }
    ])
  )
});