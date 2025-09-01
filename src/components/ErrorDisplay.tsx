import React from 'react';
import { useApp } from '../context/AppContext';

export function ErrorDisplay(): React.ReactElement {
  const { state, setError } = useApp();

  if (!state.error) {
    return <></>;
  }

  return (
    <div className="error-banner">
      <div className="error-content">
        <span className="error-icon">⚠️</span>
        <span className="error-message">{state.error}</span>
      </div>
      <button 
        className="error-dismiss"
        onClick={() => setError(null)}
        title="Dismiss error"
        aria-label="Dismiss error"
      >
        ✕
      </button>
    </div>
  );
}