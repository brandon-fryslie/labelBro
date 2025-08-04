// Main entry point for labelBro frontend application
import { LabelManager } from './ui/labels';
import { PrinterManager } from './ui/printers';
import { elements, logResponse } from './ui/dom';
import { TypeScriptErrorReporter } from './utils/error-reporter';

// Global functions for HTML onclick handlers
declare global {
  interface Window {
    refreshPrinters: () => Promise<void>;
    printLabels: () => Promise<void>;
    testManualConnection: () => Promise<void>;
  }
}

// Main initialization function
function init(): void {
  logResponse("initializing label bro");
  
  // Set up cross-system error reporting
  TypeScriptErrorReporter.setupGlobalErrorHandlers();
  
  // Initialize label management
  LabelManager.setupLabelTextAreaListener();
  
  // Initialize printer management
  PrinterManager.loadPrinters();
  PrinterManager.setupPrinterChangeListener();
  
  // Set up manual connection Enter key handler
  elements.manualTarget.addEventListener('keypress', function(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      PrinterManager.testManualConnection();
    }
  });
}

// Make functions available globally for HTML onclick handlers
window.refreshPrinters = PrinterManager.refreshPrinters.bind(PrinterManager);
window.printLabels = LabelManager.printLabels.bind(LabelManager);
window.testManualConnection = PrinterManager.testManualConnection.bind(PrinterManager);

// Initialize the application
init();