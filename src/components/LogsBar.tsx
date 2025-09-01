import React from 'react';
import { useApp } from '../context/AppContext';

export function LogsBar(): React.ReactElement {
  const { state, toggleLogsPanel } = useApp();

  return (
    <div className={`logs-bar ${state.isLogsPanelExpanded ? '' : 'collapsed'}`}>
      <div className="status-bar-content" onClick={toggleLogsPanel}>
        <span className="status-icon">{state.logsBarIcon}</span>
        <span className="status-text">{state.logsBarText}</span>
        <span className="expand-indicator">{state.isLogsPanelExpanded ? '▲' : '▼'}</span>
      </div>
      
      {/* Integrated LogsPanel */}
      <div className={`printer-panel ${state.isLogsPanelExpanded ? '' : 'hidden'}`}>
        <div className="printer-selection-container">
          <h3>Application Logs</h3>
          <div className="connection-section">
            <div className="logs-content">
              <p>Log messages will appear here...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
