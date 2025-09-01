import React, { Suspense } from 'react';

// Lazy load PrinterPanel for code splitting
const PrinterPanel = React.lazy(() => 
  import('./PrinterPanel').then(module => ({ default: module.PrinterPanel }))
);

// Loading fallback component
function PrinterPanelSkeleton(): React.ReactElement {
  return (
    <div className="printer-panel">
      <div className="printer-selection-container">
        <h3>Loading Printer Connection...</h3>
        <div className="connection-mode-selector">
          <div className="mode-button loading">⏳ Loading...</div>
        </div>
        <div className="connection-section">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Initializing printer panel...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Error boundary for lazy loaded component
class PrinterPanelErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('PrinterPanel lazy loading error:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="printer-panel error">
          <div className="printer-selection-container">
            <h3>Printer Connection Error</h3>
            <div className="error-message">
              <p>Failed to load printer connection panel.</p>
              <button 
                onClick={() => window.location.reload()} 
                className="retry-button"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main lazy wrapper component
export function LazyPrinterPanel(): React.ReactElement {
  return (
    <PrinterPanelErrorBoundary>
      <Suspense fallback={<PrinterPanelSkeleton />}>
        <PrinterPanel />
      </Suspense>
    </PrinterPanelErrorBoundary>
  );
}