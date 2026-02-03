/**
 * Performance monitoring utilities
 * Tracks Core Web Vitals and provides optimization insights
 */

// Performance Observer for Core Web Vitals
const perfMetrics = {
  FCP: null,  // First Contentful Paint
  LCP: null,  // Largest Contentful Paint
  FID: null,  // First Input Delay
  CLS: null,  // Cumulative Layout Shift
  TTFB: null  // Time to First Byte
};

// First Contentful Paint
const paintObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name === 'first-contentful-paint') {
      perfMetrics.FCP = entry.startTime;
      console.log(`[Perf] FCP: ${entry.startTime.toFixed(0)}ms`);
    }
  }
});

// Largest Contentful Paint
const lcpObserver = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lastEntry = entries[entries.length - 1];
  perfMetrics.LCP = lastEntry.startTime;
  console.log(`[Perf] LCP: ${lastEntry.startTime.toFixed(0)}ms`);
});

// First Input Delay
const fidObserver = new PerformanceObserver((list) => {
  const entry = list.getEntries()[0];
  perfMetrics.FID = entry.processingStart - entry.startTime;
  console.log(`[Perf] FID: ${perfMetrics.FID.toFixed(0)}ms`);
});

// Cumulative Layout Shift
let clsValue = 0;
const clsObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) {
      clsValue += entry.value;
      perfMetrics.CLS = clsValue;
    }
  }
});

// Initialize observers
function initPerformanceMonitoring() {
  try {
    paintObserver.observe({ type: 'paint', buffered: true });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    fidObserver.observe({ type: 'first-input', buffered: true });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
    
    // Time to First Byte
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length) {
      perfMetrics.TTFB = navEntries[0].responseStart;
      console.log(`[Perf] TTFB: ${perfMetrics.TTFB.toFixed(0)}ms`);
    }
  } catch (e) {
    // Performance Observer not supported
  }
}

// Report metrics (call on page unload or visibility change)
function reportMetrics() {
  console.log('[Perf] Final Metrics:', perfMetrics);
  
  // You could send to analytics here
  // navigator.sendBeacon('/analytics', JSON.stringify(perfMetrics));
}

// Initialize on load
if (document.readyState === 'complete') {
  initPerformanceMonitoring();
} else {
  window.addEventListener('load', initPerformanceMonitoring);
}

// Report on page hide
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    reportMetrics();
  }
});

// Export for debugging
window.__perfMetrics = perfMetrics;
