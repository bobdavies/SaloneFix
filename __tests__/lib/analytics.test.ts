import { trackEvent, trackReportSubmission, trackStatusUpdate, trackSearch, trackFilter } from '@/lib/analytics'

// Mock window.analytics and window.gtag
const mockAnalytics = {
  track: jest.fn(),
}

const mockGtag = jest.fn()

// Setup window mocks before importing
Object.defineProperty(window, 'analytics', {
  writable: true,
  value: mockAnalytics,
})

Object.defineProperty(window, 'gtag', {
  writable: true,
  value: mockGtag,
})

beforeEach(() => {
  jest.clearAllMocks()
  // Ensure window objects are set
  ;(window as any).analytics = mockAnalytics
  ;(window as any).gtag = mockGtag
})

describe('Analytics', () => {
  describe('trackEvent', () => {
    it('should track events with window.analytics', () => {
      trackEvent('report_submitted', { category: 'sanitation' })

      expect(mockAnalytics.track).toHaveBeenCalledWith('report_submitted', { category: 'sanitation' })
    })

    it('should track events with gtag if available', () => {
      trackEvent('report_submitted', { category: 'sanitation' })

      expect(mockGtag).toHaveBeenCalledWith('event', 'report_submitted', { category: 'sanitation' })
    })

    it('should handle events without properties', () => {
      trackEvent('page_viewed')

      expect(mockAnalytics.track).toHaveBeenCalledWith('page_viewed', undefined)
    })
  })

  describe('trackReportSubmission', () => {
    it('should track report submission with correct properties', () => {
      trackReportSubmission('sanitation', 'high')

      expect(mockAnalytics.track).toHaveBeenCalledWith('report_submitted', {
        category: 'sanitation',
        severity: 'high',
        timestamp: expect.any(String),
      })
    })
  })

  describe('trackStatusUpdate', () => {
    it('should track status updates', () => {
      trackStatusUpdate('report-123', 'pending', 'in-progress')

      expect(mockAnalytics.track).toHaveBeenCalledWith('status_updated', {
        reportId: 'report-123',
        oldStatus: 'pending',
        newStatus: 'in-progress',
      })
    })
  })

  describe('trackSearch', () => {
    it('should track search with query and results', () => {
      trackSearch('pothole', 5)

      expect(mockAnalytics.track).toHaveBeenCalledWith('search_performed', {
        query: 'pothole',
        resultsCount: 5,
        queryLength: 7,
      })
    })
  })

  describe('trackFilter', () => {
    it('should track filter usage', () => {
      trackFilter('category', 'sanitation')

      expect(mockAnalytics.track).toHaveBeenCalledWith('filter_applied', {
        category: 'category',
        value: 'sanitation',
      })
    })
  })
})

