import React, { useState } from 'react';
import { AppProvider, useApp } from '../context/AppContext';
import { StatusBar } from './StatusBar';
import { LazyPrinterPanel } from './LazyPrinterPanel';
import { LogsPanel } from './LogsPanel';
import { LabelCreator } from './LabelCreator';
import { LazyLabelPreview } from './LazyLabelPreview';
import { ErrorDisplay } from './ErrorDisplay';
import { HistoryPanel } from './HistoryPanel';
import { HelpModal } from './HelpModal';
import { ActionToolbar } from './ActionToolbar';
import { PerformanceDebugPanel } from './PerformanceDebugPanel';

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
        <LazyPrinterPanel />
      </div>
      
      {/* Center Content - Text Input and Live Preview */}
      <div className="center-content">
        <div className="label-input-section">
          <LabelCreator />
        </div>
        
        <div className="label-preview-section">
          <LazyLabelPreview />
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
      
      {/* Collapsible Bottom Log Panel - Fixed at bottom */}
      <LogsPanel />
      
      {/* Performance Debug Panel - Development only */}
      <PerformanceDebugPanel />
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