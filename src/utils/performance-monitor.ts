// Web Vitals performance monitoring utility
import { 
  onCLS, 
  onFCP,
  onINP, 
  onLCP, 
  onTTFB,
  type Metric 
} from 'web-vitals';

// Performance metrics storage and reporting
interface PerformanceMetrics {
  CLS?: Metric;
  FCP?: Metric;
  INP?: Metric;
  LCP?: Metric;
  TTFB?: Metric;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private isEnabled: boolean = true;
  
  constructor() {
    // Only initialize in browser environment
    if (typeof window === 'undefined') {
      this.isEnabled = false;
      return;
    }

    // Initialize Web Vitals measurement
    this.initializeWebVitals();
    
    // Log initial page load timing
    this.logNavigationTiming();
  }

  private initializeWebVitals(): void {
    if (!this.isEnabled) return;

    try {
      // Cumulative Layout Shift - measures visual stability
      onCLS((metric) => {
        this.metrics.CLS = metric;
        this.reportMetric('CLS', metric);
      });

      // First Contentful Paint - measures loading
      onFCP((metric) => {
        this.metrics.FCP = metric;
        this.reportMetric('FCP', metric);
      });

      // Interaction to Next Paint - measures responsiveness (replaces FID)
      onINP((metric) => {
        this.metrics.INP = metric;
        this.reportMetric('INP', metric);
      });

      // Largest Contentful Paint - measures loading
      onLCP((metric) => {
        this.metrics.LCP = metric;
        this.reportMetric('LCP', metric);
      });

      // Time to First Byte - measures server responsiveness
      onTTFB((metric) => {
        this.metrics.TTFB = metric;
        this.reportMetric('TTFB', metric);
      });
    } catch (error) {
      console.warn('Failed to initialize Web Vitals:', error);
      this.isEnabled = false;
    }
  }

  private reportMetric(name: string, metric: Metric): void {
    if (!this.isEnabled) return;

    const { value, delta, id, navigationType } = metric;
    
    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 [${name}]`, {
        value: `${Math.round(value)}${name === 'CLS' ? '' : 'ms'}`,
        delta: `${Math.round(delta)}${name === 'CLS' ? '' : 'ms'}`,
        rating: this.getRating(name, value),
        navigationType,
        id
      });
    }

    // Send to backend for production monitoring
    this.sendToBackend(name, metric);
    
    // Store in session storage for debugging
    this.storeMetric(name, metric);
  }

  private async sendToBackend(name: string, metric: Metric): Promise<void> {
    try {
      const payload = {
        type: 'WEB_VITALS_METRIC',
        metric: name,
        value: metric.value,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
        rating: this.getRating(name, metric.value),
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      // Try common Flask ports to find the running server
      const commonPorts = [5099, 5100, 5101, 5102, 5103];
      
      for (const port of commonPorts) {
        try {
          const response = await fetch(`http://127.0.0.1:${port}/log-frontend-performance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          if (response.ok) {
            break; // Successfully sent to server
          }
        } catch (portError) {
          // Continue to next port
        }
      }
    } catch (error) {
      // Silently fail - performance monitoring should not break the app
      console.debug('Performance metric send failed:', error);
    }
  }

  private storeMetric(name: string, metric: Metric): void {
    try {
      const key = `labelBro_perf_${name}`;
      const data = {
        value: metric.value,
        delta: metric.delta,
        rating: this.getRating(name, metric.value),
        timestamp: Date.now(),
        id: metric.id
      };
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      // Storage might be full or disabled - ignore
    }
  }

  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    // Web Vitals thresholds (as of 2024)
    const thresholds = {
      CLS: { good: 0.1, poor: 0.25 },
      INP: { good: 200, poor: 500 }, // Replaces FID
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      TTFB: { good: 800, poor: 1800 }
    };

    const threshold = thresholds[name as keyof typeof thresholds];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  private logNavigationTiming(): void {
    if (!this.isEnabled) return;

    // Wait for navigation timing to be available
    setTimeout(() => {
      try {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          const metrics = {
            'DNS Lookup': navigation.domainLookupEnd - navigation.domainLookupStart,
            'TCP Connection': navigation.connectEnd - navigation.connectStart,
            'Server Response': navigation.responseStart - navigation.requestStart,
            'DOM Content Loaded': navigation.domContentLoadedEventEnd - navigation.navigationStart,
            'Page Load Complete': navigation.loadEventEnd - navigation.navigationStart
          };

          if (process.env.NODE_ENV === 'development') {
            console.log('🚀 Navigation Timing:', metrics);
          }
        }
      } catch (error) {
        // Performance API might not be fully supported
        console.debug('Navigation timing not available:', error);
      }
    }, 1000);
  }

  // Public methods for manual performance measurements
  public markStart(name: string): void {
    if (!this.isEnabled) return;
    try {
      performance.mark(`${name}-start`);
    } catch (error) {
      // Mark failed - ignore
    }
  }

  public markEnd(name: string): void {
    if (!this.isEnabled) return;
    try {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      
      const measure = performance.getEntriesByName(name, 'measure')[0];
      if (measure && process.env.NODE_ENV === 'development') {
        console.log(`⏱️ [${name}] ${Math.round(measure.duration)}ms`);
      }
    } catch (error) {
      // Measure failed - ignore
    }
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getStoredMetrics(): Record<string, any> {
    if (!this.isEnabled) return {};
    
    try {
      const stored: Record<string, any> = {};
      const keys = ['CLS', 'FCP', 'INP', 'LCP', 'TTFB'];
      
      for (const key of keys) {
        const item = sessionStorage.getItem(`labelBro_perf_${key}`);
        if (item) {
          stored[key] = JSON.parse(item);
        }
      }
      
      return stored;
    } catch (error) {
      return {};
    }
  }

  public clearStoredMetrics(): void {
    if (!this.isEnabled) return;
    
    try {
      const keys = ['CLS', 'FCP', 'INP', 'LCP', 'TTFB'];
      for (const key of keys) {
        sessionStorage.removeItem(`labelBro_perf_${key}`);
      }
    } catch (error) {
      // Storage access failed - ignore
    }
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export for manual usage
export { PerformanceMonitor };

// Export types for TypeScript support
export type { PerformanceMetrics, Metric };