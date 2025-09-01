import React, { useState, useRef, useEffect } from 'react';
import { LogEntry } from '../types';

interface LogsPanelProps {
  logs: LogEntry[];
}

export function LogsPanel({ logs }: LogsPanelProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Get latest logs for collapsed view (showing most recent 1-2)
  const latestLogs = logs.slice(0, 2);
  
  // Handle click outside to collapse
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isExpanded && panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };
    
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    
    // Explicitly return undefined for the else case
    return undefined;
  }, [isExpanded]);
  
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };
  
  const handleClose = () => {
    setIsExpanded(false);
  };

  // Format timestamp
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  // Get log level styling
  const getLevelStyling = (level: 'info' | 'warning' | 'error' | 'debug') => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'debug':
        return 'text-gray-500 bg-gray-50 border-gray-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const renderLogEntry = (log: LogEntry, index: number) => (
    <div
      key={`${log.timestamp.getTime()}-${index}`}
      className={`px-3 py-2 rounded border ${getLevelStyling(log.level)} text-sm`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium capitalize">{log.level}</span>
        <span className="text-xs opacity-75">{formatTime(log.timestamp)}</span>
      </div>
      <div className="font-mono text-xs break-words">
        {log.message}
      </div>
      {log.data && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium opacity-75">
            Additional Data
          </summary>
          <pre className="mt-1 text-xs opacity-75 whitespace-pre-wrap break-words">
            {JSON.stringify(log.data, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-gray-100 border-t p-3 text-center text-gray-500 text-sm">
        No logs available
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className={`bg-white border-t transition-all duration-300 ${
        isExpanded ? 'max-h-80' : 'max-h-20'
      } overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            System Logs ({logs.length})
          </span>
          {!isExpanded && logs.length > 0 && (
            <span className="text-xs text-gray-500">
              • {logs[0] && formatTime(logs[0].timestamp)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isExpanded && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded"
              title="Close"
            >
              ✕
            </button>
          )}
          <button
            onClick={toggleExpanded}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {/* Logs Content */}
      <div className="overflow-y-auto max-h-60">
        <div className="p-3 space-y-2">
          {isExpanded ? (
            logs.map((log, index) => renderLogEntry(log, index))
          ) : (
            latestLogs.map((log, index) => renderLogEntry(log, index))
          )}
        </div>
      </div>
    </div>
  );
}