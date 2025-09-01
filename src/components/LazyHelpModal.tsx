import React, { Suspense } from 'react';
import { errorTracking } from '../utils/error-tracking';

// Lazy load HelpModal for code splitting
const HelpModal = React.lazy(() => 
  import('./HelpModal').then(module => ({ default: module.HelpModal }))
);

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Loading fallback component
function HelpModalSkeleton(): React.ReactElement {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Loading Help...</h2>
        </div>
        <div className="modal-body">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading help documentation...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Error boundary for lazy loaded component
class HelpModalErrorBoundary extends React.Component<
  { children: React.ReactNode; isOpen: boolean; onClose: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; isOpen: boolean; onClose: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('HelpModal lazy loading error:', error, errorInfo);
    
    // Report to Sentry with specific context
    errorTracking.captureComponentError(error, 'LazyHelpModal', {
      lazyLoading: true,
      componentStack: errorInfo.componentStack,
      errorType: 'lazy_component_load_failure',
      isOpen: this.props.isOpen
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Help Unavailable</h2>
              <button 
                onClick={this.props.onClose}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="error-message">
                <p>Unable to load help documentation at this time.</p>
                <p>Please check your connection and try again.</p>
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => {
                      errorTracking.captureMessage('User retried help modal after error', 'info', {
                        action: 'lazy_component_retry', 
                        component: 'HelpModal'
                      });
                      this.setState({ hasError: false });
                    }} 
                    className="retry-button"
                  >
                    Try Again
                  </button>
                  <button 
                    onClick={this.props.onClose}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Close
                  </button>
                </div>
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
export function LazyHelpModal({ isOpen, onClose }: HelpModalProps): React.ReactElement | null {
  // Don't render anything if modal is closed to avoid lazy loading unnecessarily
  if (!isOpen) return null;

  return (
    <HelpModalErrorBoundary isOpen={isOpen} onClose={onClose}>
      <Suspense fallback={<HelpModalSkeleton />}>
        <HelpModal isOpen={isOpen} onClose={onClose} />
      </Suspense>
    </HelpModalErrorBoundary>
  );
}