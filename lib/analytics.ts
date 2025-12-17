// Analytics tracking utilities
// Uses Vercel Analytics (already installed) and custom event tracking

export type AnalyticsEvent = 
  | 'report_submitted'
  | 'report_viewed'
  | 'status_updated'
  | 'map_marker_clicked'
  | 'filter_applied'
  | 'search_performed'
  | 'admin_login'
  | 'admin_logout'
  | 'page_viewed'

interface EventProperties {
  [key: string]: string | number | boolean | undefined
}

// Track custom events
export function trackEvent(event: AnalyticsEvent, properties?: EventProperties) {
  // Vercel Analytics (automatic page views)
  if (typeof window !== 'undefined') {
    // Custom event tracking
    if (window.analytics) {
      window.analytics.track(event, properties)
    }

    // Google Analytics 4 (if configured)
    if (window.gtag) {
      window.gtag('event', event, properties)
    }

    // Console log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Event:', event, properties)
    }
  }
}

// Track page views
export function trackPageView(path: string) {
  trackEvent('page_viewed', { path })
}

// Track report submission
export function trackReportSubmission(category: string, severity: string) {
  trackEvent('report_submitted', {
    category,
    severity,
    timestamp: new Date().toISOString(),
  })
}

// Track status update
export function trackStatusUpdate(reportId: string, oldStatus: string, newStatus: string) {
  trackEvent('status_updated', {
    reportId,
    oldStatus,
    newStatus,
  })
}

// Track map interaction
export function trackMapInteraction(action: 'marker_clicked' | 'map_viewed', reportId?: string) {
  trackEvent('map_marker_clicked', {
    action,
    reportId,
  })
}

// Track search
export function trackSearch(query: string, resultsCount: number) {
  trackEvent('search_performed', {
    query,
    resultsCount,
    queryLength: query.length,
  })
}

// Track filter usage
export function trackFilter(category: string, value: string) {
  trackEvent('filter_applied', {
    category,
    value,
  })
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    analytics?: {
      track: (event: string, properties?: EventProperties) => void
    }
    gtag?: (...args: any[]) => void
  }
}











