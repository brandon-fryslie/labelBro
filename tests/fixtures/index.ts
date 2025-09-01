// Centralized exports for all test fixtures
// This file provides a single import point for all test data

// Printer data fixtures
export * from './printer-data';

// Label and preview data fixtures  
export * from './label-data';

// Discovery and connection data fixtures
export * from './discovery-data';

// Re-export legacy fixtures for backward compatibility
// These will eventually be deprecated in favor of the new standardized fixtures
export {
  validPrinterData,
  invalidPrinterData,
  validPrintersResponse,
  invalidPrintersResponse,
  validLabelPreviewData,
  invalidLabelPreviewData,
  validDiscoveryResponse,
  invalidDiscoveryResponse,
  validManualConnectionResult,
  invalidManualConnectionResult,
  validPrintRequest,
  invalidPrintRequest,
  edgeCaseResponses
} from './api-responses';

// Fixture categories for easy test organization
export const fixtureCategories = {
  // Printer-related fixtures
  printers: {
    valid: [
      'basePrinterData',
      'completePrinterData', 
      'printerStatuses',
      'printerModels',
      'mediaTypes'
    ],
    invalid: [
      'invalidPrinterData'
    ],
    edgeCases: [
      'edgeCases'
    ]
  },

  // Label-related fixtures
  labels: {
    valid: [
      'validLabelPreviews',
      'validPrintRequests'
    ],
    invalid: [
      'invalidLabelPreviews', 
      'invalidPrintRequests'
    ],
    edgeCases: [
      'labelEdgeCases'
    ]
  },

  // Discovery-related fixtures
  discovery: {
    valid: [
      'validDiscoveryResponses',
      'validManualConnectionResults',
      'validPrintersResponses'
    ],
    invalid: [
      'invalidDiscoveryResponses',
      'invalidManualConnectionResults', 
      'invalidPrintersResponses'
    ],
    edgeCases: []
  }
} as const;

// Quick access collections
export const testDataCollections = {
  // All valid data for positive testing
  allValid: {
    printerData: 'allValidPrinterData',
    labelPreviews: 'allValidLabelPreviews', 
    printRequests: 'allValidPrintRequests',
    discoveryResponses: 'allValidDiscoveryResponses',
    manualConnections: 'allValidManualConnectionResults',
    printersResponses: 'allValidPrintersResponses'
  },

  // All invalid data for validation testing  
  allInvalid: {
    printerData: 'allInvalidPrinterData',
    labelPreviews: 'allInvalidLabelPreviews',
    printRequests: 'allInvalidPrintRequests', 
    discoveryResponses: 'allInvalidDiscoveryResponses',
    manualConnections: 'allInvalidManualConnectionResults',
    printersResponses: 'allInvalidPrintersResponses'
  },

  // Edge cases for comprehensive testing
  allEdgeCases: {
    printerData: 'allEdgeCases',
    labelData: 'allLabelEdgeCases'
  }
} as const;

// Helper function types for test data generation
export type FixtureHelpers = {
  createPrinterData: typeof import('./printer-data').createPrinterData;
  createLabelPreviewData: typeof import('./label-data').createLabelPreviewData;
  createPrintRequest: typeof import('./label-data').createPrintRequest;
  createDiscoveryResponse: typeof import('./discovery-data').createDiscoveryResponse;
  createManualConnectionResult: typeof import('./discovery-data').createManualConnectionResult;
  createPrintersResponse: typeof import('./discovery-data').createPrintersResponse;
};

// Usage documentation for test developers
export const fixtureUsageExamples = {
  // Basic usage examples
  basicUsage: `
    import { basePrinterData, validLabelPreviews } from '@tests/fixtures';
    
    // Use base printer data
    const printer = basePrinterData;
    
    // Use label preview data
    const preview = validLabelPreviews.singleLabel;
  `,

  // Validation testing examples
  validationTesting: `
    import { allInvalidPrinterData, invalidLabelPreviews } from '@tests/fixtures';
    
    // Test all invalid printer data scenarios
    allInvalidPrinterData.forEach(invalidData => {
      expect(() => validatePrinter(invalidData)).toThrow();
    });
    
    // Test specific invalid label scenario
    expect(() => validateLabels(invalidLabelPreviews.fullLabelsNotArray)).toThrow();
  `,

  // Helper functions examples
  helperFunctions: `
    import { createPrinterData, createDiscoveryResponse } from '@tests/fixtures';
    
    // Create custom printer data
    const customPrinter = createPrinterData({ 
      id: 'test_printer',
      model: 'Custom-Model'
    });
    
    // Create discovery response with multiple printers
    const discovery = createDiscoveryResponse(true, ['printer1', 'printer2'], {
      mdns: true,
      usb: false
    });
  `,

  // Edge case testing examples
  edgeCaseTesting: `
    import { edgeCases, labelEdgeCases } from '@tests/fixtures';
    
    // Test unicode handling
    expect(handlePrinter(edgeCases.unicodeCharacters)).toBeDefined();
    
    // Test long content
    expect(generatePreview(labelEdgeCases.longBase64)).toBeDefined();
  `
} as const;