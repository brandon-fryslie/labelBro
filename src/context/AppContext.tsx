import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { PrinterData, LabelPreviewState, LogEntry } from '../types';

// Application state interface
interface AppState {
  // Printer state
  printers: Record<string, PrinterData>;
  selectedPrinterId: string | null;
  connectionMode: 'manual' | 'auto';
  manualIp: string;
  connectionStatus: string;
  connectionResults: string;
  isDiscovering: boolean;

  // Label state
  labelText: string;
  printFullLabel: boolean;
  printSmallLabel: boolean;
  clearAfterPrint: boolean;
  labelPreviews: LabelPreviewState;
  isGeneratingPreviews: boolean;

  // UI state
  isPrinterPanelExpanded: boolean;
  isPrintOptionsModalOpen: boolean;
  isHelpModalOpen: boolean;
  statusBarText: string;
  statusBarIcon: string;
  isLogsPanelExpanded: boolean;
  logsBarText: string;
  logsBarIcon: string;

  // Logs state - now using LogEntry type
  logs: LogEntry[];

  // Loading and error states
  isLoading: boolean;
  error: string | null;
}

// Action types
type AppAction =
  | { type: 'SET_PRINTERS'; payload: Record<string, PrinterData> }
  | { type: 'SET_SELECTED_PRINTER'; payload: string | null }
  | { type: 'SET_CONNECTION_MODE'; payload: 'manual' | 'auto' }
  | { type: 'SET_MANUAL_IP'; payload: string }
  | { type: 'SET_CONNECTION_STATUS'; payload: string }
  | { type: 'SET_CONNECTION_RESULTS'; payload: string }
  | { type: 'SET_IS_DISCOVERING'; payload: boolean }
  | { type: 'SET_LABEL_TEXT'; payload: string }
  | { type: 'SET_PRINT_FULL_LABEL'; payload: boolean }
  | { type: 'SET_PRINT_SMALL_LABEL'; payload: boolean }
  | { type: 'SET_CLEAR_AFTER_PRINT'; payload: boolean }
  | { type: 'SET_LABEL_PREVIEWS'; payload: LabelPreviewState }
  | { type: 'SET_IS_GENERATING_PREVIEWS'; payload: boolean }
  | { type: 'TOGGLE_PRINTER_PANEL' }
  | { type: 'TOGGLE_LOGS_PANEL' }
  | { type: 'SET_PRINT_OPTIONS_MODAL'; payload: boolean }
  | { type: 'SET_HELP_MODAL'; payload: boolean }
  | { type: 'SET_STATUS_BAR'; payload: { text: string; icon: string } }
  | { type: 'SET_LOGS_BAR'; payload: { text: string; icon: string } }
  | { type: 'ADD_LOG'; payload: LogEntry }
  | { type: 'CLEAR_LOGS' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// Initial state
const initialState: AppState = {
  printers: {},
  selectedPrinterId: null,
  connectionMode: 'manual',
  manualIp: '',
  connectionStatus: '',
  connectionResults: '',
  isDiscovering: false,

  labelText: '',
  printFullLabel: true,
  printSmallLabel: true,
  clearAfterPrint: false,
  labelPreviews: { kind: 'none' },
  isGeneratingPreviews: false,

  isPrinterPanelExpanded: false,
  isPrintOptionsModalOpen: false,
  isHelpModalOpen: false,
  statusBarText: 'Not Connected',
  statusBarIcon: '🔌',
  isLogsPanelExpanded: false,
  logsBarText: 'No messages',
  logsBarIcon: '📋',

  logs: [],

  isLoading: false,
  error: null,
};

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PRINTERS':
      return { ...state, printers: action.payload };
    case 'SET_SELECTED_PRINTER':
      return { ...state, selectedPrinterId: action.payload };
    case 'SET_CONNECTION_MODE':
      return { ...state, connectionMode: action.payload };
    case 'SET_MANUAL_IP':
      return { ...state, manualIp: action.payload };
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };
    case 'SET_CONNECTION_RESULTS':
      return { ...state, connectionResults: action.payload };
    case 'SET_IS_DISCOVERING':
      return { ...state, isDiscovering: action.payload };
    case 'SET_LABEL_TEXT':
      return { ...state, labelText: action.payload };
    case 'SET_PRINT_FULL_LABEL':
      return { ...state, printFullLabel: action.payload };
    case 'SET_PRINT_SMALL_LABEL':
      return { ...state, printSmallLabel: action.payload };
    case 'SET_CLEAR_AFTER_PRINT':
      return { ...state, clearAfterPrint: action.payload };
    case 'SET_LABEL_PREVIEWS':
      return { ...state, labelPreviews: action.payload };
    case 'SET_IS_GENERATING_PREVIEWS':
      return { ...state, isGeneratingPreviews: action.payload };
    case 'TOGGLE_PRINTER_PANEL':
      return { ...state, isPrinterPanelExpanded: !state.isPrinterPanelExpanded };
    case 'TOGGLE_LOGS_PANEL':
      return { ...state, isLogsPanelExpanded: !state.isLogsPanelExpanded };
    case 'SET_PRINT_OPTIONS_MODAL':
      return { ...state, isPrintOptionsModalOpen: action.payload };
    case 'SET_HELP_MODAL':
      return { ...state, isHelpModalOpen: action.payload };
    case 'SET_STATUS_BAR':
      return {
        ...state,
        statusBarText: action.payload.text,
        statusBarIcon: action.payload.icon
      };
    case 'SET_LOGS_BAR':
      return {
        ...state,
        logsBarText: action.payload.text,
        logsBarIcon: action.payload.icon
      };
    case 'ADD_LOG':
      // Keep only the last 100 logs
      const newLogs = [action.payload, ...state.logs].slice(0, 100);

      // Update logs bar with the most recent log
      const recentLog = action.payload;
      const levelIcon = recentLog.level === 'error' ? '🔴' :
                       recentLog.level === 'warning' ? '⚠️' :
                       recentLog.level === 'debug' ? '🔍' : '📋';
      const logTime = new Date(recentLog.timestamp).toLocaleTimeString();

      return {
        ...state,
        logs: newLogs,
        logsBarText: `[${logTime}] ${recentLog.message}`,
        logsBarIcon: levelIcon
      };
    case 'CLEAR_LOGS':
      return {
        ...state,
        logs: [],
        logsBarText: 'No messages',
        logsBarIcon: '📋'
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

// Context interface
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Action creators for convenience
  setPrinters: (printers: Record<string, PrinterData>) => void;
  setSelectedPrinter: (printerId: string | null) => void;
  setConnectionMode: (mode: 'manual' | 'auto') => void;
  setManualIp: (ip: string) => void;
  setConnectionStatus: (status: string) => void;
  setConnectionResults: (results: string) => void;
  setIsDiscovering: (discovering: boolean) => void;
  setLabelText: (text: string) => void;
  setPrintFullLabel: (enabled: boolean) => void;
  setPrintSmallLabel: (enabled: boolean) => void;
  setClearAfterPrint: (enabled: boolean) => void;
  setLabelPreviews: (previews: LabelPreviewState) => void;
  setIsGeneratingPreviews: (generating: boolean) => void;
  togglePrinterPanel: () => void;
  toggleLogsPanel: () => void;
  setPrintOptionsModal: (open: boolean) => void;
  setHelpModal: (open: boolean) => void;
  setStatusBar: (text: string, icon: string) => void;
  setLogsBar: (text: string, icon: string) => void;
  addLog: (message: string, level?: LogEntry['level'], source?: string, metadata?: Record<string, any>) => void;
  clearLogs: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Action creators
  const setPrinters = useCallback((printers: Record<string, PrinterData>) => {
    dispatch({ type: 'SET_PRINTERS', payload: printers });
  }, []);

  const setSelectedPrinter = useCallback((printerId: string | null) => {
    dispatch({ type: 'SET_SELECTED_PRINTER', payload: printerId });
  }, []);

  const setConnectionMode = useCallback((mode: 'manual' | 'auto') => {
    dispatch({ type: 'SET_CONNECTION_MODE', payload: mode });
  }, []);

  const setManualIp = useCallback((ip: string) => {
    dispatch({ type: 'SET_MANUAL_IP', payload: ip });
  }, []);

  const setConnectionStatus = useCallback((status: string) => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: status });
  }, []);

  const setConnectionResults = useCallback((results: string) => {
    dispatch({ type: 'SET_CONNECTION_RESULTS', payload: results });
  }, []);

  const setIsDiscovering = useCallback((discovering: boolean) => {
    dispatch({ type: 'SET_IS_DISCOVERING', payload: discovering });
  }, []);

  const setLabelText = useCallback((text: string) => {
    dispatch({ type: 'SET_LABEL_TEXT', payload: text });
  }, []);

  const setPrintFullLabel = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_PRINT_FULL_LABEL', payload: enabled });
  }, []);

  const setPrintSmallLabel = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_PRINT_SMALL_LABEL', payload: enabled });
  }, []);

  const setClearAfterPrint = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_CLEAR_AFTER_PRINT', payload: enabled });
  }, []);

  const setLabelPreviews = useCallback((previews: LabelPreviewState) => {
    dispatch({ type: 'SET_LABEL_PREVIEWS', payload: previews });
  }, []);

  const setIsGeneratingPreviews = useCallback((generating: boolean) => {
    dispatch({ type: 'SET_IS_GENERATING_PREVIEWS', payload: generating });
  }, []);

  const togglePrinterPanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_PRINTER_PANEL' });
  }, []);

  const toggleLogsPanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_LOGS_PANEL' });
  }, []);

  const setPrintOptionsModal = useCallback((open: boolean) => {
    dispatch({ type: 'SET_PRINT_OPTIONS_MODAL', payload: open });
  }, []);

  const setHelpModal = useCallback((open: boolean) => {
    dispatch({ type: 'SET_HELP_MODAL', payload: open });
  }, []);

  const setStatusBar = useCallback((text: string, icon: string) => {
    dispatch({ type: 'SET_STATUS_BAR', payload: { text, icon } });
  }, []);

  const setLogsBar = useCallback((text: string, icon: string) => {
    dispatch({ type: 'SET_LOGS_BAR', payload: { text, icon } });
  }, []);

  // Enhanced addLog function that creates proper LogEntry objects
  const addLog = useCallback((
    message: string,
    level: LogEntry['level'] = 'info',
    source?: string,
    metadata?: Record<string, any>
  ) => {
    const logEntry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      message,
      // Only include source and metadata if they are provided
      ...(source && { source }),
      ...(metadata && { metadata })
    };
    dispatch({ type: 'ADD_LOG', payload: logEntry });
  }, []);

  const clearLogs = useCallback(() => {
    dispatch({ type: 'CLEAR_LOGS' });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });

    // Also add error to logs
    if (error) {
      addLog(error, 'error', 'application');
    }
  }, [addLog]);

  const value = {
    state,
    dispatch,
    setPrinters,
    setSelectedPrinter,
    setConnectionMode,
    setManualIp,
    setConnectionStatus,
    setConnectionResults,
    setIsDiscovering,
    setLabelText,
    setPrintFullLabel,
    setPrintSmallLabel,
    setClearAfterPrint,
    setLabelPreviews,
    setIsGeneratingPreviews,
    togglePrinterPanel,
    toggleLogsPanel,
    setPrintOptionsModal,
    setHelpModal,
    setStatusBar,
    setLogsBar,
    addLog,
    clearLogs,
    setLoading,
    setError,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use context
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
