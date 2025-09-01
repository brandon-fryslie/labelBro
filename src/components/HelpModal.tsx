import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps): React.ReactElement | null {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="help-modal-backdrop" 
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="help-modal">
        <div className="help-modal-header">
          <h2>LabelBro Help</h2>
          <button className="help-modal-close" onClick={onClose} aria-label="Close help">
            ✕
          </button>
        </div>
        
        <div className="help-modal-content">
          <section className="help-section">
            <h3>🏷️ Creating Labels</h3>
            <p>Enter your label text in the main text area. Each line creates one or more labels.</p>
            <ul>
              <li>Simple text: Just type what you want printed</li>
              <li>Multiple copies: Use format 'text; number' (e.g., 'My Stuff; 4')</li>
              <li>Multiple lines: Each line becomes a separate label</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>🖨️ Print Options</h3>
            <p>Configure your printing preferences above the text area:</p>
            <ul>
              <li><strong>Big Label:</strong> Print on larger label size</li>
              <li><strong>Small Label:</strong> Print on smaller label size</li>
              <li><strong>Clear after print:</strong> Automatically clear text after successful printing</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>🔗 Printer Connection</h3>
            <p>Connect to your Brother QL-800 printer:</p>
            <ul>
              <li><strong>Auto Discovery:</strong> Automatically finds printers on your network</li>
              <li><strong>Manual IP:</strong> Connect using a specific IP address</li>
              <li>Your printer selection is remembered between sessions</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>📋 History Panel</h3>
            <p>Access your recent labels using the clipboard icon:</p>
            <ul>
              <li>View your last 50 printed labels</li>
              <li>Click any item to reprint it</li>
              <li>History is saved locally in your browser</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>📱 Mobile Interface</h3>
            <p>Optimized for mobile devices:</p>
            <ul>
              <li>Tap the top bar to expand/collapse printer settings</li>
              <li>Tap the bottom bar to view application logs</li>
              <li>All buttons are touch-friendly</li>
              <li>History panel slides in from the right on mobile</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>⚡ Quick Tips</h3>
            <ul>
              <li>Labels preview automatically as you type</li>
              <li>Your settings are saved between browser sessions</li>
              <li>Use the floating print button for quick printing</li>
              <li>The status bar shows your connection state</li>
            </ul>
          </section>
        </div>

        <div className="help-modal-footer">
          <button className="help-modal-button" onClick={onClose}>
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}