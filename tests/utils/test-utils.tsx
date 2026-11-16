import type { MockInstance } from 'vitest';
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AppProvider } from '../../src/context/AppContext';

// Enhanced render function with AppContext provider
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AppProvider>
      {children}
    </AppProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Mock helpers for common patterns
// A real Response, shaped as Flask sends it: JSON body, status, and {error} on failure.
export const flaskResponse = (body: unknown, status: number = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const createMockFetch = (mockResponse: any, status: number = 200) =>
  vi.fn().mockImplementation(() => Promise.resolve(flaskResponse(mockResponse, status)));

export const createMockLocalStorage = () => {
  const store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    length: Object.keys(store).length
  };
};

// Utility to wait for async operations
export const waitForAsync = (ms: number = 0) => 
  new Promise(resolve => setTimeout(resolve, ms));

// Utility to create mock timers with cleanup
export const setupMockTimers = () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });
};

// Utility for testing error boundaries
export const TestErrorBoundary: React.FC<{ 
  children: React.ReactNode;
  onError?: (error: Error) => void;
}> = ({ children, onError }) => {
  const [hasError, setHasError] = React.useState(false);
  
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      onError?.(event.error);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [onError]);
  
  if (hasError) {
    return <div data-testid="error-boundary">Something went wrong</div>;
  }
  
  return <>{children}</>;
};

// Console spy utilities
export const setupConsoleSpy = () => {
  let consoleErrorSpy: MockInstance;
  let consoleWarnSpy: MockInstance;
  let consoleLogSpy: MockInstance;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  return {
    getConsoleErrors: () => consoleErrorSpy.mock.calls,
    getConsoleWarns: () => consoleWarnSpy.mock.calls,
    getConsoleLogs: () => consoleLogSpy.mock.calls
  };
};

// Re-export everything from testing library
export * from '@testing-library/react';
export { customRender as render };