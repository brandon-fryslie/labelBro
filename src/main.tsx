// Main entry point for labelBro frontend application
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';
import { TypeScriptErrorReporter } from './utils/error-reporter';
import { performanceMonitor } from './utils/performance-monitor';
import './styles/globals.css';

// Set up cross-system error reporting
TypeScriptErrorReporter.setupGlobalErrorHandlers();

// Initialize performance monitoring
performanceMonitor.markStart('app-initialization');

// Find the React mount point
const container = document.getElementById('react-root');
if (!container) {
  throw new Error('React root element not found');
}

// Create React root and render the application
const root = createRoot(container);
performanceMonitor.markStart('app-render');
root.render(<App />);
performanceMonitor.markEnd('app-render');

performanceMonitor.markEnd('app-initialization');
console.log('React application initialized with performance monitoring');