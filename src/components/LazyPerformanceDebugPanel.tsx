import React, { Suspense } from 'react';
import { errorTracking } from '../utils/error-tracking';

// Lazy load PerformanceDebugPanel for development-only feature
const PerformanceDebugPanel = React.lazy(() => 
  import('./PerformanceDebugPanel').then(module => ({ default: module.PerformanceDebugPanel }))
);

// Lightweight loading fallback for performance panel
function PerformanceDebugPanelSkeleton(): React.ReactElement {
  // Only show in development - return empty div in production
  if (!import.meta.env.DEV) {
    return <div style={{ display: 'none' }} />;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      padding: '8px',
      background: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      Loading performance panel...
    </div>
  );
}

// Error boundary for lazy loaded component
class PerformanceDebugPanelErrorBoundary extends React.Component<
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
    console.error('PerformanceDebugPanel lazy loading error:', error, errorInfo);
    
    // Report to Sentry with specific context
    errorTracking.captureComponentError(error, 'LazyPerformanceDebugPanel', {
      lazyLoading: true,
      componentStack: errorInfo.componentStack,
      errorType: 'lazy_component_load_failure',
      isDevelopment: import.meta.env.DEV
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Only show error in development
      if (import.meta.env.DEV) {
        return (
          <div style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            padding: '8px',
            background: '#ff6b6b',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            cursor: 'pointer'
          }}>
            Performance panel failed to load
          </div>
        );
      }
      return null;
    }

    return this.props.children;
  }
}

// Main lazy wrapper component
export function LazyPerformanceDebugPanel(): React.ReactElement {
  // Don't render anything in production to save bundle space
  if (!import.meta.env.DEV) {
    return <div style={{ display: 'none' }} />;
  }

  return (
    <PerformanceDebugPanelErrorBoundary>
      <Suspense fallback={<PerformanceDebugPanelSkeleton />}>
        <PerformanceDebugPanel />
      </Suspense>
    </PerformanceDebugPanelErrorBoundary>
  );
}