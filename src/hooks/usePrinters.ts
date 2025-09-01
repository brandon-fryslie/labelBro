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
    setError 
  } = useApp();

  // Fetch current printers
  const fetchPrinters = useCallback(async () => {
    try {
      setIsDiscovering(true);
      setError(null);
      
      const printers = await LabelBroAPI.fetchPrinters();
      if (printers) {
        setPrinters(printers);
        
        // Update status bar based on connected printers
        const connectedPrinters = Object.values(printers).filter(p => p.is_connected);
        if (connectedPrinters.length > 0) {
          setStatusBar(`${connectedPrinters.length} printer(s) connected`, '✅');
        } else {
          setStatusBar('No printers connected', '🔌');
        }
      }
    } catch (error) {
      console.error('Error fetching printers:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch printers');
      setStatusBar('Connection error', '❌');
    } finally {
      setIsDiscovering(false);
    }
  }, [setPrinters, setIsDiscovering, setStatusBar, setError]);

  // Discover printers on network
  const discoverPrinters = useCallback(async () => {
    try {
      setIsDiscovering(true);
      setError(null);
      setConnectionStatus('Discovering printers...');
      
      const discoveryResult = await LabelBroAPI.discoverPrinters();
      if (discoveryResult) {
        setPrinters(discoveryResult.printers);
        
        const printerCount = Object.keys(discoveryResult.printers).length;
        const connectedPrinters = Object.entries(discoveryResult.printers)
          .filter(([_, printer]) => printer.is_connected);
        
        setConnectionResults(`Found ${printerCount} printer(s)`);
        
        if (printerCount > 0) {
          setStatusBar(`Found ${printerCount} printer(s)`, '🔍');
          
          // Try to restore previously selected printer, otherwise select first connected
          const storedPrinterId = localStorage.getItem('labelBro_selectedPrinter');
          let selectedPrinterId: string | null = null;
          
          if (storedPrinterId && discoveryResult.printers[storedPrinterId]) {
            // Previous printer is available, restore it
            selectedPrinterId = storedPrinterId;
            setSelectedPrinter(selectedPrinterId);
            setStatusBar(`Restored connection to ${discoveryResult.printers[selectedPrinterId].display_name}`, '✅');
          } else if (connectedPrinters.length > 0) {
            // No previous selection or it's not available, select first connected printer
            const [firstPrinterId] = connectedPrinters[0];
            selectedPrinterId = firstPrinterId;
            setSelectedPrinter(selectedPrinterId);
            setStatusBar(`Auto-connected to ${discoveryResult.printers[selectedPrinterId].display_name}`, '✅');
          }
          
          // If we have a connected printer and some label text, user is ready to print
          if (selectedPrinterId && discoveryResult.printers[selectedPrinterId].is_connected) {
          }
        } else {
          setStatusBar('No printers found', '🔍');
        }
      } else {
        setConnectionResults('Discovery failed');
        setStatusBar('Discovery failed', '❌');
      }
    } catch (error) {
      console.error('Error discovering printers:', error);
      const errorMessage = error instanceof Error ? error.message : 'Discovery failed';
      setError(errorMessage);
      setConnectionResults(errorMessage);
      setStatusBar('Discovery error', '❌');
    } finally {
      setIsDiscovering(false);
      setConnectionStatus('');
    }
  }, [setPrinters, setSelectedPrinter, setIsDiscovering, setConnectionStatus, setConnectionResults, setStatusBar, setError]);

  // Test manual connection
  const testManualConnection = useCallback(async (target: string) => {
    try {
      setConnectionStatus('Testing connection...');
      setConnectionResults('');
      setError(null);
      
      const result: ManualConnectionResult = await LabelBroAPI.testManualConnection(target);
      
      if (result.success && result.printers_found.length > 0) {
        // Convert printers array to Record format
        const printersRecord: Record<string, any> = {};
        result.printers_found.forEach((printer, index) => {
          const id = printer.id || `manual_${index}`;
          printersRecord[id] = printer;
        });
        
        setPrinters(printersRecord);
        setConnectionResults(`✅ Found ${result.printers_found.length} printer(s) at ${target}`);
        setStatusBar(`Connected to ${target}`, '✅');
        
        // Auto-select the first printer
        if (result.printers_found.length > 0) {
          const firstPrinterId = result.printers_found[0].id || 'manual_0';
          setSelectedPrinter(firstPrinterId);
        }
      } else {
        setConnectionResults(`❌ No printers found at ${target}`);
        setStatusBar('Connection failed', '❌');
      }
    } catch (error) {
      console.error('Error testing manual connection:', error);
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      setError(errorMessage);
      setConnectionResults(`❌ ${errorMessage}`);
      setStatusBar('Connection error', '❌');
    } finally {
      setConnectionStatus('');
    }
  }, [setPrinters, setSelectedPrinter, setConnectionStatus, setConnectionResults, setStatusBar, setError]);

  return {
    printers: state.printers,
    selectedPrinterId: state.selectedPrinterId,
    isDiscovering: state.isDiscovering,
    connectionStatus: state.connectionStatus,
    connectionResults: state.connectionResults,
    fetchPrinters,
    discoverPrinters,
    testManualConnection,
    setSelectedPrinter,
  };
}