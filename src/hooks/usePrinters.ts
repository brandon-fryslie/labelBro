import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { LabelBroAPI } from '../api';
import type { ManualConnectionResult } from '../types';

export function usePrinters() {
  const { 
    state, 
    setPrinters, 
    setSelectedPrinter, 
    setIsDiscovering, 
    setConnectionStatus, 
    setConnectionResults,
    setStatusBar,
    setError,
    addLog 
  } = useApp();

  // Fetch current printers
  const fetchPrinters = useCallback(async () => {
    try {
      setIsDiscovering(true);
      setError(null);
      addLog('Fetching printer list...');
      
      const printers = await LabelBroAPI.fetchPrinters();
      if (printers) {
        setPrinters(printers);
        
        // Update status bar based on connected printers
        const connectedPrinters = Object.values(printers).filter(p => p.is_connected);
        if (connectedPrinters.length > 0) {
          const message = `${connectedPrinters.length} printer(s) connected`;
          setStatusBar(message, '✅');
          addLog(message);
        } else {
          setStatusBar('No printers connected', '🔌');
          addLog('No printers found');
        }
      }
    } catch (error) {
      console.error('Error fetching printers:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch printers';
      setError(errorMsg);
      setStatusBar('Connection error', '❌');
      addLog(`Error: ${errorMsg}`);
    } finally {
      setIsDiscovering(false);
    }
  }, [setPrinters, setIsDiscovering, setStatusBar, setError, addLog]);

  // Discover printers on network
  const discoverPrinters = useCallback(async () => {
    try {
      setIsDiscovering(true);
      setError(null);
      setConnectionStatus('Discovering printers...');
      addLog('Starting network discovery...');
      
      const result = await LabelBroAPI.discoverPrinters();
      if (result && result.success) {
        const discoveredCount = Object.keys(result.data.printers).length;
        const message = discoveredCount > 0 
          ? `Discovered ${discoveredCount} printer(s)` 
          : 'No printers found on network';
        
        setConnectionStatus(message);
        setConnectionResults(message);
        addLog(message);
        
        // Update printers list
        await fetchPrinters();
      } else if (result) {
        const errorMsg = result.error || 'Discovery failed';
        setConnectionStatus(errorMsg);
        setError(errorMsg);
        addLog(`Discovery error: ${errorMsg}`);
      } else {
        const errorMsg = 'Discovery failed - no response';
        setConnectionStatus(errorMsg);
        setError(errorMsg);
        addLog(`Discovery error: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Discovery error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Network discovery failed';
      setConnectionStatus(errorMsg);
      setError(errorMsg);
      addLog(`Discovery error: ${errorMsg}`);
    } finally {
      setIsDiscovering(false);
    }
  }, [setIsDiscovering, setConnectionStatus, setConnectionResults, setError, fetchPrinters, addLog]);

  // Manual connection
  const connectManually = useCallback(async (ipAddress: string) => {
    if (!ipAddress) {
      setError('Please enter an IP address');
      return;
    }

    try {
      setIsDiscovering(true);
      setError(null);
      setConnectionStatus(`Connecting to ${ipAddress}...`);
      addLog(`Attempting manual connection to ${ipAddress}...`);
      
      const result: ManualConnectionResult = await LabelBroAPI.connectManually(ipAddress);
      
      if (result.success) {
        const message = `Connected to ${result.model || 'printer'} at ${ipAddress}`;
        setConnectionStatus(message);
        setConnectionResults(message);
        setStatusBar('Printer connected', '✅');
        addLog(message);
        
        // Refresh printers list
        await fetchPrinters();
      } else {
        const errorMsg = result.error || 'Connection failed';
        setConnectionStatus(errorMsg);
        setConnectionResults(errorMsg);
        setError(errorMsg);
        addLog(`Connection failed: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Manual connection error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Connection failed';
      setConnectionStatus(errorMsg);
      setError(errorMsg);
      addLog(`Connection error: ${errorMsg}`);
    } finally {
      setIsDiscovering(false);
    }
  }, [setIsDiscovering, setConnectionStatus, setConnectionResults, setStatusBar, setError, fetchPrinters, addLog]);

  // Select printer
  const selectPrinter = useCallback((printerId: string | null) => {
    setSelectedPrinter(printerId);
    if (printerId) {
      const printer = state.printers[printerId];
      if (printer) {
        const message = `Selected printer: ${printer.model}`;
        setStatusBar(message, '🖨️');
        addLog(message);
      }
    } else {
      addLog('Printer deselected');
    }
  }, [setSelectedPrinter, state.printers, setStatusBar, addLog]);

  return {
    printers: state.printers,
    selectedPrinterId: state.selectedPrinterId,
    isDiscovering: state.isDiscovering,
    connectionStatus: state.connectionStatus,
    connectionResults: state.connectionResults,
    connectionMode: state.connectionMode,
    manualIp: state.manualIp,
    fetchPrinters,
    discoverPrinters,
    connectManually,
    selectPrinter,
  };
}