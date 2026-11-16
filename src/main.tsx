// Main entry point for labelBro frontend application
import { createRoot } from 'react-dom/client';
import { App } from './components/App';
import { TypeScriptErrorReporter } from './utils/error-reporter';
import { errorTracking } from './utils/error-tracking';
import './styles/globals.css';

// Initialize error tracking first
errorTracking.initialize({
  environment: import.meta.env.PROD ? 'production' : 'development',
  sampleRate: import.meta.env.DEV ? 1.0 : 0.1,
  tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1
});

// Set up cross-system error reporting
TypeScriptErrorReporter.setupGlobalErrorHandlers();

// Development-only performance monitoring with complete tree shaking
if (import.meta.env.DEV) {
  // Only import performance monitoring in development
  import('./utils/performance-monitor').then(({ performanceMonitor }) => {
    performanceMonitor.markStart('app-initialization');

    // Mark app render start before React rendering
    const originalRender = () => {
      performanceMonitor.markStart('app-render');
      const root = createRoot(container!);
      root.render(<App />);
      performanceMonitor.markEnd('app-render');
      performanceMonitor.markEnd('app-initialization');
    };

    // Find container and render with performance monitoring
    const container = document.getElementById('react-root');
    if (container) {
      originalRender();
    }
  }).catch(error => {
    console.error('Failed to load performance monitoring:', error);
    // Fallback to normal rendering if performance monitoring fails
    renderApp();
  });
} else {
  // Production: render immediately without performance monitoring
  renderApp();
}

function renderApp() {
  // Find the React mount point
  const container = document.getElementById('react-root');
  if (!container) {
    const error = new Error('React root element not found');
    errorTracking.captureError(error, {
      initialization: {
        step: 'dom-mount-point-lookup',
        containerExists: false
      }
    });
    throw error;
  }

  try {
    // Create React root and render the application
    const root = createRoot(container);
    root.render(<App />);

    // Log successful initialization
    errorTracking.captureMessage('React application initialized successfully', 'info', {
      initialization: {
        performance_monitoring: import.meta.env.DEV,
        error_tracking: errorTracking.isAvailable(),
        container_found: true
      }
    });

  } catch (error) {
    // Capture any initialization errors
    if (error instanceof Error) {
      errorTracking.captureError(error, {
        initialization: {
          step: 'react-render',
          fatal: true
        }
      });
    }
    throw error;
  }
}
