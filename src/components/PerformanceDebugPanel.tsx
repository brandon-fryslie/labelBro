import React, { useState, useEffect } from 'react';
import { performanceMonitor, type PerformanceMetrics } from '../utils/performance-monitor';

export function PerformanceDebugPanel(): React.ReactElement {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [storedMetrics, setStoredMetrics] = useState<Record<string, any>>({});

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(performanceMonitor.getMetrics());
      setStoredMetrics(performanceMonitor.getStoredMetrics());
    };

    // Update metrics periodically
    const interval = setInterval(updateMetrics, 2000);
    
    // Initial update
    updateMetrics();
    
    return () => clearInterval(interval);
  }, []);

  const handleClearMetrics = () => {
    performanceMonitor.clearStoredMetrics();
    setStoredMetrics({});
  };

  const formatValue = (value: number, unit: string = 'ms') => {
    return `${Math.round(value)}${unit}`;
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return 'text-green-600';
      case 'needs-improvement': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return <></>;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        title="Toggle Performance Metrics"
      >
        📊 Perf
      </button>
      
      {isVisible && (
        <div className="absolute bottom-12 left-0 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-80 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Web Vitals Metrics</h3>
            <button
              onClick={handleClearMetrics}
              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              Clear
            </button>
          </div>
          
          <div className="space-y-2">
            {Object.entries(storedMetrics).map(([name, data]) => (
              <div key={name} className="flex items-center justify-between text-xs">
                <span className="font-mono text-gray-700">{name}:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">
                    {formatValue(data.value, name === 'CLS' ? '' : 'ms')}
                  </span>
                  <span className={`px-1 rounded text-xs font-medium ${getRatingColor(data.rating)}`}>
                    {data.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {Object.keys(storedMetrics).length === 0 && (
            <div className="text-xs text-gray-500 text-center py-2">
              No metrics available yet. 
              <br />
              Interact with the page to generate data.
            </div>
          )}
          
          <div className="mt-3 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-600">
              <div className="mb-1">
                <span className="text-green-600">●</span> Good
                <span className="text-yellow-600 ml-2">●</span> Needs Improvement  
                <span className="text-red-600 ml-2">●</span> Poor
              </div>
              <div className="text-xs text-gray-500">
                Metrics sent to backend • Updated every 2s
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}