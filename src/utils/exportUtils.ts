/**
 * Export Utilities
 * Functions for exporting data in various formats
 */

import type { Report } from '@/lib/types'
import type { ReportFromDB } from '@/services/reportService'

/**
 * Export reports to CSV format
 */
export function exportToCSV(reports: Report[] | ReportFromDB[], filename: string = 'reports'): void {
  if (reports.length === 0) {
    throw new Error('No reports to export')
  }

  // Convert reports to CSV format
  const headers = [
    'ID',
    'Title',
    'Category',
    'Status',
    'Priority',
    'Severity',
    'Location',
    'Description',
    'Assigned To',
    'Created At',
    'Updated At',
  ]

  const rows = reports.map((report) => {
    const r = report as any
    return [
      r.id || '',
      r.title || r.category || '',
      r.category || '',
      r.status || '',
      r.priority || '',
      r.severity || '',
      r.location || `${r.latitude || ''}, ${r.longitude || ''}`,
      (r.description || '').replace(/"/g, '""'), // Escape quotes
      r.assignedTo || r.assigned_to || '',
      r.timestamp ? new Date(r.timestamp).toISOString() : (r.created_at || ''),
      r.updated_at || '',
    ]
  })

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell: any) => `"${cell}"`).join(',')),
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export reports to JSON format
 */
export function exportToJSON(reports: Report[] | ReportFromDB[], filename: string = 'reports'): void {
  if (reports.length === 0) {
    throw new Error('No reports to export')
  }

  const jsonContent = JSON.stringify(reports, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.json`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export reports to XLSX format (Excel)
 * Note: This requires a library like xlsx. For now, we'll create a CSV with .xlsx extension
 * or use a simple HTML table that Excel can open.
 */
export function exportToXLSX(reports: Report[] | ReportFromDB[], filename: string = 'reports'): void {
  if (reports.length === 0) {
    throw new Error('No reports to export')
  }

  // Create HTML table that Excel can open
  const headers = [
    'ID',
    'Title',
    'Category',
    'Status',
    'Priority',
    'Severity',
    'Location',
    'Description',
    'Assigned To',
    'Created At',
    'Updated At',
  ]

  const rows = reports.map((report) => {
    const r = report as any
    return [
      r.id || '',
      r.title || r.category || '',
      r.category || '',
      r.status || '',
      r.priority || '',
      r.severity || '',
      r.location || `${r.latitude || ''}, ${r.longitude || ''}`,
      r.description || '',
      r.assignedTo || r.assigned_to || '',
      r.timestamp ? new Date(r.timestamp).toISOString() : (r.created_at || ''),
      r.updated_at || '',
    ]
  })

  // Create HTML table
  const htmlContent = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              ${headers.map((h) => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `<tr>${row.map((cell: any) => `<td>${cell}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `

  const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.xls`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export reports based on format
 */
export function exportReports(
  reports: Report[] | ReportFromDB[],
  format: 'csv' | 'json' | 'xlsx',
  filename: string = 'reports'
): void {
  switch (format) {
    case 'csv':
      exportToCSV(reports, filename)
      break
    case 'json':
      exportToJSON(reports, filename)
      break
    case 'xlsx':
      exportToXLSX(reports, filename)
      break
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

/**
 * Create a backup of all settings and data
 */
export function createBackup(): { settings: any; timestamp: string } {
  const backup: { settings: any; timestamp: string } = {
    settings: {},
    timestamp: new Date().toISOString(),
  }

  // Backup settings from localStorage
  if (typeof window !== 'undefined') {
    try {
      const settings = localStorage.getItem('salonefix_user_settings')
      const autoAssignmentRules = localStorage.getItem('autoAssignmentRules')
      const autoAssignmentEnabled = localStorage.getItem('autoAssignmentEnabled')

      backup.settings = {
        userSettings: settings ? JSON.parse(settings) : null,
        autoAssignmentRules: autoAssignmentRules ? JSON.parse(autoAssignmentRules) : null,
        autoAssignmentEnabled: autoAssignmentEnabled === 'true',
      }
    } catch (error) {
      console.error('Error creating backup:', error)
    }
  }

  return backup
}

/**
 * Download backup as JSON file
 */
export function downloadBackup(): void {
  try {
    const backup = createBackup()
    const jsonContent = JSON.stringify(backup, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `salonefix_backup_${new Date().toISOString().split('T')[0]}.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error downloading backup:', error)
    throw error
  }
}

