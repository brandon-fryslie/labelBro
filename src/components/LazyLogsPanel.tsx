import React, { Suspense } from 'react';
import { LogEntry } from '../types';
import { errorTracking } from '../utils/error-tracking';

// Lazy load LogsPanel for better initial page load performance
const LogsPanel = React.lazy(() => 
  import('./LogsPanel').then(module => ({ default: module.LogsPanel }))
);

interface LazyLogsPanelProps {
  logs: LogEntry[];
}

// Lightweight loading fallback for logs panel
function LogsPanelSkeleton(): React.ReactElement {
  return (
    <div className="bg-white border-t border-gray-200 max-h-20 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Loading logs...</span>
        </div>
        <div className="text-gray-400">▲</div>
      </div>
    </div>
  );
}

// Error boundary for lazy loaded component
class LogsPanelErrorBoundary extends React.Component<
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
    console.error('LogsPanel lazy loading error:', error, errorInfo);
    
    // Report to Sentry with specific context
    errorTracking.captureComponentError(error, 'LazyLogsPanel', {
      lazyLoading: true,
      componentStack: errorInfo.componentStack,
      errorType: 'lazy_component_load_failure'
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="bg-white border-t border-gray-200 p-3 text-center">
          <div className="text-red-600 text-sm">
            Failed to load logs panel.{' '}
            <button 
              onClick={() => {
                errorTracking.captureMessage('User retried logs panel after error', 'info', {
                  action: 'lazy_component_retry',
                  component: 'LogsPanel'
                });
                this.setState({ hasError: false });
              }} 
              className="text-blue-600 underline hover:text-blue-800"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main lazy wrapper component
export function LazyLogsPanel({ logs }: LazyLogsPanelProps): React.ReactElement {
  return (
    <LogsPanelErrorBoundary>
      <Suspense fallback={<LogsPanelSkeleton />}>
        <LogsPanel logs={logs} />
      </Suspense>
    </LogsPanelErrorBoundary>
  );
}