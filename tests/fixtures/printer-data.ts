// Standardized printer data fixtures for testing
import type { PrinterData } from '../../src/types';

// Base valid printer data templates
export const basePrinterData: PrinterData = {
  id: "printer_base_001",
  display_name: "Base Test Printer",
  is_connected: true,
  model: "Test-Model",
  status: "ready"
};

// Complete valid printer data with all optional fields
export const completePrinterData: PrinterData = {
  id: "printer_complete_001",
  display_name: "Complete Brother QL-800",
  is_connected: true,
  media_info: "62mm continuous tape",
  model: "QL-800",
  model_number: "QL-800-V1",
  backend: "brother_ql",
  identifier: "Brother_QL-800_12345",
  ip: "192.168.1.100",
  media_loaded: true,
  printer_ready: true,
  media_width: "62mm",
  media_type: "continuous",
  status: "ready"
};

// Different printer status scenarios
export const printerStatuses = {
  ready: {
    ...basePrinterData,
    id: "printer_ready",
    status: "ready",
    is_connected: true,
    printer_ready: true
  },
  
  offline: {
    ...basePrinterData,
    id: "printer_offline",
    status: "offline", 
    is_connected: false,
    printer_ready: false
  },
  
  busy: {
    ...basePrinterData,
    id: "printer_busy",
    status: "busy",
    is_connected: true,
    printer_ready: false
  },
  
  error: {
    ...basePrinterData,
    id: "printer_error",
    status: "error",
    is_connected: true,
    printer_ready: false
  },
  
  noMedia: {
    ...basePrinterData,
    id: "printer_no_media", 
    status: "no_media",
    is_connected: true,
    media_loaded: false,
    printer_ready: false
  }
} as const;

// Different printer models for testing model-specific behavior
export const printerModels = {
  ql800: {
    ...basePrinterData,
    id: "printer_ql800",
    model: "QL-800",
    model_number: "QL-800-V1",
    display_name: "Brother QL-800"
  },
  
  ql810w: {
    ...basePrinterData,
    id: "printer_ql810w", 
    model: "QL-810W",
    model_number: "QL-810W-V2",
    display_name: "Brother QL-810W"
  },
  
  ql820nwb: {
    ...basePrinterData,
    id: "printer_ql820nwb",
    model: "QL-820NWB", 
    model_number: "QL-820NWB-V1",
    display_name: "Brother QL-820NWB"
  }
} as const;

// Media type variations
export const mediaTypes = {
  continuous: {
    ...basePrinterData,
    id: "printer_continuous",
    media_info: "62mm continuous tape",
    media_width: "62mm",
    media_type: "continuous",
    media_loaded: true
  },
  
  diecut: {
    ...basePrinterData,
    id: "printer_diecut",
    media_info: "29x90mm die-cut labels",
    media_width: "29mm",
    media_type: "diecut", 
    media_loaded: true
  },
  
  noMedia: {
    ...basePrinterData,
    id: "printer_no_media_type",
    media_info: undefined,
    media_width: undefined,
    media_type: undefined,
    media_loaded: false
  }
} as const;

// Invalid printer data for validation testing
export const invalidPrinterData = {
  // Missing required fields
  missingId: {
    display_name: "Missing ID Printer",
    is_connected: true,
    model: "Test-Model",
    status: "ready"
  },
  
  missingDisplayName: {
    id: "printer_no_name",
    is_connected: true,
    model: "Test-Model", 
    status: "ready"
  },
  
  missingModel: {
    id: "printer_no_model",
    display_name: "No Model Printer",
    is_connected: true,
    status: "ready"
  },
  
  missingStatus: {
    id: "printer_no_status",
    display_name: "No Status Printer", 
    is_connected: true,
    model: "Test-Model"
  },
  
  // Wrong types
  wrongIdType: {
    ...basePrinterData,
    id: 123 // Should be string
  },
  
  wrongDisplayNameType: {
    ...basePrinterData,
    display_name: true // Should be string
  },
  
  wrongIsConnectedType: {
    ...basePrinterData,
    is_connected: "yes" // Should be boolean
  },
  
  wrongModelType: {
    ...basePrinterData,
    model: 456 // Should be string
  },
  
  wrongStatusType: {
    ...basePrinterData,
    status: 789 // Should be string
  },
  
  // Optional fields with wrong types
  wrongMediaInfoType: {
    ...basePrinterData,
    media_info: 123 // Should be string
  },
  
  wrongMediaLoadedType: {
    ...basePrinterData,
    media_loaded: "true" // Should be boolean
  },
  
  wrongPrinterReadyType: {
    ...basePrinterData,
    printer_ready: "false" // Should be boolean
  }
} as const;

// Edge cases for comprehensive testing
export const edgeCases = {
  // Empty values but correct types
  emptyStrings: {
    ...basePrinterData,
    id: "",
    display_name: "",
    model: "",
    status: ""
  },
  
  // Very long strings
  longStrings: {
    ...basePrinterData,
    id: "a".repeat(1000),
    display_name: "Very Long Printer Name ".repeat(50),
    model: "Model-".repeat(100)
  },
  
  // Special characters
  specialCharacters: {
    ...basePrinterData,
    id: "printer-with-special_chars.123",
    display_name: "Printer with Special Chars: ñáéíóú & €",
    model: "Model/With\\Special:Chars"
  },
  
  // Unicode characters
  unicodeCharacters: {
    ...basePrinterData,
    id: "printer_unicode_123",
    display_name: "プリンター 打印机 Принтер",
    model: "Model-🖨️"
  },
  
  // Null/undefined optional fields
  nullOptionalFields: {
    ...basePrinterData,
    media_info: null as any,
    ip: undefined,
    media_loaded: null as any
  }
} as const;

// Collections for easy test iteration
export const allValidPrinterData = [
  basePrinterData,
  completePrinterData,
  ...Object.values(printerStatuses),
  ...Object.values(printerModels),
  ...Object.values(mediaTypes)
];

export const allInvalidPrinterData = Object.values(invalidPrinterData);

export const allEdgeCases = Object.values(edgeCases);

// Helper functions for test data creation
export const createPrinterData = (overrides: Partial<PrinterData> = {}): PrinterData => ({
  ...basePrinterData,
  ...overrides
});

export const createPrinterWithId = (id: string): PrinterData => 
  createPrinterData({ id });

export const createMultiplePrinters = (count: number): PrinterData[] =>
  Array.from({ length: count }, (_, i) => 
    createPrinterData({ id: `printer_${i + 1}` })
  );