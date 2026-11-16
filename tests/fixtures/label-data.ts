// Standardized label and preview data fixtures for testing
import type { LabelPreviewData, PrintRequest } from '../../src/types';

// Valid base64 image data for testing (1x1 pixel transparent PNG)
export const validBase64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

// Different base64 image for variety in tests 
export const alternateBase64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAABHNCSVQICAgIfAhkiAAAAA1JREFUeJxj+P//PwAHggJ/PchI7wAAAABJRU5ErkJggg==";

// Valid label preview data scenarios
export const validLabelPreviews = {
  // Standard single label
  singleLabel: {
    full_labels: [validBase64Image],
    small_labels: [validBase64Image]
  } as LabelPreviewData,

  // Multiple labels
  multipleLabels: {
    full_labels: [validBase64Image, alternateBase64Image, validBase64Image],
    small_labels: [validBase64Image, alternateBase64Image, validBase64Image]
  } as LabelPreviewData,

  // Only full labels
  onlyFullLabels: {
    full_labels: [validBase64Image],
    small_labels: []
  } as LabelPreviewData,

  // Only small labels 
  onlySmallLabels: {
    full_labels: [],
    small_labels: [validBase64Image]
  } as LabelPreviewData,

  // Empty arrays (valid but no content)
  emptyLabels: {
    full_labels: [],
    small_labels: []
  } as LabelPreviewData,

  // With error message
  withError: {
    full_labels: [validBase64Image],
    small_labels: [validBase64Image],
    error: "Preview generation warning: Low resolution"
  } as LabelPreviewData,

  // Large number of labels
  manyLabels: {
    full_labels: Array(50).fill(validBase64Image),
    small_labels: Array(50).fill(validBase64Image)
  } as LabelPreviewData
} as const;

// Invalid label preview data for validation testing
export const invalidLabelPreviews = {
  // Wrong types for arrays
  fullLabelsNotArray: {
    full_labels: "should be array",
    small_labels: [validBase64Image]
  },

  smallLabelsNotArray: {
    full_labels: [validBase64Image], 
    small_labels: "should be array"
  },

  // Arrays with wrong element types
  fullLabelsWrongElementType: {
    full_labels: [123, 456],
    small_labels: [validBase64Image]
  },

  smallLabelsWrongElementType: {
    full_labels: [validBase64Image],
    small_labels: [true, false]
  },

  // Error field with wrong type
  errorWrongType: {
    full_labels: [validBase64Image],
    small_labels: [validBase64Image],
    error: true // Should be string
  },

  // Missing required fields
  missingFullLabels: {
    small_labels: [validBase64Image]
  },

  missingSmallLabels: {
    full_labels: [validBase64Image]
  },

  // Null/undefined values
  nullFullLabels: {
    full_labels: null as any,
    small_labels: [validBase64Image]
  },

  undefinedSmallLabels: {
    full_labels: [validBase64Image],
    small_labels: undefined as any
  }
} as const;

// Valid print request data scenarios
export const validPrintRequests = {
  // Basic print request
  basic: {
    data: {
      text: "Test Label",
      shouldPrintFullLabel: true,
      shouldPrintSmallLabel: false
    }
  } as PrintRequest,

  // With printer ID
  withPrinterId: {
    data: {
      text: "Label with Printer",
      shouldPrintFullLabel: true,
      shouldPrintSmallLabel: true,
      printer_id: "printer_001"
    }
  } as PrintRequest,

  // Print both sizes
  bothSizes: {
    data: {
      text: "Print Both Sizes",
      shouldPrintFullLabel: true,
      shouldPrintSmallLabel: true
    }
  } as PrintRequest,

  // Print only small
  onlySmall: {
    data: {
      text: "Small Only",
      shouldPrintFullLabel: false,
      shouldPrintSmallLabel: true
    }
  } as PrintRequest,

  // Long text
  longText: {
    data: {
      text: "This is a very long label text that might wrap across multiple lines and test the handling of extended content in the label generation system",
      shouldPrintFullLabel: true,
      shouldPrintSmallLabel: false
    }
  } as PrintRequest,

  // Empty text (valid but might produce blank label)
  emptyText: {
    data: {
      text: "",
      shouldPrintFullLabel: true,
      shouldPrintSmallLabel: false
    }
  } as PrintRequest,

  // Special characters
  specialCharacters: {
    data: {
      text: "Special: ñáéíóú & €uro $ymbol",
      shouldPrintFullLabel: true,
      shouldPrintSmallLabel: false
    }
  } as PrintRequest,

  // Unicode characters
  unicodeText: {
    data: {
      text: "Unicode: プリンター 打印机 Принтер 🖨️",
      shouldPrintFullLabel: true,
      shouldPrintSmallLabel: false
    }
  } as PrintRequest
} as const;

