# Test Fixtures Documentation

This directory contains standardized test data fixtures for the labelBro application. The fixtures are organized by domain and provide comprehensive test scenarios including valid data, validation failures, and edge cases.

## 🗂️ Fixture Organization

### Core Fixture Files

| File | Purpose | Key Exports |
|------|---------|-------------|
| **`printer-data.ts`** | Printer data scenarios | `basePrinterData`, `printerStatuses`, `printerModels`, `invalidPrinterData` |
| **`label-data.ts`** | Label and preview data | `validLabelPreviews`, `validPrintRequests`, `invalidLabelPreviews` |
| **`discovery-data.ts`** | Discovery and connection data | `validDiscoveryResponses`, `validManualConnectionResults` |
| **`index.ts`** | Centralized exports | All fixtures + helper functions + usage examples |
| **`api-responses.ts`** | Legacy fixtures (deprecated) | Backward compatibility only |

### 📋 Fixture Categories

Each fixture file provides three main categories:

1. **Valid Data** - For positive testing scenarios
2. **Invalid Data** - For validation and error handling testing  
3. **Edge Cases** - For comprehensive boundary testing

## 🚀 Quick Start

### Basic Usage

```typescript
import { basePrinterData, validLabelPreviews, validDiscoveryResponses } from '@tests/fixtures';

// Use base printer data in tests
test('should handle printer data', () => {
  const result = processPrinter(basePrinterData);
  expect(result).toBeDefined();
});

// Use label preview data
test('should process label previews', () => {
  const result = generatePreview(validLabelPreviews.singleLabel);
  expect(result.full_labels).toHaveLength(1);
});
```

### Validation Testing

```typescript
import { allInvalidPrinterData, invalidLabelPreviews } from '@tests/fixtures';

// Test all invalid printer scenarios
test('should reject invalid printer data', () => {
  allInvalidPrinterData.forEach(invalidData => {
    expect(() => validatePrinter(invalidData)).toThrow();
  });
});

// Test specific validation failure
test('should reject malformed label data', () => {
  expect(() => validateLabels(invalidLabelPreviews.fullLabelsNotArray))
    .toThrow('full_labels must be an array');
});
```

### Custom Data Creation

```typescript
import { createPrinterData, createDiscoveryResponse, createPrintRequest } from '@tests/fixtures';

// Create custom printer with specific properties
const customPrinter = createPrinterData({
  id: 'test_printer_custom',
  model: 'Test-Model-X',
  status: 'busy'
});

// Create discovery response with multiple printers
const multiPrinterDiscovery = createDiscoveryResponse(
  true, // success
  ['printer1', 'printer2', 'printer3'], // printer IDs
  { mdns: true, usb: false } // discovery methods
);

// Create print request with custom text
const printRequest = createPrintRequest({
  text: 'Custom Label Text',
  shouldPrintFullLabel: true
});
```

## 📊 Fixture Details

### Printer Data (`printer-data.ts`)

#### Valid Scenarios
- **`basePrinterData`** - Minimal valid printer data
- **`completePrinterData`** - Full printer data with all optional fields
- **`printerStatuses`** - Different printer status scenarios (ready, offline, busy, error, no_media)
- **`printerModels`** - Various Brother printer models (QL-800, QL-810W, QL-820NWB)
- **`mediaTypes`** - Different media configurations (continuous, die-cut, no media)

#### Invalid Scenarios
- Missing required fields (id, display_name, model, status)
- Wrong data types (string vs boolean, number vs string)
- Invalid optional field types

#### Edge Cases
- Empty strings, very long strings, special characters, Unicode
- Null/undefined optional fields

#### Helper Functions
```typescript
createPrinterData(overrides?: Partial<PrinterData>): PrinterData
createPrinterWithId(id: string): PrinterData  
createMultiplePrinters(count: number): PrinterData[]
```

### Label Data (`label-data.ts`)

#### Valid Scenarios
- **`validLabelPreviews`** - Various label preview configurations
- **`validPrintRequests`** - Different print request scenarios

#### Preview Types
- Single/multiple labels
- Full labels only, small labels only, both
- Empty labels, labels with errors
- Special characters, Unicode text

#### Print Request Types  
- Basic requests, with printer ID
- Both label sizes, single size only
- Long text, empty text, special characters

#### Helper Functions
```typescript
createLabelPreviewData(overrides?: Partial<LabelPreviewData>): LabelPreviewData
createPrintRequest(overrides?: Partial<PrintRequest['data']>): PrintRequest
createMultipleLabelPreviews(count: number): LabelPreviewData[]
```

### Discovery Data (`discovery-data.ts`)

#### Discovery Responses
- Successful discovery with various printer configurations
- Discovery method combinations (MDNS, network scan, USB)
- Failed discovery scenarios
- Empty results, warnings, errors

#### Manual Connection Results
- Successful connections with found printers
- Connection failures (timeout, DNS, port closed)
- Multiple printers found, no printers found

