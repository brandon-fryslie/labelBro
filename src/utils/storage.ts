// Local storage utilities for printer preferences
export class StorageManager {
  private static readonly MANUAL_IP_KEY = 'labelBro_manualIP';
  private static readonly CONNECTION_MODE_KEY = 'labelBro_connectionMode';
  private static readonly SELECTED_PRINTER_KEY = 'labelBro_selectedPrinter';

  // Save manual IP to local storage
  static saveManualIP(ip: string): void {
    try {
      localStorage.setItem(this.MANUAL_IP_KEY, ip);
    } catch (error) {
      console.warn('Failed to save manual IP to localStorage:', error);
    }
  }

  // Get saved manual IP from local storage
  static getManualIP(): string {
    try {
      return localStorage.getItem(this.MANUAL_IP_KEY) || '';
    } catch (error) {
      console.warn('Failed to get manual IP from localStorage:', error);
      return '';
    }
  }

  // Save connection mode preference
  static saveConnectionMode(mode: 'manual' | 'auto'): void {
    try {
      localStorage.setItem(this.CONNECTION_MODE_KEY, mode);
    } catch (error) {
      console.warn('Failed to save connection mode to localStorage:', error);
    }
  }

  // Get saved connection mode preference (defaults to 'manual')
  static getConnectionMode(): 'manual' | 'auto' {
    try {
      const mode = localStorage.getItem(this.CONNECTION_MODE_KEY);
      return (mode === 'auto') ? 'auto' : 'manual';
    } catch (error) {
      console.warn('Failed to get connection mode from localStorage:', error);
      return 'manual';
    }
  }

  // Save selected printer info for manual connections
  static saveSelectedPrinter(printer: { ip: string; model: string; id: string }): void {
    try {
      localStorage.setItem(this.SELECTED_PRINTER_KEY, JSON.stringify(printer));
    } catch (error) {
      console.warn('Failed to save selected printer to localStorage:', error);
    }
  }

  // Get saved printer info
  static getSelectedPrinter(): { ip: string; model: string; id: string } | null {
    try {
      const stored = localStorage.getItem(this.SELECTED_PRINTER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to get selected printer from localStorage:', error);
      return null;
    }
  }

  // Clear selected printer when switching modes or on error
  static clearSelectedPrinter(): void {
    try {
      localStorage.removeItem(this.SELECTED_PRINTER_KEY);
    } catch (error) {
      console.warn('Failed to clear selected printer from localStorage:', error);
    }
  }
}