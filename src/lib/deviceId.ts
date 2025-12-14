/**
 * Device ID utility for anonymous user tracking
 * Generates and stores a unique device ID in localStorage
 */

const DEVICE_ID_KEY = 'salonefix_device_id'

/**
 * Get or create a unique device ID for this browser/device
 * This allows anonymous users to track their reports
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    // Server-side: return a temporary ID (won't be used)
    return 'temp-' + Date.now()
  }

  try {
    // Try to get existing device ID from localStorage
    let deviceId = localStorage.getItem(DEVICE_ID_KEY)
    
    if (!deviceId) {
      // Generate a new device ID if one doesn't exist
      deviceId = generateDeviceId()
      localStorage.setItem(DEVICE_ID_KEY, deviceId)
    }
    
    return deviceId
  } catch (error) {
    // If localStorage is not available, generate a temporary ID
    console.warn('localStorage not available, using temporary device ID')
    return 'temp-' + Date.now() + '-' + Math.random().toString(36).substring(7)
  }
}

/**
 * Generate a unique device ID
 * Format: device-{timestamp}-{random}
 */
function generateDeviceId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `device-${timestamp}-${random}`
}

/**
 * Clear the device ID (useful for testing or logout)
 */
export function clearDeviceId(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(DEVICE_ID_KEY)
      localStorage.removeItem('salonefix_my_report_ids')
    } catch (error) {
      console.warn('Failed to clear device ID:', error)
    }
  }
}

/**
 * Store a report ID for this device (fallback when device_id column doesn't exist)
 */
export function addReportIdToDevice(reportId: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const key = 'salonefix_my_report_ids'
    const existing = localStorage.getItem(key)
    const reportIds = existing ? JSON.parse(existing) : []
    
    if (!reportIds.includes(reportId)) {
      reportIds.push(reportId)
      localStorage.setItem(key, JSON.stringify(reportIds))
    }
  } catch (error) {
    console.warn('Failed to store report ID:', error)
  }
}

/**
 * Get all report IDs for this device (fallback when device_id column doesn't exist)
 */
export function getReportIdsForDevice(): string[] {
  if (typeof window === 'undefined') return []
  
  try {
    const key = 'salonefix_my_report_ids'
    const existing = localStorage.getItem(key)
    return existing ? JSON.parse(existing) : []
  } catch (error) {
    console.warn('Failed to get report IDs:', error)
    return []
  }
}




