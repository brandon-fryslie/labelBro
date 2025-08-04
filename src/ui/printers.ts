// Printer management UI logic
import type { PrinterData, ManualConnectionResult, ManualConnectionStatusType } from '../types';
import { LabelBroAPI } from '../api';
import { elements, logResponse } from './dom';

export class PrinterManager {
  // Load available printers
  static async loadPrinters(): Promise<void> {
    try {
      const printers = await LabelBroAPI.fetchPrinters();
      if (!printers) {
        throw new Error('Failed to load printers');
      }
      this.populatePrinterDropdown(printers);
    } catch (error) {
      logResponse(`Error loading printers: ${(error as Error).message}`);
      elements.printerSelect.innerHTML = '<option value="">Error loading printers</option>';
    }
  }

  // Populate the printer dropdown
  static populatePrinterDropdown(printers: Record<string, PrinterData>): void {
    elements.printerSelect.innerHTML = '';

    const printerCount = Object.keys(printers).length;
    if (printerCount === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No printers found - click Refresh to discover';
      option.selected = true;
      elements.printerSelect.appendChild(option);
      this.updatePrinterStatus({});
      return;
    }

    let hasConnectedPrinter = false;
    for (const [printerId, printer] of Object.entries(printers)) {
      // Only show actually connected printers
      if (printer.is_connected) {
        const option = document.createElement('option');
        option.value = printerId;
        option.textContent = printer.display_name;

        if (!hasConnectedPrinter) {
          option.selected = true;
          hasConnectedPrinter = true;
        }

        elements.printerSelect.appendChild(option);
      }
    }

    if (!hasConnectedPrinter) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No available printers - click Refresh';
      option.selected = true;
      elements.printerSelect.appendChild(option);
    }

    this.updatePrinterStatus(printers);
  }

  // Update printer status display
  static updatePrinterStatus(printers: Record<string, PrinterData>): void {
    const selectedPrinterId = elements.printerSelect.value;
    if (!selectedPrinterId || !printers[selectedPrinterId]) {
      elements.printerStatus.innerHTML = '<span class="error">No printer selected</span>';
      return;
    }

    const printer = printers[selectedPrinterId];
    console.log(printer);
    const statusClass = printer.is_connected ? 'connected' : 'disconnected';
    const statusText = printer.is_connected ? 'Connected' : 'Disconnected';
    const displayId = printer.id;
    const mediaText = printer.media_info || 'No media info';

    elements.printerStatus.innerHTML = `
      <span class="${statusClass}">${statusText}</span> | 
      <span class="media-info">Media: ${mediaText}</span>
      <span class="displayId">ID: ${displayId}</span>
    `;
  }

  // Set up printer change listener
  static setupPrinterChangeListener(): void {
    elements.printerSelect.addEventListener('change', async () => {
      const printers = await LabelBroAPI.fetchPrinters();
      if (printers) {
        this.updatePrinterStatus(printers);
      }
    });
  }

  // Refresh printers with network discovery
  static async refreshPrinters(): Promise<void> {
    if (elements.refreshButton) {
      elements.refreshButton.disabled = true;
      elements.refreshButton.textContent = '🔄 Discovering...';
    }

    if (elements.discoveryStatus) {
      elements.discoveryStatus.textContent = 'Scanning network for printers...';
      elements.discoveryStatus.className = 'discovery-status discovering';
    }

    logResponse('Starting printer discovery...');

    try {
      const data = await LabelBroAPI.discoverPrinters();
      if (!data) {
        throw new Error('Discovery failed');
      }

      // Update the printer dropdown with discovered printers
      this.populatePrinterDropdown(data.printers);

      // Show discovery results
      const printerCount = Object.keys(data.printers).length;
      const connectedCount = Object.values(data.printers).filter(p => p.is_connected).length;

      if (elements.discoveryStatus) {
        elements.discoveryStatus.textContent = `Found ${printerCount} printers (${connectedCount} connected)`;
        elements.discoveryStatus.className = 'discovery-status success';
      }

      // Show discovery methods
      const methods = data.discovery_methods;
      const methodStatus: string[] = [];
      if (methods.mdns) methodStatus.push('mDNS');
      if (methods.network_scan) methodStatus.push('Network Scan');
      if (methods.usb) methodStatus.push('USB');

      logResponse(`Discovery complete: ${printerCount} printers found using ${methodStatus.join(', ')}`);

    } catch (error) {
      logResponse(`Discovery error: ${(error as Error).message}`);

      if (elements.discoveryStatus) {
        elements.discoveryStatus.textContent = `Discovery failed: ${(error as Error).message}`;
        elements.discoveryStatus.className = 'discovery-status error';
      }
    } finally {
      if (elements.refreshButton) {
        elements.refreshButton.disabled = false;
        elements.refreshButton.textContent = '🔄 Refresh';
      }

      // Clear discovery status after a delay
      if (elements.discoveryStatus) {
        setTimeout(() => {
          elements.discoveryStatus.textContent = '';
          elements.discoveryStatus.className = 'discovery-status';
        }, 5000);
      }
    }
  }

  // Manual connection testing
  static async testManualConnection(): Promise<void> {
    const target = elements.manualTarget.value.trim();

    if (!target) {
      this.showManualConnectionStatus('error', 'Please enter an IP address or subnet');
      return;
    }

    // Disable button and show testing status
    elements.testConnection.disabled = true;
    elements.testConnection.textContent = 'Testing...';
    this.showManualConnectionStatus('testing', `Testing connection to ${target}...`);
    elements.manualConnectionResults.innerHTML = '';

    try {
      const result = await LabelBroAPI.testManualConnection(target);
      this.handleManualConnectionResult(result);
    } catch (error) {
      this.showManualConnectionStatus('error', `Network error: ${(error as Error).message}`);
    } finally {
      // Re-enable button
      elements.testConnection.disabled = false;
      elements.testConnection.textContent = 'Test Connection';
    }
  }

  static showManualConnectionStatus(type: ManualConnectionStatusType, message: string): void {
    elements.manualConnectionStatus.className = `manual-connection-status ${type}`;
    elements.manualConnectionStatus.textContent = message;
  }

  static handleManualConnectionResult(result: ManualConnectionResult): void {
    if (result.success && result.printers_found.length > 0) {
      this.showManualConnectionStatus('success',
        `Found ${result.printers_found.length} Brother printer(s) at ${result.target}`);

      // Display printer details
      let resultsHtml = '';
      result.printers_found.forEach(printer => {
        const isValid = printer.media_loaded && printer.printer_ready;
        resultsHtml += `
          <div class="printer-result ${isValid ? 'valid' : 'invalid'}">
            <h4>${printer.model} at ${printer.ip}</h4>
            <div class="media-info">
              Model: ${printer.model}<br>
              ${printer.media_width ? `Media Width: ${printer.media_width}<br>` : ''}
              ${printer.media_type ? `Media Type: ${printer.media_type}<br>` : ''}
            </div>
            <div class="media-status ${printer.media_loaded ? 'loaded' : 'not-loaded'}">
              ${printer.media_loaded ? 
                `✓ Media loaded and ready` : 
                `⚠ No media detected or printer not ready`}
            </div>
            ${!isValid ? '<small>Note: Only printers with loaded media are considered valid connections</small>' : ''}
          </div>
        `;
      });
      elements.manualConnectionResults.innerHTML = resultsHtml;

    } else {
      if (result.error) {
        this.showManualConnectionStatus('error', result.error);
      } else {
        this.showManualConnectionStatus('error',
          `No Brother printers found at ${result.target}`);
      }
      elements.manualConnectionResults.innerHTML = '';
    }
  }
}