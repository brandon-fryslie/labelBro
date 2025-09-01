// API communication module for the labelBro frontend
import { 
  LabelPreviewData, 
  PrintersResponse, 
  PrintRequest, 
  DiscoveryResponse, 
  ManualConnectionResult 
} from '../types';
import { TypeValidator, ValidationError, ValidationReporter } from '../validation';

// API endpoints - match Flask backend routes
const API_BASE = 'http://localhost:5100';
const PREVIEW_ENDPOINT = `${API_BASE}/previewLabels`;
const PRINTERS_ENDPOINT = `${API_BASE}/printers`;
const PRINT_ENDPOINT = `${API_BASE}/printLabels`;
const DISCOVERY_ENDPOINT = `${API_BASE}/printers/discover`;
const TEST_ENDPOINT = `${API_BASE}/printers/test`;

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

    const data = await response.json();
    
    // Convert base64 strings to data URLs for image display (with defensive checks)
    if (data.full_labels && Array.isArray(data.full_labels)) {
      data.full_labels = data.full_labels.map((base64: string) => 
        `data:image/png;base64,${base64}`
      );
    }
    if (data.small_labels && Array.isArray(data.small_labels)) {
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
          return rawData.printers || rawData || {};
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

    // Check if response exists before calling .json()
    if (!response) {
      throw new Error('No response received from server');
    }

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