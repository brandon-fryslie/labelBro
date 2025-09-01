import React, { useEffect } from 'react';
import { useLabels } from '../hooks/useLabels';
import { useStoredLabelText, useStoredPrintOptions } from '../hooks/useLocalStorage';

export function LabelCreator(): React.ReactElement {
  const { 
    labelText, 
    printFullLabel, 
    printSmallLabel, 
    clearAfterPrint,
    isGeneratingPreviews,
    updateLabelText, 
    setPrintFullLabel, 
    setPrintSmallLabel,
    setClearAfterPrint
  } = useLabels();

  // Load stored preferences
  const [storedLabelText, setStoredLabelText] = useStoredLabelText();
  const [storedPrintOptions, setStoredPrintOptions] = useStoredPrintOptions();

  // Initialize from localStorage
  useEffect(() => {
    if (storedLabelText) {
      updateLabelText(storedLabelText);
    }
    setPrintFullLabel(storedPrintOptions.printFullLabel);
    setPrintSmallLabel(storedPrintOptions.printSmallLabel);
    setClearAfterPrint(storedPrintOptions.clearAfterPrint || false);
  }, [updateLabelText, setPrintFullLabel, setPrintSmallLabel, setClearAfterPrint, storedLabelText, storedPrintOptions]);

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value;
    updateLabelText(newText);
    setStoredLabelText(newText);
  };

  const handleFullLabelChange = (checked: boolean) => {
    setPrintFullLabel(checked);
    setStoredPrintOptions({ 
      printFullLabel: checked,
      printSmallLabel: storedPrintOptions.printSmallLabel,
      clearAfterPrint: storedPrintOptions.clearAfterPrint
    });
  };

  const handleSmallLabelChange = (checked: boolean) => {
    setPrintSmallLabel(checked);
    setStoredPrintOptions({ 
      printFullLabel: storedPrintOptions.printFullLabel,
      printSmallLabel: checked,
      clearAfterPrint: storedPrintOptions.clearAfterPrint
    });
  };

  const handleClearAfterPrintChange = (checked: boolean) => {
    setClearAfterPrint(checked);
    setStoredPrintOptions({ 
      printFullLabel: storedPrintOptions.printFullLabel,
      printSmallLabel: storedPrintOptions.printSmallLabel, 
      clearAfterPrint: checked 
    });
  };

  return (
    <div className="label-creator-container">
      <form>
        {/* Print Options - Horizontally above textarea */}
        <div className="print-options-inline">
          <label className="checkboxLabel">
            <input
              type="checkbox"
              checked={printFullLabel}
              onChange={(e) => handleFullLabelChange(e.target.checked)}
            />
            <span>Big label</span>
          </label>
          <label className="checkboxLabel">
            <input
              type="checkbox"
              checked={printSmallLabel}
              onChange={(e) => handleSmallLabelChange(e.target.checked)}
            />
            <span>Small label</span>
          </label>
          <label className="checkboxLabel">
            <input
              type="checkbox"
              checked={clearAfterPrint}
              onChange={(e) => handleClearAfterPrintChange(e.target.checked)}
            />
            <span>Clear after print</span>
          </label>
        </div>
        
        <textarea
          value={labelText}
          onChange={handleTextChange}
          rows={10}
          cols={50}
          placeholder="Enter label text..."
          disabled={isGeneratingPreviews}
          className="label-text-input"
        />
        {isGeneratingPreviews && (
          <div className="generating-indicator">
            <small>Generating previews...</small>
          </div>
        )}
      </form>
    </div>
  );
}