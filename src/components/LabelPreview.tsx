import React from 'react';
import { useLabels } from '../hooks/useLabels';

export function LabelPreview(): React.ReactElement {
  const { labelPreviews, isGeneratingPreviews, labelText, printFullLabel, printSmallLabel } = useLabels();

  // Create label pairs from the preview data
  const createLabelPairs = () => {
    if (!labelPreviews) return [];

    const { full_labels, small_labels } = labelPreviews;
    const maxLength = Math.max(full_labels.length, small_labels.length);
    
    return Array.from({ length: maxLength }, (_, index) => ({
      index,
      fullLabel: full_labels[index] || '',
      smallLabel: small_labels[index] || '',
    }));
  };

  const labelPairs = createLabelPairs();

  const showNoPreviewsMessage = !labelText.trim() || (!printFullLabel && !printSmallLabel);
  const showLoadingMessage = isGeneratingPreviews && labelText.trim();
  const showErrorMessage = labelPreviews?.error;

  return (
    <div className="previews-container">
      <h2>Preview</h2>
      <div className="flex-container">
        {showErrorMessage && (
          <div className="preview-error">
            <p style={{ color: '#f66' }}>Error: {labelPreviews?.error}</p>
          </div>
        )}
        
        {showLoadingMessage && (
          <div className="preview-loading">
            <p>Generating previews...</p>
          </div>
        )}
        
        {showNoPreviewsMessage && !showLoadingMessage && (
          <div className="no-previews">
            <p>
              {!labelText.trim() 
                ? 'Enter text to see label previews' 
                : 'Select at least one label size to see previews'
              }
            </p>
          </div>
        )}

        {labelPairs.map((pair) => (
          <div key={pair.index} className="label-pair">
            <h6>Label {pair.index + 1}</h6>
            {printFullLabel && (
              <img
                src={pair.fullLabel}
                alt={pair.fullLabel ? 'Full Label Preview' : 'N/A'}
                className="full-label"
                style={{ display: pair.fullLabel ? 'block' : 'none' }}
              />
            )}
            {printSmallLabel && (
              <img
                src={pair.smallLabel}
                alt={pair.smallLabel ? 'Small Label Preview' : 'N/A'}
                className="small-label"
                style={{ display: pair.smallLabel ? 'block' : 'none' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}