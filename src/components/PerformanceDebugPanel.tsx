import React, { useState, useEffect } from 'react';

// Dynamic import types to avoid bundling the performance monitor
interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null; 
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
  [key: string]: any;
}

export function PerformanceDebugPanel(): React.ReactElement {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});
  const [storedMetrics, setStoredMetrics] = useState<Record<string, { value: number; rating: string; timestamp: number }>>({});
  const [performanceMonitor, setPerformanceMonitor] = useState<any>(null);

  useEffect(() => {
    // Only load performance monitoring in development
    if (!import.meta.env.DEV) {
      return;
    }

    // Dynamically import performance monitor to avoid bundling in production
    import('../utils/performance-monitor').then(({ performanceMonitor: pm }) => {
      setPerformanceMonitor(pm);
    }).catch(error => {
      console.error('Failed to load performance monitor:', error);
    });
  }, []);

  useEffect(() => {
    if (!performanceMonitor) {
      return;
    }

    const updateMetrics = () => {
      setMetrics(performanceMonitor.getMetrics());
      setStoredMetrics(performanceMonitor.getStoredMetrics());
    };

    // Update metrics periodically
    const interval = setInterval(updateMetrics, 2000);
    
    // Initial update
    updateMetrics();
    
    return () => clearInterval(interval);
  }, [performanceMonitor]);

  // Don't render in production
  if (!import.meta.env.DEV) {
    return <div style={{ display: 'none' }} />;
  }

  // Don't render if performance monitor isn't loaded
  if (!performanceMonitor) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        padding: '8px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        Loading performance monitor...
      </div>
    );
  }

  const clearMetrics = () => {
    if (performanceMonitor) {
      performanceMonitor.clearStoredMetrics();
      setStoredMetrics({});
    }
  };

  const getRatingColor = (rating: string): string => {
    switch (rating.toLowerCase()) {
      case 'good': return '#10b981';
      case 'needs-improvement': return '#f59e0b';
      case 'poor': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          padding: '8px 12px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontFamily: 'monospace',
          zIndex: 1000
        }}
      >
        {isVisible ? 'Hide' : 'Show'} Perf
      </button>

      {/* Performance Panel */}
      {isVisible && (
        <div style={{
          position: 'fixed',
          bottom: '50px',
          right: '10px',
          width: '320px',
          maxHeight: '400px',
          background: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '12px',
          fontFamily: 'monospace',
          zIndex: 1000,
          overflowY: 'auto'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '12px',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            paddingBottom: '8px'
          }}>
            <h3 style={{ margin: 0, fontSize: '14px' }}>Performance Metrics</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={clearMetrics}
                style={{
                  padding: '4px 8px',
                  background: '#374151',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
              >
                Clear
              </button>
              <button
                onClick={() => setIsVisible(false)}
                style={{
                  padding: '4px 8px',
                  background: '#374151',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Current Metrics */}
          <div style={{ marginBottom: '12px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#9ca3af' }}>
              Current Session
            </h4>
            {Object.keys(metrics).length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                {Object.entries(metrics).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#d1d5db' }}>{key.toUpperCase()}:</span>
                    <span style={{ color: '#f3f4f6' }}>
                      {value !== null ? `${value.toFixed(2)}ms` : 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                No metrics available yet
              </div>
            )}
          </div>

          {/* Stored Metrics */}
          {Object.keys(storedMetrics).length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#9ca3af' }}>
                Historical Data
              </h4>
              <div style={{ display: 'grid', gap: '6px' }}>
                {Object.entries(storedMetrics).map(([key, data]) => (
                  <div key={key} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4px 8px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '4px'
                  }}>
                    <span style={{ color: '#d1d5db' }}>{key.toUpperCase()}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#f3f4f6' }}>
                        {data.value.toFixed(2)}ms
                      </span>
                      <span style={{
                        color: getRatingColor(data.rating),
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}>
                        {data.rating}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}