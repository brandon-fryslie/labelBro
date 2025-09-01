// Jest test setup file
import { TextEncoder, TextDecoder } from 'util';
import '@testing-library/jest-dom';

// Add TextEncoder and TextDecoder before importing jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import { JSDOM } from 'jsdom';

// Setup DOM environment for Node.js tests
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable'
});

// Set up global DOM objects
global.window = dom.window as any;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLInputElement = dom.window.HTMLInputElement;
global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
global.HTMLSelectElement = dom.window.HTMLSelectElement;
global.HTMLDivElement = dom.window.HTMLDivElement;
global.HTMLButtonElement = dom.window.HTMLButtonElement;

// Mock localStorage with enhanced functionality
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
};

Object.defineProperty(global.window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

global.localStorage = localStorageMock;

// Mock sessionStorage for completeness
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
};

Object.defineProperty(global.window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

global.sessionStorage = sessionStorageMock;

// Enhanced console mocking with error tracking
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

global.console = {
  ...console,
  error: jest.fn(originalConsoleError),
  log: jest.fn(originalConsoleLog),
  warn: jest.fn(originalConsoleWarn),
};

// Mock fetch for API tests with enhanced error handling
global.fetch = jest.fn();

// Mock performance for timing tests - Fixed: Create individual mocks
const performanceNowMock = jest.fn(() => Date.now());
const performanceMarkMock = jest.fn();
const performanceMeasureMock = jest.fn();

global.performance = {
  now: performanceNowMock,
  mark: performanceMarkMock,
  measure: performanceMeasureMock,
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
} as any;

// Mock ResizeObserver for components that use it
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver for components that use it
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia for responsive components
Object.defineProperty(global.window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn(callback => {
  setTimeout(callback, 0);
  return 1;
});

global.cancelAnimationFrame = jest.fn();

// Enhanced cleanup and reset functionality
const resetAllMocks = () => {
  jest.clearAllMocks();
  
  // Reset localStorage mock
  (localStorageMock.getItem as jest.Mock).mockReturnValue(null);
  (localStorageMock.setItem as jest.Mock).mockImplementation(() => {});
  (localStorageMock.removeItem as jest.Mock).mockImplementation(() => {});
  (localStorageMock.clear as jest.Mock).mockImplementation(() => {});
  (localStorageMock.key as jest.Mock).mockReturnValue(null);
  localStorageMock.length = 0;
  
  // Reset sessionStorage mock
  (sessionStorageMock.getItem as jest.Mock).mockReturnValue(null);
  (sessionStorageMock.setItem as jest.Mock).mockImplementation(() => {});
  (sessionStorageMock.removeItem as jest.Mock).mockImplementation(() => {});
  (sessionStorageMock.clear as jest.Mock).mockImplementation(() => {});
  (sessionStorageMock.key as jest.Mock).mockReturnValue(null);
  sessionStorageMock.length = 0;
  
  // Reset fetch mock
  (global.fetch as jest.Mock).mockClear();
  
  // Reset performance mocks - Fixed: Use the actual mock references
  performanceNowMock.mockReturnValue(Date.now());
  performanceMarkMock.mockClear();
  performanceMeasureMock.mockClear();
};

// Global test lifecycle management
beforeEach(() => {
  resetAllMocks();
});

afterEach(() => {
  // Clean up any timers or async operations
  jest.clearAllTimers();
  
  // Clean up DOM if tests added elements
  document.body.innerHTML = '';
  
  // Reset any window properties that might have been modified
  if (global.window.location.hash) {
    global.window.location.hash = '';
  }
});

// Global error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Enhanced test environment validation
const validateTestEnvironment = () => {
  const requiredGlobals = [
    'window',
    'document',
    'localStorage',
    'fetch',
    'TextEncoder',
    'TextDecoder'
  ];
  
  const missing = requiredGlobals.filter(global => !(global in globalThis));
  
  if (missing.length > 0) {
    throw new Error(`Missing required test globals: ${missing.join(', ')}`);
  }
};

// Run validation on setup
validateTestEnvironment();