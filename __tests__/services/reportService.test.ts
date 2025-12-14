import { convertReportFromDB, clearReportsCache } from '@/src/services/reportService'
import type { ReportFromDB } from '@/src/services/reportService'

describe('reportService', () => {
  describe('convertReportFromDB', () => {
    it('should convert ReportFromDB to Report correctly', () => {
      const dbReport: ReportFromDB = {
        id: '123',
        image_url: 'https://example.com/image.jpg',
        latitude: 8.4606,
        longitude: -13.2562,
        category: 'Sanitation',
        severity: 'High',
        description: 'Test description',
        status: 'Pending',
        created_at: '2024-01-01T00:00:00Z',
      }

      const result = convertReportFromDB(dbReport)

      expect(result.id).toBe('123')
      expect(result.imageUrl).toBe('https://example.com/image.jpg')
      expect(result.location).toBe('8.460600, -13.256200')
      expect(result.category).toBe('sanitation')
      expect(result.severity).toBe('high')
      expect(result.status).toBe('pending')
      expect(result.description).toBe('Test description')
      expect(result.title).toBe('Sanitation Issue')
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('should map category correctly for different inputs', () => {
      const categories = [
        { input: 'Trash', expected: 'sanitation' },
        { input: 'Pothole', expected: 'roads' },
        { input: 'Water Leak', expected: 'water' },
        { input: 'Street Light', expected: 'electrical' },
        { input: 'Unknown', expected: 'other' },
      ]

      categories.forEach(({ input, expected }) => {
        const dbReport: ReportFromDB = {
          id: '1',
          image_url: '',
          latitude: 0,
          longitude: 0,
          category: input,
          severity: 'Medium',
          description: '',
          status: 'Pending',
          created_at: new Date().toISOString(),
        }

        const result = convertReportFromDB(dbReport)
        expect(result.category).toBe(expected)
      })
    })

    it('should map severity correctly', () => {
      const severities: Array<'High' | 'Medium' | 'Low'> = ['High', 'Medium', 'Low']
      const expected = ['high', 'medium', 'low']

      severities.forEach((severity, index) => {
        const dbReport: ReportFromDB = {
          id: '1',
          image_url: '',
          latitude: 0,
          longitude: 0,
          category: 'Test',
          severity,
          description: '',
          status: 'Pending',
          created_at: new Date().toISOString(),
        }

        const result = convertReportFromDB(dbReport)
        expect(result.severity).toBe(expected[index])
      })
    })

    it('should map status correctly', () => {
      const statuses = [
        { input: 'Pending', expected: 'pending' },
        { input: 'In Progress', expected: 'in-progress' },
        { input: 'Resolved', expected: 'resolved' },
        { input: 'in-progress', expected: 'in-progress' },
        { input: 'resolved', expected: 'resolved' },
      ]

      statuses.forEach(({ input, expected }) => {
        const dbReport: ReportFromDB = {
          id: '1',
          image_url: '',
          latitude: 0,
          longitude: 0,
          category: 'Test',
          severity: 'Medium',
          description: '',
          status: input,
          created_at: new Date().toISOString(),
        }

        const result = convertReportFromDB(dbReport)
        expect(result.status).toBe(expected)
      })
    })
  })

  describe('clearReportsCache', () => {
    it('should be callable without errors', () => {
      expect(() => clearReportsCache()).not.toThrow()
    })
  })
})





