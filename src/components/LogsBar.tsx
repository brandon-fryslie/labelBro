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
              {state.logs.length === 0 ? (
                <p>No logs available</p>
              ) : (
                <div className="logs-list">
                  {state.logs.map((log) => {
                    const timestamp = new Date(log.timestamp).toLocaleTimeString();
                    const levelClass = `log-level-${log.level}`;

                    return (
                      <div key={log.id} className={`log-entry ${levelClass}`}>
                        <span className="log-timestamp">[{timestamp}]</span>
                        <span className="log-level">[{log.level.toUpperCase()}]</span>
                        {log.source && <span className="log-source">[{log.source}]</span>}
                        <span className="log-message">{log.message}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