// Invalid print request data for validation testing
export const invalidPrintRequests = {
  // Missing required fields
  missingText: {
    data: {
      shouldPrintFullLabel: true,
      shouldPrintSmallLabel: false
    }
  },

  missingShouldPrintFull: {
    data: {
      text: "Test",
      shouldPrintSmallLabel: false
    }
  },

  missingShouldPrintSmall: {
    data: {
      text: "Test",
      shouldPrintFullLabel: true
    }
  },

  missingData: {},

  // Wrong types
  textWrongType: {
    data: {
      text: 123, // Should be string
      shouldPrintFullLabel: true,
      shouldPrintSmallLabel: false
    }
  },

  shouldPrintFullWrongType: {
    data: {
      text: "Test",
      shouldPrintFullLabel: "yes", // Should be boolean
      shouldPrintSmallLabel: false
    }
  },

  shouldPrintSmallWrongType: {
    data: {
      text: "Test",
      shouldPrintFullLabel: true,
      shouldPrintSmallLabel: "no" // Should be boolean
    }
  },

  printerIdWrongType: {
    data: {
      text: "Test",
      shouldPrintFullLabel: true,
      shouldPrintSmallLabel: false,
      printer_id: 123 // Should be string
    }
  },

  dataWrongType: {
    data: "should be object" // Should be object
  },

  // Null/undefined values
  nullData: {
    data: null as any
  },

  undefinedText: {
    data: {
      text: undefined as any,
      shouldPrintFullLabel: true,
      shouldPrintSmallLabel: false
    }
  }
} as const;

// Edge cases for comprehensive testing
export const labelEdgeCases = {
  // Very long base64 strings
  longBase64: {
    full_labels: ["data:image/png;base64," + "A".repeat(10000)],
    small_labels: ["data:image/png;base64," + "B".repeat(5000)]
  } as LabelPreviewData,

  // Invalid base64 (but still strings)
  invalidBase64: {
    full_labels: ["data:image/png;base64,invalid-base64-content!!!"],
    small_labels: ["data:image/png;base64,also-invalid-123"]
  } as LabelPreviewData,

  // Different image formats in data URLs
  differentFormats: {
    full_labels: [
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
      "data:image/webp;base64,UklGRhIAAABXRUJQVlA4TAYAAAAvAAAAAA=="
    ],
    small_labels: [
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
    ]
  } as LabelPreviewData,

  // Empty strings in arrays
  emptyStringsInArrays: {
    full_labels: ["", validBase64Image, ""],
    small_labels: [validBase64Image, ""]
  } as LabelPreviewData,

  // Very long error message
  longErrorMessage: {
    full_labels: [validBase64Image],
    small_labels: [validBase64Image],
    error: "This is a very long error message that describes in great detail what went wrong during the label preview generation process, including technical details about the rendering engine, media compatibility, and system resource constraints that may have contributed to the issue. ".repeat(5)
  } as LabelPreviewData
} as const;

// Collections for easy test iteration
export const allValidLabelPreviews = Object.values(validLabelPreviews);
export const allInvalidLabelPreviews = Object.values(invalidLabelPreviews);
export const allValidPrintRequests = Object.values(validPrintRequests);
export const allInvalidPrintRequests = Object.values(invalidPrintRequests);
export const allLabelEdgeCases = Object.values(labelEdgeCases);

// Helper functions for test data creation
export const createLabelPreviewData = (overrides: Partial<LabelPreviewData> = {}): LabelPreviewData => ({
  full_labels: [validBase64Image],
  small_labels: [validBase64Image],
  ...overrides
});

export const createPrintRequest = (overrides: Partial<PrintRequest['data']> = {}): PrintRequest => ({
  data: {
    text: "Default Test Label",
    shouldPrintFullLabel: true,
    shouldPrintSmallLabel: false,
    ...overrides
  }
});

export const createMultipleLabelPreviews = (count: number): LabelPreviewData[] =>
  Array.from({ length: count }, () => 
    createLabelPreviewData({
      full_labels: [validBase64Image],
      small_labels: [validBase64Image]
    })
  );