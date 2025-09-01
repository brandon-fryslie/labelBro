import React from 'react';
import { useApp } from '../context/AppContext';

export function LogsPanel(): React.ReactElement {
  const { state } = useApp();

  return (
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
  );
}