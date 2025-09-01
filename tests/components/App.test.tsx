import React from 'react';
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

// Mock timers to control async behavior in tests
jest.useFakeTimers();

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  it('should render without crashing', async () => {
    await act(async () => {
      const { container } = render(<App />);
      expect(container).toBeTruthy();
    });
  });

  it('should render main UI elements', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Check for key text elements
    expect(screen.getByText('Print')).toBeTruthy();
    expect(screen.getByText('Printer Connection')).toBeTruthy();
    expect(screen.getByText('Preview')).toBeTruthy();
  });

  it('should allow entering label text', async () => {
    await act(async () => {
      render(<App />);
    });
    
    const textarea = screen.getByPlaceholderText(/Enter label text/);
    expect(textarea).toBeTruthy();
    
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'Test Label' } });
    });
    
    expect((textarea as HTMLTextAreaElement).value).toBe('Test Label');
  });

  it('should toggle print options', async () => {
    await act(async () => {
      render(<App />);
    });
    
    const fullLabelCheckbox = screen.getByLabelText(/Big label/) as HTMLInputElement;
    const smallLabelCheckbox = screen.getByLabelText(/Small label/) as HTMLInputElement;
    
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
      render(<App />);
    });
    
    const helpButton = screen.getByText('Help');
    expect(helpButton).toBeTruthy();
    
    await act(async () => {
      fireEvent.click(helpButton);
    });
    
    // Wait for modal to appear
    await waitFor(() => {
      const helpText = screen.queryByText(/How to Use/);
      expect(helpText).toBeTruthy();
    });
  });

  it('should show history panel when history button is clicked', async () => {
    await act(async () => {
      render(<App />);
    });
    
    const historyButton = screen.getByText('History');
    expect(historyButton).toBeTruthy();
    
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
      render(<App />);
    });
    
    // Check for discovery mode texts
    expect(screen.getByText('Auto Discovery')).toBeTruthy();
    expect(screen.getByText('Manual IP')).toBeTruthy();
  });

  it('should display logs section', async () => {
    await act(async () => {
      render(<App />);
    });
    
    // Should show logs section at bottom
    expect(screen.getByText('Logs:')).toBeTruthy();
    expect(screen.getByText('View All')).toBeTruthy();
  });
});