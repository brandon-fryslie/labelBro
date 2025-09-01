import React, { useState } from 'react';
import { AppProvider, useApp } from '../context/AppContext';
import { StatusBar } from './StatusBar';
import { PrinterPanel } from './PrinterPanel';
import { LogsBar } from './LogsBar';
import { LabelCreator } from './LabelCreator';
import { LabelPreview } from './LabelPreview';
import { ErrorDisplay } from './ErrorDisplay';
import { HistoryPanel } from './HistoryPanel';
import { HelpModal } from './HelpModal';
import { ActionToolbar } from './ActionToolbar';

function AppContent(): React.ReactElement {
  const { state, setHelpModal } = useApp();
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);

  const handleHelpClick = () => {
    setHelpModal(true);
  };

  const handleHelpClose = () => {
    setHelpModal(false);
  };

  const handleHistoryToggle = () => {
    setIsHistoryVisible(!isHistoryVisible);
  };

  return (
    <div className="app mobile-optimized">
      <ErrorDisplay />
      
      {/* Action Toolbar - Primary controls */}
      <ActionToolbar 
        onHelpClick={handleHelpClick}
        onHistoryToggle={handleHistoryToggle}
        isHistoryVisible={isHistoryVisible}
      />
      
      {/* Collapsible Top Bar - Printer Connectivity */}
      <div className="top-bar-section">
        <StatusBar />
        <PrinterPanel />
      </div>
      
      {/* Center Content - Text Input and Live Preview */}
      <div className="center-content">
        <div className="label-input-section">
          <LabelCreator />
        </div>
        
        <div className="label-preview-section">
          <LabelPreview />
        </div>
      </div>
      
      {/* History Panel - Slides in from right */}
      <HistoryPanel 
        isVisible={isHistoryVisible}
        onToggle={handleHistoryToggle}
      />
      
      {/* Help Modal */}
      <HelpModal 
        isOpen={state.isHelpModalOpen} 
        onClose={handleHelpClose} 
      />
      
      {/* Collapsible Bottom Bar - Logs */}
      <div className="bottom-bar-section">
        <LogsBar />
      </div>
      
      {/* Fixed Bottom Div */}
      <div className="fixed-bottom-div">
      </div>
    </div>
  );
}

export function App(): React.ReactElement {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}