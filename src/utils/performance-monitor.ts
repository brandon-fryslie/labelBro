import { errorTracking } from './error-tracking';

export interface WebVitalsMetrics {
  CLS: number;
  FID: number;
  LCP: number;
  FCP: number;
  TTFB: number;
}

export interface PerformanceMetrics extends WebVitalsMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
  };
}

// Web Vitals types that may not be in all TypeScript versions
declare global {
  interface LayoutShift extends PerformanceEntry {
    value: number;
    hadRecentInput: boolean;
  }

  interface LargestContentfulPaint extends PerformanceEntry {
    startTime: number;
  }
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];
  private isInitialized = false;
  private isDevelopment = process.env.NODE_ENV === 'development';
  private storedMetrics: Record<string, { value: number; rating: string; timestamp: number }> = {};

  public initialize(): void {
    if (this.isInitialized) return;
    
    try {
      this.setupWebVitalsObservers();
      this.setupNavigationTimingObserver();
      this.measureMemoryUsage();
      this.logNavigationDetails();
      
      this.isInitialized = true;
      
      if (this.isDevelopment) {
        console.log('🔍 Performance monitoring initialized');
      }
    } catch (error) {
      errorTracking.captureError(error as Error, {
        context: 'performance_monitor_initialization',
        userAgent: navigator.userAgent
      });
    }
  }

  public markStart(label: string): void {
    try {
      performance.mark(`${label}-start`);
    } catch (error) {
      if (this.isDevelopment) {
        console.debug('Performance mark not supported:', error);
      }
    }
  }

  public markEnd(label: string): void {
    try {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
    } catch (error) {
      if (this.isDevelopment) {
        console.debug('Performance measure not supported:', error);
      }
    }
  }

  private setupWebVitalsObservers(): void {
    // Cumulative Layout Shift (CLS)
    this.observeMetric('layout-shift', (entries) => {
      let clsValue = 0;
      for (const entry of entries as LayoutShift[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.metrics.CLS = clsValue;
      this.reportMetric('CLS', clsValue);
      this.storeMetric('CLS', clsValue);
    });

    // Largest Contentful Paint (LCP)
    this.observeMetric('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1] as LargestContentfulPaint;
      const lcpValue = lastEntry.startTime;
      this.metrics.LCP = lcpValue;
      this.reportMetric('LCP', lcpValue);
      this.storeMetric('LCP', lcpValue);
    });

    // First Input Delay (FID)
    this.observeMetric('first-input', (entries) => {
      const firstInput = entries[0] as PerformanceEventTiming;
      const fidValue = firstInput.processingStart - firstInput.startTime;
      this.metrics.FID = fidValue;
      this.reportMetric('FID', fidValue);
      this.storeMetric('FID', fidValue);
    });

    // First Contentful Paint (FCP)
    this.observeMetric('paint', (entries) => {
      const fcpEntry = entries.find((entry) => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        const fcpValue = fcpEntry.startTime;
        this.metrics.FCP = fcpValue;
        this.reportMetric('FCP', fcpValue);
        this.storeMetric('FCP', fcpValue);
      }
    });

    // Time to First Byte (TTFB)
    this.observeMetric('navigation', (entries) => {
      const navigationEntry = entries[0] as PerformanceNavigationTiming;
      const ttfbValue = navigationEntry.responseStart - navigationEntry.fetchStart;
      this.metrics.TTFB = ttfbValue;
      this.reportMetric('TTFB', ttfbValue);
      this.storeMetric('TTFB', ttfbValue);
    });
  }

  private observeMetric(entryType: string, callback: (entries: PerformanceEntry[]) => void): void {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      observer.observe({ entryTypes: [entryType] });
      this.observers.push(observer);
    } catch (error) {
      // Some performance APIs might not be available in all browsers
      if (this.isDevelopment) {
        console.debug(`Performance observer for ${entryType} not available:`, error);
      }
    }
  }

  private setupNavigationTimingObserver(): void {
    // Basic navigation timing metrics
    if ('performance' in window && 'getEntriesByType' in performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            const loadTime = navigation.loadEventEnd - navigation.fetchStart;
            const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
            
            this.metrics.loadTime = loadTime;
            this.metrics.domContentLoaded = domContentLoaded;
            
            this.reportMetric('Load Time', loadTime);
            this.reportMetric('DOM Content Loaded', domContentLoaded);
            this.storeMetric('Load Time', loadTime);
            this.storeMetric('DOM Content Loaded', domContentLoaded);
          }
        }, 0);
      });
    }
  }

  private measureMemoryUsage(): void {
    // Modern memory API (Chrome/Edge)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
      
      if (this.isDevelopment) {
        console.log('💾 Memory Usage:', {
          used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
        });
      }
    }
  }

  private storeMetric(name: string, value: number): void {
    const rating = this.getMetricRating(name, value);
    this.storedMetrics[name] = {
      value,
      rating,
      timestamp: Date.now()
    };
  }

  private getMetricRating(name: string, value: number): string {
    const thresholds = {
      'CLS': { good: 0.1, poor: 0.25 },
      'LCP': { good: 2500, poor: 4000 },
      'FID': { good: 100, poor: 300 },
      'FCP': { good: 1800, poor: 3000 },
      'TTFB': { good: 600, poor: 1500 },
      'Load Time': { good: 3000, poor: 5000 },
      'DOM Content Loaded': { good: 1500, poor: 3000 }
    };

    const threshold = thresholds[name as keyof typeof thresholds];
    if (!threshold) return 'unknown';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  private reportMetric(name: string, value: number): void {
    if (this.isDevelopment) {
      console.log(`📊 ${name}:`, `${value.toFixed(2)}${name === 'CLS' ? '' : 'ms'}`);
    }

    // Report performance issues to error tracking
    const thresholds = {
      'CLS': 0.1, // Good: ≤ 0.1
      'LCP': 2500, // Good: ≤ 2.5s
      'FID': 100, // Good: ≤ 100ms
      'FCP': 1800, // Good: ≤ 1.8s
      'TTFB': 600, // Good: ≤ 600ms
      'Load Time': 3000, // Good: ≤ 3s
      'DOM Content Loaded': 1500 // Good: ≤ 1.5s
    };

    const threshold = thresholds[name as keyof typeof thresholds];
    if (threshold && value > threshold) {
      errorTracking.capturePerformanceIssue(`Poor ${name} performance: ${value.toFixed(2)}${name === 'CLS' ? '' : 'ms'}`, {
        metric: name,
        value: value,
        threshold: threshold,
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    }
  }

  public getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  public getStoredMetrics(): Record<string, { value: number; rating: string; timestamp: number }> {
    return { ...this.storedMetrics };
  }

  public clearStoredMetrics(): void {
    this.storedMetrics = {};
  }

  public getWebVitalsScore(): { score: number; details: Record<string, string> } {
    const { CLS, LCP, FID, FCP, TTFB } = this.metrics;
    
    const scores = {
      CLS: CLS !== undefined ? (CLS <= 0.1 ? 100 : CLS <= 0.25 ? 50 : 0) : null,
      LCP: LCP !== undefined ? (LCP <= 2500 ? 100 : LCP <= 4000 ? 50 : 0) : null,
      FID: FID !== undefined ? (FID <= 100 ? 100 : FID <= 300 ? 50 : 0) : null,
      FCP: FCP !== undefined ? (FCP <= 1800 ? 100 : FCP <= 3000 ? 50 : 0) : null,
      TTFB: TTFB !== undefined ? (TTFB <= 600 ? 100 : TTFB <= 1500 ? 50 : 0) : null
    };

    const validScores = Object.values(scores).filter(s => s !== null) as number[];
    const averageScore = validScores.length > 0 
      ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length 
      : 0;

    const details = {
      CLS: CLS !== undefined ? `${CLS.toFixed(3)} (${CLS <= 0.1 ? 'Good' : CLS <= 0.25 ? 'Needs Improvement' : 'Poor'})` : 'Not measured',
      LCP: LCP !== undefined ? `${LCP.toFixed(0)}ms (${LCP <= 2500 ? 'Good' : LCP <= 4000 ? 'Needs Improvement' : 'Poor'})` : 'Not measured',
      FID: FID !== undefined ? `${FID.toFixed(0)}ms (${FID <= 100 ? 'Good' : FID <= 300 ? 'Needs Improvement' : 'Poor'})` : 'Not measured',
      FCP: FCP !== undefined ? `${FCP.toFixed(0)}ms (${FCP <= 1800 ? 'Good' : FCP <= 3000 ? 'Needs Improvement' : 'Poor'})` : 'Not measured',
      TTFB: TTFB !== undefined ? `${TTFB.toFixed(0)}ms (${TTFB <= 600 ? 'Good' : TTFB <= 1500 ? 'Needs Improvement' : 'Poor'})` : 'Not measured'
    };

    return { score: Math.round(averageScore), details };
  }

  public logNavigationDetails(): void {
    // Wait for navigation timing to be available
    setTimeout(() => {
      try {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          const metrics = {
            'DNS Lookup': navigation.domainLookupEnd - navigation.domainLookupStart,
            'TCP Connection': navigation.connectEnd - navigation.connectStart,
            'Server Response': navigation.responseStart - navigation.requestStart,
            'DOM Content Loaded': navigation.domContentLoadedEventEnd - navigation.startTime,
            'Page Load Complete': navigation.loadEventEnd - navigation.startTime
          };

          if (this.isDevelopment) {
            console.log('🚀 Navigation Timing:', metrics);
          }
        }
      } catch (error) {
        // Performance API might not be fully supported
        console.debug('Navigation timing not available:', error);
      }
    }, 1000);
  }

  public cleanup(): void {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        // Observer might already be disconnected
      }
    });
    this.observers = [];
    this.isInitialized = false;
  }

  // Report current performance snapshot
  public reportSnapshot(): void {
    const metrics = this.getMetrics();
    const vitalsScore = this.getWebVitalsScore();
    
    errorTracking.captureMessage('Performance snapshot', 'info', {
      performance: {
        metrics,
        webVitalsScore: vitalsScore.score,
        webVitalsDetails: vitalsScore.details,
        memoryUsage: metrics.memoryUsage,
        timestamp: new Date().toISOString(),
        url: window.location.href
      }
    });

    if (this.isDevelopment) {
      console.log('📈 Performance Snapshot:', {
        metrics,
        webVitalsScore: vitalsScore.score,
        details: vitalsScore.details
      });
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Initialize on module load
performanceMonitor.initialize();

// Report snapshot after page load
window.addEventListener('load', () => {
  setTimeout(() => {
    performanceMonitor.reportSnapshot();
  }, 5000); // Wait 5 seconds after load to capture metrics
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  performanceMonitor.cleanup();
});