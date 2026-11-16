import { ValidationError } from '../../src/validation';

// Mock validation utilities
export const createValidationError = (
  message: string,
  errors: Array<{ path: string; expected: string; value: any }>,
  receivedData: any = {}
): ValidationError => {
  return new ValidationError(message, errors, receivedData);
};

// Common validation error scenarios
export const validationErrorScenarios = {
  missingField: (fieldName: string, receivedData: any = {}) =>
    createValidationError(
      `Validation failed: missing required field '${fieldName}'`,
      [{ path: fieldName, expected: 'required field', value: undefined }],
      receivedData
    ),

  wrongType: (fieldName: string, expectedType: string, actualValue: any, receivedData: any = {}) =>
    createValidationError(
      `Validation failed: '${fieldName}' must be ${expectedType}`,
      [{ path: fieldName, expected: expectedType, value: actualValue }],
      receivedData
    ),

  invalidEnum: (fieldName: string, validValues: string[], actualValue: any, receivedData: any = {}) =>
    createValidationError(
      `Validation failed: '${fieldName}' must be one of ${validValues.join(', ')}`,
      [{ path: fieldName, expected: `one of: ${validValues.join(', ')}`, value: actualValue }],
      receivedData
    )
};

// Mock validation responses
export const createMockValidationReporter = () => ({
  sendToBackend: vi.fn().mockResolvedValue({
    success: true,
    feedback_generated: true,
    feedback_id: 'mock-feedback-123'
  }),
  generateAIFeedback: vi.fn().mockReturnValue({
    summary: 'Mock validation error summary',
    suggestions: ['Mock suggestion 1', 'Mock suggestion 2'],
    severity: 'medium'
  })
});

// Utility to test validation error handling
export const expectValidationError = async (
  testFunction: () => Promise<any> | any,
  expectedErrorType?: string
) => {
  try {
    await testFunction();
    throw new Error('Expected validation error but none was thrown');
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    if (expectedErrorType) {
      expect((error as ValidationError).message).toContain(expectedErrorType);
    }
    return error as ValidationError;
  }
};

// Mock network validation scenarios
export const networkValidationMocks = {
  timeout: () => createValidationError(
    'Network timeout during validation',
    [{ path: 'network', expected: 'successful response', value: 'timeout' }],
    { timeout: true }
  ),

  malformedResponse: (response: any) => createValidationError(
    'Malformed API response',
    [{ path: 'response', expected: 'valid JSON structure', value: response }],
    response
  ),

  unauthorizedAccess: () => createValidationError(
    'Unauthorized API access',
    [{ path: 'auth', expected: 'valid credentials', value: 'unauthorized' }],
    { status: 401 }
  )
};