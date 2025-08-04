// API client for labelBro backend with runtime type validation
import type { 
  LabelPreviewData, 
  PrintersResponse, 
  DiscoveryResponse, 
  ManualConnectionResult,
  PrintRequest 
} from '../types';
import { TypeValidator, ValidationError, ValidationReporter } from '../validation';

// API endpoints
const API_ENDPOINT = '/previewLabels';
const PRINTERS_ENDPOINT = '/printers';
const DISCOVERY_ENDPOINT = '/printers/discover';
const PRINT_ENDPOINT = '/printLabels';
const TEST_ENDPOINT = '/printers/test';

export class LabelBroAPI {
  // Fetch label previews from the server with runtime validation
  static async fetchLabelPreviews(labelText: string): Promise<LabelPreviewData | null> {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          data: {
            text: labelText,
            shouldPrintFullLabel: (document.getElementById('printFullLabel') as HTMLInputElement).checked,
            shouldPrintSmallLabel: (document.getElementById('printSmallLabel') as HTMLInputElement).checked,
          } 
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawData = await response.json();
      
      // Runtime validation
      try {
        return TypeValidator.validateLabelPreviewData(rawData);
      } catch (error) {
        if (error instanceof ValidationError) {
          ValidationReporter.logValidationError(error);
          ValidationReporter.reportError(error);
        }
        throw error;
      }
    } catch (error) {
      console.error('Error fetching label previews:', error);
      return null;
    }
  }

  // Fetch current printer status with runtime validation
  static async fetchPrinters(): Promise<Record<string, import('../types').PrinterData> | null> {
    try {
      const response = await fetch(PRINTERS_ENDPOINT);
      const rawData = await response.json();
      
      if (!response.ok) {
        return null;
      }

      // Runtime validation with Typia
      try {
        const validatedData = TypeValidator.validatePrintersResponse(rawData);
        return validatedData.printers;
      } catch (error) {
        if (error instanceof ValidationError) {
          ValidationReporter.logValidationError(error);
          ValidationReporter.reportError(error);
        }
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
}