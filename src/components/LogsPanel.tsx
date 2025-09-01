import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';

interface LogsPanelProps {
  logs?: string[];
}

export function LogsPanel({ logs: propLogs }: LogsPanelProps): React.ReactElement {
  const { state } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Use prop logs or state logs
  const logs = propLogs || state.logs || [];
  
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
  }, [isExpanded]);
  
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };
  
  const handleClose = () => {
    setIsExpanded(false);
  };
  
  return (
    <div 
      ref={panelRef}
      className={`fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg transition-all duration-300 ease-in-out z-40 ${
        isExpanded ? 'h-1/2' : 'h-12'
      }`}
    >
      {/* Collapsed Bar */}
      {!isExpanded && (
        <div 
          className="h-full px-4 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
          onClick={toggleExpanded}
        >
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Logs:</span>
              {latestLogs.length > 0 ? (
                <div className="flex-1 overflow-hidden">
                  <div className="text-xs text-gray-700 truncate">
                    {latestLogs[0]}
                  </div>
                  {latestLogs.length > 1 && (
                    <div className="text-xs text-gray-500 truncate">
                      {latestLogs[1]}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-xs text-gray-400">No logs yet</span>
              )}
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600 text-xs">
            ▲ View All
          </button>
        </div>
      )}
      
      {/* Expanded Panel */}
      {isExpanded && (
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">System Logs</h3>
            <button
              onClick={handleClose}
              className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
              aria-label="Close logs"
            >
              ✕
            </button>
          </div>
          
          {/* Scrollable Log Content */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-900">
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">No logs to display</p>
                <p className="text-gray-500 text-xs mt-1">System logs will appear here</p>
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div 
                    key={index}
                    className="font-mono text-xs leading-relaxed"
                  >
                    <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span>
                    <span className="text-green-400 ml-2">{log}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}