import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from '../context/AppContext';
import { GlobalErrorBoundary } from './GlobalErrorBoundary';
import { StatusBar } from './StatusBar';
import { LazyPrinterPanel } from './LazyPrinterPanel';
import { LazyLogsPanel } from './LazyLogsPanel';
import { LabelCreator } from './LabelCreator';
import { LazyLabelPreview } from './LazyLabelPreview';
import { ErrorDisplay } from './ErrorDisplay';
import { LazyHistoryPanel } from './LazyHistoryPanel';
import { LazyHelpModal } from './LazyHelpModal';
import { ActionToolbar } from './ActionToolbar';
import { LazyPerformanceDebugPanel } from './LazyPerformanceDebugPanel';

function AppContent(): React.ReactElement {
  const { state, setHelpModal, addLog } = useApp();
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);

  // Add initial application startup log
  useEffect(() => {
    addLog('Application initialized', 'info', 'App');
  }, [addLog]);

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
      <LazyHistoryPanel
        isVisible={isHistoryVisible}
        onToggle={handleHistoryToggle}
      />

      {/* Help Modal */}
      <LazyHelpModal
        isOpen={state.isHelpModalOpen}
        onClose={handleHelpClose}
      />

      {/* Collapsible Bottom Log Panel - Now connected to real logs from context */}
      <LazyLogsPanel logs={state.logs} />

      {/* Performance Debug Panel - Development only, lazy loaded */}
      <LazyPerformanceDebugPanel />
    </div>
  );
}

// Wrapper component to provide addLog to GlobalErrorBoundary
function AppWithErrorBoundary(): React.ReactElement {
  return (
    <AppProvider>
      <AppContentWithLogging />
    </AppProvider>
  );
}

function AppContentWithLogging(): React.ReactElement {
  const { addLog } = useApp();

  return (
    <GlobalErrorBoundary addLog={addLog}>
      <AppContent />
    </GlobalErrorBoundary>
  );
}

export function App(): React.ReactElement {
  return <AppWithErrorBoundary />;
}
