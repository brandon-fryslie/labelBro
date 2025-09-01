import React from 'react';
import { useApp } from '../context/AppContext';
import { useLabels } from '../hooks/useLabels';
import { usePrinters } from '../hooks/usePrinters';

interface ActionToolbarProps {
  onHelpClick: () => void;
  onHistoryToggle: () => void;
  isHistoryVisible: boolean;
}

export function ActionToolbar({ onHelpClick, onHistoryToggle, isHistoryVisible }: ActionToolbarProps): React.ReactElement {
  const { state } = useApp();
  const { printLabels } = useLabels();
  const { discoverPrinters, isDiscovering } = usePrinters();

  const canPrint = state.labelText.trim() && state.selectedPrinterId && 
                   (state.printFullLabel || state.printSmallLabel);

  const handlePrint = async () => {
    if (canPrint) {
      await printLabels();
    }
  };

  const handleRefresh = async () => {
    await discoverPrinters();
  };

  return (
    <div className="action-toolbar">
      {/* Primary Actions */}
      <div className="primary-actions">
        <button 
          className={`action-btn print-btn ${canPrint ? 'enabled' : 'disabled'}`}
          onClick={handlePrint}
          disabled={!canPrint}
          title={canPrint ? 'Print label(s)' : 'Select printer and enter text to print'}
        >
          <span className="btn-icon">🖨️</span>
          <span className="btn-text">Print</span>
        </button>
        
        <button 
          className={`action-btn refresh-btn ${isDiscovering ? 'loading' : ''}`}
          onClick={handleRefresh}
          disabled={isDiscovering}
          title="Refresh printer connection"
        >
          <span className="btn-icon">{isDiscovering ? '⏳' : '🔄'}</span>
          <span className="btn-text">{isDiscovering ? 'Scanning...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Secondary Actions */}
      <div className="secondary-actions">
        <button 
          className={`action-btn history-btn ${isHistoryVisible ? 'active' : ''}`}
          onClick={onHistoryToggle}
          title="Toggle label history panel"
        >
          <span className="btn-icon">📋</span>
          <span className="btn-text">History</span>
        </button>
        
        <button 
          className="action-btn help-btn"
          onClick={onHelpClick}
          title="Show help and instructions"
        >
          <span className="btn-icon">❓</span>
          <span className="btn-text">Help</span>
        </button>
      </div>
    </div>
  );
}