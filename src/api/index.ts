// API communication module for the labelBro frontend
import { 
  LabelPreviewData, 
  PrintersResponse, 
  PrintRequest, 
  DiscoveryResponse, 
  ManualConnectionResult 
} from '../types';
import { TypeValidator, ValidationError, ValidationReporter } from '../validation';

// API endpoints - we'll use relative URLs for same-origin requests
const API_BASE = '/api';
const PREVIEW_ENDPOINT = `${API_BASE}/preview`;
const PRINTERS_ENDPOINT = `${API_BASE}/printers`;
const PRINT_ENDPOINT = `${API_BASE}/print`;
const DISCOVERY_ENDPOINT = `${API_BASE}/discover`;
const TEST_ENDPOINT = `${API_BASE}/test-connection`;

export class LabelBroAPI {
  // Fetch label previews from the backend
  static async fetchLabelPreviews(text: string): Promise<LabelPreviewData> {
    const response = await fetch(PREVIEW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });

    const data = await response.json();
    
    // Convert base64 strings to data URLs for image display
    if (data.full_labels) {
      data.full_labels = data.full_labels.map((base64: string) => 
        `data:image/png;base64,${base64}`
      );
    }
    if (data.small_labels) {
      data.small_labels = data.small_labels.map((base64: string) => 
        `data:image/png;base64,${base64}`
      );
    }

    return data;
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
          return rawData.printers || {};
        }
        ValidationReporter.reportError(error as ValidationError);
        throw error;
      }
    } catch (error) {
      console.error('Error fetching printers:', error);
      return null;
    }
  }

  // Discover printers on network with runtime validation
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

      // Runtime validation with Typia
      try {
        return TypeValidator.validateDiscoveryResponse(rawData);
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
    return await response.json();
  }

  // Test manual connection with runtime validation
  static async testManualConnection(target: string): Promise<ManualConnectionResult> {
    const response = await fetch(TEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ target })
    });

    const rawData = await response.json();

    // Runtime validation with Typia
    try {
      return TypeValidator.validateManualConnectionResult(rawData);
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