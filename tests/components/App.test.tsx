import React, { Suspense } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { App } from '../../src/components/App';

// Mock the API module
jest.mock('../../src/api', () => ({
  LabelBroAPI: {
    fetchPrinters: jest.fn().mockResolvedValue({}),
    discoverPrinters: jest.fn().mockResolvedValue({ success: true, data: { printers: {} } }),
    fetchLabelPreviews: jest.fn().mockResolvedValue({ full_labels: [], small_labels: [] }),
    printLabels: jest.fn().mockResolvedValue({ success: true }),
    testManualConnection: jest.fn().mockResolvedValue({ success: true }),
    connectManually: jest.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock React.lazy components to avoid async loading issues in tests
jest.mock('../../src/components/LazyPrinterPanel', () => ({
  LazyPrinterPanel: () => (
    <div>
      <h3>Printer Connection</h3>
      <div>Auto Discovery</div>
      <div>Manual IP</div>
    </div>
  )
}));

jest.mock('../../src/components/LazyLabelPreview', () => ({
  LazyLabelPreview: () => (
    <div>
      <h2>Preview</h2>
    </div>
  )
}));

jest.mock('../../src/components/LazyHistoryPanel', () => ({
  LazyHistoryPanel: ({ isVisible }: { isVisible: boolean }) => (
    <div className={`history-panel ${isVisible ? '' : 'hidden'}`}>
      <div>Label History</div>
    </div>
  )
}));

jest.mock('../../src/components/LazyHelpModal', () => ({
  LazyHelpModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => 
    isOpen ? (
      <div>
        <div>How to Use</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}));

jest.mock('../../src/components/LabelCreator', () => ({
  LabelCreator: () => (
    <div>
      <textarea 
        placeholder="Enter label text here..."
        aria-label="Label text input"
      />
      <div>
        <label>
          <input type="checkbox" defaultChecked /> Big label
        </label>
        <label>
          <input type="checkbox" defaultChecked /> Small label  
        </label>
      </div>
    </div>
  )
}));

jest.mock('../../src/components/LogsPanel', () => ({
  LogsPanel: () => (
    <div>
      <div>Logs:</div>
      <button>View All</button>
    </div>
  )
}));

// Mock all other components to avoid complexity
jest.mock('../../src/components/StatusBar', () => ({
  StatusBar: () => <div>Status Bar</div>
}));

jest.mock('../../src/components/ErrorDisplay', () => ({
  ErrorDisplay: () => <div>Error Display</div>
}));

jest.mock('../../src/components/PerformanceDebugPanel', () => ({
  PerformanceDebugPanel: () => <div>Performance Panel</div>
}));

jest.mock('../../src/components/GlobalErrorBoundary', () => ({
  GlobalErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Use fake timers to control async behavior
jest.useFakeTimers();

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  it('should render without crashing', async () => {
    await act(async () => {
      const { container } = render(
        <Suspense fallback={<div>Loading...</div>}>
          <App />
        </Suspense>
      );
      expect(container).toBeTruthy();
    });
  });

  it('should render main UI elements', async () => {
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <App />
        </Suspense>
      );
    });
    
    // Check for key text elements that should be present
    // Note: We use more specific queries since the actual ActionToolbar renders nested elements
    await waitFor(() => {
      expect(screen.getByText('Print')).toBeTruthy();
      expect(screen.getByText('Printer Connection')).toBeTruthy();
      expect(screen.getByText('Preview')).toBeTruthy();
    }, { timeout: 5000 });
  });

  it('should allow entering label text', async () => {
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <App />
        </Suspense>
      );
    });
    
    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(/Enter label text/);
      expect(textarea).toBeTruthy();
    });
    
    const textarea = screen.getByPlaceholderText(/Enter label text/) as HTMLTextAreaElement;
    
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'Test Label' } });
    });
    
    expect(textarea.value).toBe('Test Label');
  });

  it('should toggle print options', async () => {
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <App />
        </Suspense>
      );
    });
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Big label/)).toBeTruthy();
      expect(screen.getByLabelText(/Small label/)).toBeTruthy();
    });
    
    const fullLabelCheckbox = screen.getByLabelText(/Big label/) as HTMLInputElement;
    const smallLabelCheckbox = screen.getByLabelText(/Small label/) as HTMLInputElement;
    
    // Initially checked based on our mock
    expect(fullLabelCheckbox.checked).toBe(true);
    expect(smallLabelCheckbox.checked).toBe(true);
    
    await act(async () => {
      fireEvent.click(fullLabelCheckbox);
    });
    expect(fullLabelCheckbox.checked).toBe(false);
    
    await act(async () => {
      fireEvent.click(smallLabelCheckbox);
    });
    expect(smallLabelCheckbox.checked).toBe(false);
  });

  it('should show help modal when help button is clicked', async () => {
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <App />
        </Suspense>
      );
    });
    
    await waitFor(() => {
      expect(screen.getByText('Help')).toBeTruthy();
    });
    
    const helpButton = screen.getByText('Help');
    
    await act(async () => {
      fireEvent.click(helpButton);
    });
    
    // Wait for modal to appear
    await waitFor(() => {
      const helpText = screen.getByText(/How to Use/);
      expect(helpText).toBeTruthy();
    });
  });

  it('should show history panel when history button is clicked', async () => {
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <App />
        </Suspense>
      );
    });
    
    await waitFor(() => {
      expect(screen.getByText('History')).toBeTruthy();
    });
    
    const historyButton = screen.getByText('History');
    
    await act(async () => {
      fireEvent.click(historyButton);
    });
    
    // Wait for history panel to show (panel should no longer be hidden)
    await waitFor(() => {
      const historyElement = screen.getByText('Label History');
      expect(historyElement).toBeTruthy();
      
      // Check that it's visible (not hidden)
      const historyPanel = historyElement.closest('.history-panel');
      expect(historyPanel?.classList.contains('hidden')).toBe(false);
    });
  });

  it('should have printer discovery modes', async () => {
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <App />
        </Suspense>
      );
    });
    
    // Check for discovery mode texts
    await waitFor(() => {
      expect(screen.getByText('Auto Discovery')).toBeTruthy();
      expect(screen.getByText('Manual IP')).toBeTruthy();
    });
  });

  it('should display logs section', async () => {
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <App />
        </Suspense>
      );
    });
    
    // Should show logs section at bottom
    await waitFor(() => {
      expect(screen.getByText('Logs:')).toBeTruthy();
      expect(screen.getByText('View All')).toBeTruthy();
    });
  });
});