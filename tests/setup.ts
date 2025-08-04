// Jest test setup file
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

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(global.window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

global.localStorage = localStorageMock;

// Mock console methods to capture validation errors
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

global.console = {
  ...console,
  error: jest.fn(originalConsoleError),
  log: jest.fn(originalConsoleLog),
};

// Mock fetch for API tests
global.fetch = jest.fn();

// Mock performance for timing tests
global.performance = {
  now: jest.fn(() => Date.now()),
} as any;

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  (localStorageMock.getItem as jest.Mock).mockReturnValue(null);
  (localStorageMock.setItem as jest.Mock).mockImplementation(() => {});
});