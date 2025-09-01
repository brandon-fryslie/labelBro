import React, { Suspense } from 'react';
import { errorTracking } from '../utils/error-tracking';

// Lazy load HistoryPanel for code splitting
const HistoryPanel = React.lazy(() => 
  import('./HistoryPanel').then(module => ({ default: module.HistoryPanel }))
);

interface HistoryPanelProps {
  isVisible?: boolean;
  onToggle?: () => void;
}

// Loading fallback component
function HistoryPanelSkeleton({ isVisible = false }: { isVisible?: boolean }): React.ReactElement {
  return (
    <div className={`history-panel ${isVisible ? '' : 'hidden'}`}>
      <div className="history-header">
        <h3>History</h3>
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
      <div className="history-content">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading label history...</p>
        </div>
      </div>
    </div>
  );
}

// Error boundary for lazy loaded component
class HistoryPanelErrorBoundary extends React.Component<
  { children: React.ReactNode; isVisible?: boolean; onToggle?: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; isVisible?: boolean; onToggle?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('HistoryPanel lazy loading error:', error, errorInfo);
    
    // Report to Sentry with specific context
    errorTracking.captureComponentError(error, 'LazyHistoryPanel', {
      lazyLoading: true,
      componentStack: errorInfo.componentStack,
      errorType: 'lazy_component_load_failure',
      isVisible: this.props.isVisible
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className={`history-panel ${this.props.isVisible ? '' : 'hidden'}`}>
          <div className="history-header">
            <h3>History Error</h3>
            <button 
              onClick={this.props.onToggle}
              className="history-close-btn"
              aria-label="Close history panel"
            >
              ×
            </button>
          </div>
          <div className="history-content">
            <div className="error-message">
              <p>Unable to load label history at this time.</p>
              <p>Please check your connection and try again.</p>
              <div className="flex flex-col gap-2 mt-4">
                <button 
                  onClick={() => {
                    errorTracking.captureMessage('User retried history panel after error', 'info', {
                      action: 'lazy_component_retry', 
                      component: 'HistoryPanel'
                    });
                    this.setState({ hasError: false });
                  }} 
                  className="retry-button w-full"
                >
                  Try Again
                </button>
                <button 
                  onClick={this.props.onToggle}
                  className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                >
                  Close Panel
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main lazy wrapper component
export function LazyHistoryPanel({ isVisible = false, onToggle }: HistoryPanelProps): React.ReactElement {
  return (
    <HistoryPanelErrorBoundary isVisible={isVisible} onToggle={onToggle}>
      <Suspense fallback={<HistoryPanelSkeleton isVisible={isVisible} />}>
        <HistoryPanel isVisible={isVisible} onToggle={onToggle} />
      </Suspense>
    </HistoryPanelErrorBoundary>
  );
}