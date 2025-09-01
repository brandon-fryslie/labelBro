import React, { Suspense } from 'react';
import { errorTracking } from '../utils/error-tracking';

// Lazy load LabelPreview for code splitting
const LabelPreview = React.lazy(() => 
  import('./LabelPreview').then(module => ({ default: module.LabelPreview }))
);

// Loading fallback component
function LabelPreviewSkeleton(): React.ReactElement {
  return (
    <div className="previews-container">
      <h2>Preview</h2>
      <div className="flex-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading label preview...</p>
        </div>
      </div>
    </div>
  );
}

// Error boundary for lazy loaded component
class LabelPreviewErrorBoundary extends React.Component<
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
    console.error('LabelPreview lazy loading error:', error, errorInfo);
    
    // Report to Sentry with specific context
    errorTracking.captureComponentError(error, 'LazyLabelPreview', {
      lazyLoading: true,
      componentStack: errorInfo.componentStack,
      errorType: 'lazy_component_load_failure'
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="previews-container error">
          <h2>Preview Error</h2>
          <div className="error-message">
            <p>Failed to load label preview component.</p>
            <button 
              onClick={() => {
                errorTracking.captureMessage('User retried label preview after error', 'info', {
                  action: 'lazy_component_retry', 
                  component: 'LabelPreview'
                });
                this.setState({ hasError: false });
              }} 
              className="retry-button"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main lazy wrapper component
export function LazyLabelPreview(): React.ReactElement {
  return (
    <LabelPreviewErrorBoundary>
      <Suspense fallback={<LabelPreviewSkeleton />}>
        <LabelPreview />
      </Suspense>
    </LabelPreviewErrorBoundary>
  );
}