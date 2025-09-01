import { useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { LabelBroAPI } from '../api';
import type { PrintRequest } from '../types';

export function useLabels() {
  const { 
    state, 
    setLabelText,
    setPrintFullLabel,
    setPrintSmallLabel,
    setClearAfterPrint,
    setLabelPreviews,
    setIsGeneratingPreviews,
    setError,
    addLog 
  } = useApp();

  // Generate label previews
  const generatePreviews = useCallback(async (text?: string) => {
    const labelText = text ?? state.labelText;
    
    if (!labelText.trim()) {
      setLabelPreviews(null);
      return;
    }

    try {
      setIsGeneratingPreviews(true);
      setError(null);
      addLog('Generating label previews...');
      
      // Format data correctly for Flask backend
      const labelData = {
        data: {
          text: labelText,
          shouldPrintFullLabel: state.printFullLabel,
          shouldPrintSmallLabel: state.printSmallLabel
        }
      };
      
      const previews = await LabelBroAPI.fetchLabelPreviews(labelData);
      setLabelPreviews(previews);
      addLog('Label previews generated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate previews';
      setError(errorMessage);
      addLog(`Preview generation failed: ${errorMessage}`);
    } finally {
      setIsGeneratingPreviews(false);
    }
  }, [state.labelText, state.printFullLabel, state.printSmallLabel, setLabelPreviews, setIsGeneratingPreviews, setError, addLog]);

  // Print labels
  const printLabels = useCallback(async (printerId?: string) => {
    if (!state.labelText.trim()) {
      setError('Please enter label text');
      return;
    }

    try {
      setError(null);
      addLog(`Printing label: "${state.labelText}"`);
      
      const printRequest: PrintRequest = {
        data: {
          text: state.labelText,
          shouldPrintFullLabel: state.printFullLabel,
          shouldPrintSmallLabel: state.printSmallLabel,
          printer_id: printerId || state.selectedPrinterId || undefined,
        }
      };

      const result = await LabelBroAPI.printLabels(printRequest);
      
      // Handle print result
      if (result.error) {
        setError(result.error);
        addLog(`Print failed: ${result.error}`);
      } else {
        addLog('Label printed successfully');
        
        // Add to history if print was successful
        if ((window as any).addToLabelHistory) {
          (window as any).addToLabelHistory(state.labelText, {
            printFullLabel: state.printFullLabel,
            printSmallLabel: state.printSmallLabel
          });
        }
        
        // Clear textarea if clearAfterPrint is enabled
        if (state.clearAfterPrint) {
          setLabelText('');
          addLog('Label text cleared after print');
        }
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to print labels';
      setError(errorMessage);
      addLog(`Print error: ${errorMessage}`);
      throw error;
    }
  }, [state.labelText, state.printFullLabel, state.printSmallLabel, state.selectedPrinterId, state.clearAfterPrint, setLabelText, setError, addLog]);

  // Update label text and trigger preview generation
  const updateLabelText = useCallback((text: string) => {
    setLabelText(text);
    // Debounce preview generation
    setTimeout(() => generatePreviews(text), 300);
  }, [setLabelText, generatePreviews]);

  // Auto-generate previews when print options change
  useEffect(() => {
    if (state.labelText.trim()) {
      generatePreviews();
    }
  }, [state.printFullLabel, state.printSmallLabel, generatePreviews]);

  return {
    labelText: state.labelText,
    printFullLabel: state.printFullLabel,
    printSmallLabel: state.printSmallLabel,
    clearAfterPrint: state.clearAfterPrint,
    labelPreviews: state.labelPreviews,
    isGeneratingPreviews: state.isGeneratingPreviews,
    selectedPrinterId: state.selectedPrinterId,
    updateLabelText,
    setPrintFullLabel,
    setPrintSmallLabel,
    setClearAfterPrint,
    generatePreviews,
    printLabels,
  };
}