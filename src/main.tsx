// Main entry point for labelBro frontend application
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';
import { TypeScriptErrorReporter } from './utils/error-reporter';
import './styles/globals.css';

// Set up cross-system error reporting
TypeScriptErrorReporter.setupGlobalErrorHandlers();

// Find the React mount point
const container = document.getElementById('react-root');
if (!container) {
  throw new Error('React root element not found');
}

// Create React root and render the application
const root = createRoot(container);
root.render(<App />);

console.log('React application initialized');