#### Helper Functions
```typescript
createDiscoveryResponse(success?, printerIds?, methods?): DiscoveryResponse
createManualConnectionResult(success?, target?, overrides?): ManualConnectionResult
createPrintersResponse(printerCount?): PrintersResponse
```

## 🧪 Testing Patterns

### Comprehensive Validation Testing

```typescript
import { allInvalidPrinterData, allInvalidLabelPreviews } from '@tests/fixtures';

describe('Data Validation', () => {
  test.each(allInvalidPrinterData)('should reject invalid printer data: %#', (invalidData) => {
    expect(() => validatePrinter(invalidData)).toThrow();
  });
  
  test.each(allInvalidLabelPreviews)('should reject invalid label data: %#', (invalidData) => {
    expect(() => validateLabels(invalidData)).toThrow();
  });
});
```

### Edge Case Testing

```typescript
import { edgeCases, labelEdgeCases } from '@tests/fixtures';

describe('Edge Cases', () => {
  test('should handle Unicode characters', () => {
    expect(() => processPrinter(edgeCases.unicodeCharacters)).not.toThrow();
  });
  
  test('should handle very long base64 data', () => {
    expect(() => processLabels(labelEdgeCases.longBase64)).not.toThrow();
  });
});
```

### Scenario-Based Testing

```typescript
import { printerStatuses, validDiscoveryResponses } from '@tests/fixtures';

describe('Printer Status Handling', () => {
  test('should connect to ready printer', () => {
    const result = connectToPrinter(printerStatuses.ready);
    expect(result.success).toBe(true);
  });
  
  test('should handle offline printer gracefully', () => {
    const result = connectToPrinter(printerStatuses.offline);
    expect(result.success).toBe(false);
    expect(result.error).toContain('offline');
  });
});
```

## 📈 Best Practices

### 1. Use Appropriate Fixture Types
- **Valid data** for happy path testing
- **Invalid data** for validation testing  
- **Edge cases** for boundary testing
- **Custom creation** for specific scenarios

### 2. Leverage Collections
```typescript
// Test all scenarios in a category
allValidPrinterData.forEach(printerData => {
  // Test with each valid printer configuration
});

// Use parameterized tests for better reporting
test.each(allInvalidPrintRequests)('should validate print request', (invalidRequest) => {
  expect(() => validatePrintRequest(invalidRequest)).toThrow();
});
```

### 3. Create Focused Test Data
```typescript
// Instead of modifying existing fixtures, create targeted data
const printerWithSpecificIssue = createPrinterData({
  status: 'error',
  media_loaded: false,
  error_message: 'Paper jam detected'
});
```

### 4. Test Data Consistency
- All fixtures follow TypeScript interfaces exactly
- Invalid data intentionally violates specific validation rules
- Edge cases test realistic boundary conditions

## 🔄 Migration from Legacy Fixtures

### Old Pattern (Deprecated)
```typescript
import { validPrinterData, invalidPrinterData } from './fixtures/api-responses';
```

### New Pattern (Recommended)
```typescript
// Option 1: Import from specific domain files
import { basePrinterData, invalidPrinterData } from './fixtures/printer-data';

// Option 2: Import from centralized index
import { basePrinterData, invalidPrinterData } from './fixtures';

// Option 3: Use helper functions for custom data
import { createPrinterData } from './fixtures';
const customPrinter = createPrinterData({ id: 'custom', model: 'Custom' });
```

## 🛠️ Extending Fixtures

### Adding New Scenarios

1. **Add to appropriate domain file** (printer-data.ts, label-data.ts, etc.)
2. **Export in collections** (`allValid*`, `allInvalid*`)
3. **Update index.ts exports**
4. **Add documentation** to this README

### Example: Adding New Printer Model
```typescript
// In printer-data.ts
export const printerModels = {
  // ... existing models
  ql1110nwb: {
    ...basePrinterData,
    id: "printer_ql1110nwb",
    model: "QL-1110NWB",
    model_number: "QL-1110NWB-V1", 
    display_name: "Brother QL-1110NWB"
  }
} as const;
```

## 🔍 Fixture Validation

All fixtures are validated against TypeScript interfaces to ensure:
- **Type safety** - Fixtures match expected interfaces
- **Completeness** - Required fields are present
- **Consistency** - Similar scenarios follow same patterns
- **Coverage** - Edge cases cover realistic boundaries

Run fixture validation tests:
```bash
npm run test:fixtures  # Validates all fixture data
npm run test:coverage  # Includes fixture coverage analysis
```

## 📚 Related Documentation

- **[Type Definitions](../../src/types/index.ts)** - TypeScript interfaces
- **[Validation Rules](../../src/validation/index.ts)** - Data validation logic
- **[Test Utilities](../utils/test-utils.tsx)** - Testing helper functions
- **[Coverage Analysis](../COVERAGE_VALIDATION_REPORT.md)** - Test coverage insights

---

**Last Updated:** Auto-generated during fixture standardization (TE-003)  
**Maintainer:** Test Infrastructure Team  
**Review Cycle:** Updated with each new fixture or major type change