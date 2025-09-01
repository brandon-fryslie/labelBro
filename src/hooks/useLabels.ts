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
    setError 
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
      const previews = await LabelBroAPI.fetchLabelPreviews(labelText);
      setLabelPreviews(previews);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate previews';
      setError(errorMessage);
    } finally {
      setIsGeneratingPreviews(false);
    }
  }, [state.labelText, setLabelPreviews, setIsGeneratingPreviews, setError]);

  // Print labels
  const printLabels = useCallback(async (printerId?: string) => {
    if (!state.labelText.trim()) {
      setError('Please enter label text');
      return;
    }

    try {
      setError(null);
      
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
      } else {
        
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
        }
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to print labels';
      setError(errorMessage);
      throw error;
    }
  }, [state.labelText, state.printFullLabel, state.printSmallLabel, state.selectedPrinterId, setError]);

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