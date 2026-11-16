// Vitest setup: the jsdom environment provides the DOM; this adds the test doubles the suites share.
// Testing Library unmounts after each test on its own, because `globals: true` exposes afterEach.
import '@testing-library/jest-dom/vitest';

// Each double gets its behavior at construction, so vi.resetAllMocks() in beforeEach restores it after any
// per-test override.
const storageMock = () => ({
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(() => null),
  length: 0
});

const localStorageMock = storageMock();
const sessionStorageMock = storageMock();
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, writable: true });

global.console = {
  ...console,
  error: vi.fn(console.error),
  log: vi.fn(console.log),
  warn: vi.fn(console.warn),
};

global.fetch = vi.fn();

global.performance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(() => []),
  getEntriesByType: vi.fn(() => []),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
} as any;

global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.IntersectionObserver = vi.fn(() => ({
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: vi.fn(() => []),
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

global.requestAnimationFrame = vi.fn(callback => {
  setTimeout(callback, 0);
  return 1;
});
global.cancelAnimationFrame = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  localStorageMock.length = 0;
  sessionStorageMock.length = 0;
});

afterEach(() => {
  vi.clearAllTimers();
  window.location.hash = '';
});
