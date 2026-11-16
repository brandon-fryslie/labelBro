// API communication module for the labelBro frontend
import {
  LabelPreviewData,
  PrintRequest,
  DiscoveryResponse,
  ManualConnectionResult
} from '../types';
import { TypeValidator, ValidationError, ValidationReporter } from '../validation';
import { PREVIEW_ENDPOINT, PRINTERS_ENDPOINT, PRINT_ENDPOINT, DISCOVERY_ENDPOINT, TEST_ENDPOINT } from './endpoints';

// [LAW:single-enforcer] Flask answers every failure with a non-2xx status and an {error} body; this is where that
// becomes a rejection. A body that is not Flask's JSON (e.g. the Vite proxy's 500 when Flask is down) keeps its status.
async function flaskJson(response: Response): Promise<any> {
  if (response.ok) {
    return response.json();
  }
  const body = await response.text();
  throw new Error(flaskErrorMessage(body) ?? `HTTP ${response.status} from ${response.url}${body ? `: ${body}` : ''}`);
}

function flaskErrorMessage(body: string): string | undefined {
  try {
    const { error } = JSON.parse(body);
    return typeof error === 'string' ? error : undefined;
  } catch {
    return undefined;
  }
}

export class LabelBroAPI {
  // Fetch label previews from the backend
  static async fetchLabelPreviews(labelData: any): Promise<LabelPreviewData> {
    const response = await fetch(PREVIEW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(labelData)
    });

    // [LAW:parse-dont-validate] the response is parsed here, at the boundary, so LabelPreview can trust its shape.
    // [LAW:one-source-of-truth] Flask's img_to_base64 already returns each label as a data: URL.
    const body = await flaskJson(response);
    try {
      return TypeValidator.validateLabelPreviewData(body);
    } catch (error) {
      if (error instanceof ValidationError) {
        ValidationReporter.reportError(error);
      }
      throw error;
    }
  }

  // Fetch current printers with runtime validation
  static async fetchPrinters(): Promise<Record<string, import('../types').PrinterData> | null> {
    try {
      const response = await fetch(PRINTERS_ENDPOINT, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const rawData = await response.json();

      // Runtime validation with Typia
      try {
        const validated = TypeValidator.validatePrintersResponse(rawData);
        return validated.printers;
      } catch (error) {
        if (error instanceof ValidationError) {
          ValidationReporter.logValidationError(error);
          ValidationReporter.reportError(error);
        } else if (error instanceof Error && error.message.includes('no transform has been configured')) {
          // Typia configuration error - send to backend for visibility
          const configError = new ValidationError(
            'Typia configuration error: ' + error.message,
            [],
            { configurationIssue: true, originalError: error.message }
          );
          ValidationReporter.logValidationError(configError);
          ValidationReporter.reportError(configError);

          // For now, return the raw data since validation can't work
          console.warn('⚠️ Typia validation disabled - returning unvalidated data');
          return rawData.printers || rawData || {};
        }
        // For fetchPrinters, return null on validation errors
        return null;
      }
    } catch (error) {
      console.error('Error fetching printers:', error);
      return null;
    }
  }

  // Discover printers on network with runtime validation and graceful degradation
  static async discoverPrinters(): Promise<DiscoveryResponse | null> {
    try {
      const response = await fetch(DISCOVERY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const rawData = await response.json();

      if (!response.ok) {
        // Even error responses should be validated
        try {
          const validatedError = TypeValidator.validateDiscoveryResponse(rawData);
          throw new Error(validatedError.error || 'Discovery failed');
        } catch (validationError) {
          if (validationError instanceof ValidationError) {
            ValidationReporter.logValidationError(validationError);
            ValidationReporter.reportError(validationError);
          }
          throw new Error('Discovery failed with invalid response format');
        }
      }

      // Runtime validation with Typia - use graceful degradation
      try {
        return TypeValidator.validateDiscoveryResponse(rawData);
      } catch (error) {
        if (error instanceof ValidationError) {
          ValidationReporter.logValidationError(error);
          ValidationReporter.reportError(error);

          // For discovery, use graceful degradation - return the data even if validation fails
          console.warn('⚠️ DiscoveryResponse validation failed - returning unvalidated data');
          return rawData as DiscoveryResponse;
        } else if (error instanceof Error && error.message.includes('no transform has been configured')) {
          // Typia configuration error - send to backend for visibility
          const configError = new ValidationError(
            'Typia configuration error: ' + error.message,
            [],
            { configurationIssue: true, originalError: error.message }
          );
          ValidationReporter.logValidationError(configError);
          ValidationReporter.reportError(configError);

          // For now, return the raw data since validation can't work
          console.warn('⚠️ Typia validation disabled - returning unvalidated data');
          return rawData as DiscoveryResponse;
        }
        throw error;
      }
    } catch (error) {
      console.error('Discovery error:', error);
      return null;
    }
  }

  // Print labels with input validation
  static async printLabels(request: PrintRequest): Promise<any> {
    // Validate input request
    try {
      TypeValidator.validatePrintRequest(request);
    } catch (error) {
      if (error instanceof ValidationError) {
        ValidationReporter.logValidationError(error);
        ValidationReporter.reportError(error);
      } else if (error instanceof Error && error.message.includes('no transform has been configured')) {
        // Typia configuration error - send to backend for visibility
        const configError = new ValidationError(
          'Typia configuration error: ' + error.message,
          [],
          { configurationIssue: true, originalError: error.message }
        );
        ValidationReporter.logValidationError(configError);
        ValidationReporter.reportError(configError);

        // For now, skip validation since it can't work
        console.warn('⚠️ Typia validation disabled - skipping input validation');
      } else {
        throw error;
      }
    }

    const response = await fetch(PRINT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    // Note: Print response structure is not strictly typed in original code
    // We could add validation here if the response structure is defined
    return flaskJson(response);
  }

  // Test manual connection with runtime validation and graceful degradation
  static async testManualConnection(target: string): Promise<ManualConnectionResult> {
    const response = await fetch(TEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ target })
    });

    // [LAW:no-silent-failure] Flask answers a failed test with {error}; that is a failure, not a result.
    const rawData = await flaskJson(response);

    // Runtime validation with Typia - use graceful error handling like other methods
    try {
      return TypeValidator.validateManualConnectionResult(rawData);
    } catch (error) {
      if (error instanceof ValidationError) {
        ValidationReporter.logValidationError(error);
        ValidationReporter.reportError(error);

        // Return raw data for graceful degradation
        console.warn('⚠️ ManualConnectionResult validation failed - returning unvalidated data');
        return rawData as ManualConnectionResult;
      } else if (error instanceof Error && error.message.includes('no transform has been configured')) {
        // Typia configuration error - send to backend for visibility
        const configError = new ValidationError(
          'Typia configuration error: ' + error.message,
          [],
          { configurationIssue: true, originalError: error.message }
        );
        ValidationReporter.logValidationError(configError);
        ValidationReporter.reportError(configError);

        // For now, return the raw data since validation can't work
        console.warn('⚠️ Typia validation disabled - returning unvalidated data');
        return rawData as ManualConnectionResult;
      }
      throw error;
    }
  }

  // Connect manually to a printer via IP
  static async connectManually(ipAddress: string): Promise<ManualConnectionResult> {
    return LabelBroAPI.testManualConnection(ipAddress);
  }
}
