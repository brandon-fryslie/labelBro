import React from 'react';
import { useApp } from '../context/AppContext';

export function StatusBar(): React.ReactElement {
  const { state, togglePrinterPanel } = useApp();

  return (
    <div className={`printer-status-bar ${state.isPrinterPanelExpanded ? '' : 'collapsed'}`}>
      <div className="status-bar-content" onClick={togglePrinterPanel}>
        <span className="status-icon">{state.statusBarIcon}</span>
        <span className="status-text">{state.statusBarText}</span>
        <span className="expand-indicator">{state.isPrinterPanelExpanded ? '▲' : '▼'}</span>
      </div>
    </div>
  );
}