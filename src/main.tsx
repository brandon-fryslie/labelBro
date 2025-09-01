// Main entry point for labelBro frontend application
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';
import { TypeScriptErrorReporter } from './utils/error-reporter';
import { performanceMonitor } from './utils/performance-monitor';
import { errorTracking } from './utils/error-tracking';
import './styles/globals.css';

// Initialize error tracking first
errorTracking.initialize({
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  sampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1
});

// Set up cross-system error reporting
TypeScriptErrorReporter.setupGlobalErrorHandlers();

// Initialize performance monitoring
performanceMonitor.markStart('app-initialization');

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
  performanceMonitor.markStart('app-render');
  root.render(<App />);
  performanceMonitor.markEnd('app-render');

  performanceMonitor.markEnd('app-initialization');
  
  // Log successful initialization
  errorTracking.captureMessage('React application initialized successfully', 'info', {
    initialization: {
      performance_monitoring: true,
      error_tracking: errorTracking.isAvailable(),
      container_found: true
    }
  });
  
  console.log('React application initialized with performance monitoring and error tracking');
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