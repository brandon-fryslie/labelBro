import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { usePrinters } from '../hooks/usePrinters';
import { useStoredConnectionMode, useStoredManualIp } from '../hooks/useLocalStorage';

export function PrinterPanel(): React.ReactElement {
  const { state, setConnectionMode, setManualIp } = useApp();
  const { 
    printers, 
    selectedPrinterId, 
    isDiscovering, 
    connectionStatus, 
    connectionResults,
    discoverPrinters, 
    testManualConnection, 
    setSelectedPrinter 
  } = usePrinters();

  // Load stored preferences
  const [storedConnectionMode, setStoredConnectionMode] = useStoredConnectionMode();
  const [storedManualIp, setStoredManualIp] = useStoredManualIp();

  // Initialize from localStorage and auto-discover
  useEffect(() => {
    // Default to auto mode if no stored preference
    const mode = storedConnectionMode || 'auto';
    setConnectionMode(mode);
    setManualIp(storedManualIp);
    
    // Auto-discover on page load if in auto mode
    if (mode === 'auto') {
      discoverPrinters();
    }
  }, [setConnectionMode, setManualIp, storedConnectionMode, storedManualIp, discoverPrinters]);

  const handleModeChange = (mode: 'manual' | 'auto') => {
    setConnectionMode(mode);
    setStoredConnectionMode(mode);
  };

  const handleManualIpChange = (ip: string) => {
    setManualIp(ip);
    setStoredManualIp(ip);
  };

  const handleConnect = async () => {
    if (state.manualIp.trim()) {
      await testManualConnection(state.manualIp.trim());
    }
  };

  const handleRefresh = async () => {
    await discoverPrinters();
  };

  const handlePrinterSelection = (printerId: string | null) => {
    setSelectedPrinter(printerId);
    // Store selected printer in localStorage
    if (printerId) {
      localStorage.setItem('labelBro_selectedPrinter', printerId);
    } else {
      localStorage.removeItem('labelBro_selectedPrinter');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleConnect();
    }
  };

  return (
    <div className={`printer-panel ${state.isPrinterPanelExpanded ? '' : 'hidden'}`}>
      <div className="printer-selection-container">
        <div className="printer-connection-mode">
          <h3>Printer Connection</h3>
          <div className="connection-mode-selector">
            <label className="radio-label">
              <input
                type="radio"
                name="connectionMode"
                value="manual"
                checked={state.connectionMode === 'manual'}
                onChange={() => handleModeChange('manual')}
              />
              Manual IP Address
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="connectionMode"
                value="auto"
                checked={state.connectionMode === 'auto'}
                onChange={() => handleModeChange('auto')}
              />
              Auto Discovery
            </label>
          </div>
        </div>

        {state.connectionMode === 'manual' && (
          <div className="connection-section">
            <div className="manual-connection-header">
              <h4>Manual IP Connection</h4>
              <small>Enter printer IP address (e.g., 192.168.1.100)</small>
            </div>
            <div className="manual-connection-input">
              <input
                type="text"
                value={state.manualIp}
                onChange={(e) => handleManualIpChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="192.168.1.100"
                disabled={isDiscovering}
              />
              <button onClick={handleConnect} disabled={isDiscovering || !state.manualIp.trim()}>
                {isDiscovering ? 'Connecting...' : 'Connect'}
              </button>
            </div>
            <div className="manual-connection-status">{connectionStatus}</div>
            <div className="manual-connection-results">{connectionResults}</div>
          </div>
        )}

        {state.connectionMode === 'auto' && (
          <div className="connection-section">
            <div className="printer-selector">
              <div className="printer-selector-header">
                <label htmlFor="printerSelect">Auto-Discovered Printers:</label>
                <button className="refresh-button" onClick={handleRefresh} disabled={isDiscovering}>
                  🔄 {isDiscovering ? 'Discovering...' : 'Refresh'}
                </button>
              </div>
              <select
                value={selectedPrinterId || ''}
                onChange={(e) => handlePrinterSelection(e.target.value || null)}
                disabled={isDiscovering}
              >
                {Object.keys(printers).length === 0 ? (
                  <option value="">{isDiscovering ? 'Discovering printers...' : 'No printers found - click Refresh'}</option>
                ) : (
                  <>
                    <option value="">Select a printer...</option>
                    {Object.entries(printers).map(([id, printer]) => (
                      <option key={id} value={id}>
                        {printer.display_name} {printer.is_connected ? '✅' : '❌'}
                      </option>
                    ))}
                  </>
                )}
              </select>
              <div className="printer-status">
                {selectedPrinterId && printers[selectedPrinterId] && (
                  <div>
                    Status: {printers[selectedPrinterId].is_connected ? 'Connected' : 'Disconnected'}
                    {printers[selectedPrinterId].media_info && (
                      <div>Media: {printers[selectedPrinterId].media_info}</div>
                    )}
                  </div>
                )}
              </div>
              <div className="discovery-status">{connectionResults}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}