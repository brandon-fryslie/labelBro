import React from 'react';
import { useLabels } from '../hooks/useLabels';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface HistoryItem {
  id: string;
  text: string;
  timestamp: number;
  printOptions: {
    printFullLabel: boolean;
    printSmallLabel: boolean;
  };
}

interface HistoryPanelProps {
  isVisible?: boolean | undefined;
  onToggle?: (() => void) | undefined;
}

export function HistoryPanel({ isVisible = false, onToggle }: HistoryPanelProps): React.ReactElement {
  const { updateLabelText, setPrintFullLabel, setPrintSmallLabel } = useLabels();

  // History state
  const [printHistory, setPrintHistory] = useLocalStorage<HistoryItem[]>('labelBro_printHistory', []);

  const toggleHistory = () => {
    if (onToggle) {
      onToggle();
    }
  };

  const selectHistoryItem = (item: HistoryItem) => {
    updateLabelText(item.text);
    setPrintFullLabel(item.printOptions.printFullLabel);
    setPrintSmallLabel(item.printOptions.printSmallLabel);
    // Close history panel after selection on mobile
    if (window.innerWidth <= 768 && onToggle) {
      onToggle();
    }
  };

  const clearHistory = () => {
    setPrintHistory([]);
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Add current label to history when print is successful
  const addToHistory = (text: string, printOptions: { printFullLabel: boolean; printSmallLabel: boolean }) => {
    if (!text.trim()) return;

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      text: text.trim(),
      timestamp: Date.now(),
      printOptions
    };

    // Avoid duplicates and limit to 50 items
    const filteredHistory = printHistory.filter(item => item.text !== text.trim());
    const updatedHistory = [newItem, ...filteredHistory].slice(0, 50);
    setPrintHistory(updatedHistory);
  };

  // Expose addToHistory method globally for print success callback
  React.useEffect(() => {
    (window as any).addToLabelHistory = addToHistory;
    return () => {
      delete (window as any).addToLabelHistory;
    };
  }, [printHistory]);

  return (
    <>
      {/* History Panel */}
      <div className={`history-panel ${isVisible ? 'visible' : 'hidden'}`}>
        <div className="history-header">
          <h3>Label History</h3>
          <div className="history-actions">
            {printHistory.length > 0 && (
              <button
                className="clear-history-button"
                onClick={clearHistory}
                title="Clear all history"
              >
                🗑️
              </button>
            )}
            <button
              className="close-history-button"
              onClick={toggleHistory}
              aria-label="Close history"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="history-content">
          {printHistory.length === 0 ? (
            <div className="history-empty">
              <p>No labels printed yet</p>
              <small>Your print history will appear here</small>
            </div>
          ) : (
            <div className="history-list">
              {printHistory.map((item) => (
                <div
                  key={item.id}
                  className="history-item"
                  onClick={() => selectHistoryItem(item)}
                >
                  <div className="history-item-text">{item.text}</div>
                  <div className="history-item-meta">
                    <span className="history-item-time">{formatTimestamp(item.timestamp)}</span>
                    <div className="history-item-options">
                      {item.printOptions.printFullLabel && <span className="option-badge">Big</span>}
                      {item.printOptions.printSmallLabel && <span className="option-badge">Small</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isVisible && <div className="history-backdrop" onClick={toggleHistory} />}
    </>
  );
}
