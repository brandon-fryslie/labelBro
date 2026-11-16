import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { usePrinters } from '../hooks/usePrinters';
import { useLocalStorage } from '../hooks/useLocalStorage';

export function PrinterPanel(): React.ReactElement {
  const { state, setConnectionMode, setManualIp } = useApp();
  const {
    printers,
    selectedPrinterId,
    isDiscovering,
    connectionResults,
    discoverPrinters,
    connectManually,
    selectPrinter
  } = usePrinters();

  // Load stored preferences
  const [storedConnectionMode, setStoredConnectionMode] = useLocalStorage<'manual' | 'auto'>('labelBro_connectionMode', 'auto');
  const [storedManualIp, setStoredManualIp] = useLocalStorage<string>('labelBro_manualIp', '');

  // Initialize from localStorage and auto-discover
  useEffect(() => {
    // Default to auto mode if no stored preference
    const mode = storedConnectionMode || 'auto';
    setConnectionMode(mode);
    setManualIp(storedManualIp);

    // Auto-discover if in auto mode
    if (mode === 'auto') {
      discoverPrinters();
    }
  }, []);

  const handleConnectionModeChange = (mode: 'manual' | 'auto') => {
    setConnectionMode(mode);
    setStoredConnectionMode(mode);

    if (mode === 'auto') {
      discoverPrinters();
    }
  };

  const handleManualIpChange = (value: string) => {
    setManualIp(value);
    setStoredManualIp(value);
  };

  const handleManualConnect = async () => {
    if (state.manualIp) {
      await connectManually(state.manualIp);
    }
  };

  const handleSelectPrinter = (printerId: string) => {
    selectPrinter(printerId === selectedPrinterId ? null : printerId);
  };

  const connectButtonDisabled = !state.manualIp || isDiscovering;

  return (
    <div className={`printer-panel ${state.isPrinterPanelExpanded ? '' : 'hidden'}`}>
      <div className="printer-selection-container">
        <h3>Printer Connection</h3>

        {/* Connection Mode Selector */}
        <div className="connection-mode-selector">
          <button
            className={`mode-button ${state.connectionMode === 'auto' ? 'active' : ''}`}
            onClick={() => handleConnectionModeChange('auto')}
          >
            🔍 Auto Discovery
          </button>
          <button
            className={`mode-button ${state.connectionMode === 'manual' ? 'active' : ''}`}
            onClick={() => handleConnectionModeChange('manual')}
          >
            ⌨️ Manual IP
          </button>
        </div>

        <div className="connection-section">
          {state.connectionMode === 'manual' ? (
            <div className="manual-connection">
              <div className="ip-input-group">
                <input
                  type="text"
                  className="ip-input"
                  placeholder="Enter printer IP (e.g., 192.168.1.100)"
                  value={state.manualIp}
                  onChange={(e) => handleManualIpChange(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !connectButtonDisabled) {
                      handleManualConnect();
                    }
                  }}
                />
                <button
                  className="connect-button"
                  onClick={handleManualConnect}
                  disabled={connectButtonDisabled}
                >
                  {isDiscovering ? '⏳' : 'Connect'}
                </button>
              </div>
              {connectionResults && (
                <div className="connection-result">
                  {connectionResults}
                </div>
              )}
            </div>
          ) : (
            <div className="auto-discovery">
              {/* Available Printers */}
              {Object.keys(printers).length > 0 ? (
                <div className="printer-list">
                  {Object.entries(printers).map(([id, printer]) => (
                    <div
                      key={id}
                      className={`printer-item ${selectedPrinterId === id ? 'selected' : ''}`}
                      onClick={() => handleSelectPrinter(id)}
                    >
                      <div className="printer-info">
                        <div className="printer-icon">🖨️</div>
                        <div className="printer-details">
                          <h4>{printer.model}</h4>
                          <p>{printer.status}</p>
                        </div>
                      </div>
                      <div className="printer-status">
                        <span className={`status-dot ${printer.is_connected ? 'connected' : 'disconnected'}`}></span>
                        <span>{printer.is_connected ? 'Connected' : 'Offline'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-printers">
                  <p>{isDiscovering ? 'Searching for printers...' : 'No printers found'}</p>
                  <small>Click the button below to search again</small>
                </div>
              )}

              {/* Discover Button */}
              <button
                className="discover-button"
                onClick={discoverPrinters}
                disabled={isDiscovering}
              >
                {isDiscovering ? '⏳ Discovering...' : '🔄 Refresh Printers'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
