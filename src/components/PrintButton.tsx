import React from 'react';
import { useLabels } from '../hooks/useLabels';
import { useApp } from '../context/AppContext';

export function PrintButton(): React.ReactElement {
  const { printLabels, labelText } = useLabels();
  const { state } = useApp();

  const handlePrint = async () => {
    if (!labelText.trim()) {
      alert('Please enter label text');
      return;
    }

    if (!state.selectedPrinterId && Object.keys(state.printers).length === 0) {
      alert('Please connect to a printer first');
      return;
    }

    try {
      await printLabels();
    } catch (error) {
      console.error('Print failed:', error);
    }
  };

  const isDisabled = !labelText.trim() || state.isLoading;

  return (
    <button 
      className={`floating-print-button ${isDisabled ? 'disabled' : ''}`}
      onClick={handlePrint}
      disabled={isDisabled}
      title={isDisabled ? 'Enter text to print' : 'Print labels'}
    >
      {state.isLoading ? '⏳' : '🖨️'}
    </button>
  );
}