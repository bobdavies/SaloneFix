import { supabase } from '../lib/supabase'

export interface NotificationFromDB {
  id: string
  report_id: string
  user_id?: string | null
  device_id?: string | null
  type: string
  title: string
  message: string
  status?: string | null
  read: boolean
  created_at: string
}

export interface CreateNotificationParams {
  reportId: string
  userId?: string | null
  deviceId?: string | null
  type: 'status-change' | 'team-assigned' | 'comment' | 'resolved'
  title: string
  message: string
  status?: string
}

/**
 * Helper function to extract error details from Supabase errors
 */
function extractErrorDetails(error: any): string {
  if (!error) return 'Unknown error (error is null/undefined)'
  
  // Try direct string first
  if (typeof error === 'string') {
    return error
  }
  
  // Try to extract error message from various possible locations
  const errorMessage = 
    error.message ||
    error.details ||
    error.hint ||
    (error.code ? `Error code: ${error.code}` : null) ||
    (error.error?.message) ||
    (error.error?.details) ||
    (error.error?.hint) ||
    (error.error?.code ? `Error code: ${error.error.code}` : null)
  
  // If we have an error object, try to stringify it with all properties
  if (!errorMessage && typeof error === 'object') {
    try {
      // Try with Object.getOwnPropertyNames to get all properties including non-enumerable
      const allProps = Object.getOwnPropertyNames(error)
      if (allProps.length > 0) {
        const propsObj: Record<string, any> = {}
        allProps.forEach(prop => {
          try {
            propsObj[prop] = error[prop]
          } catch (e) {
            propsObj[prop] = '[Unable to read property]'
          }
        })
        const stringified = JSON.stringify(propsObj)
        if (stringified !== '{}') {
          return stringified
        }
      }
      
      // Try regular stringify
      const stringified = JSON.stringify(error)
      if (stringified !== '{}') {
        return stringified
      }
      
      // If both fail, return keys
      const keys = Object.keys(error)
      if (keys.length > 0) {
        return `Error object with keys: ${keys.join(', ')} (but values could not be extracted)`
      }
      
      return 'Error object exists but appears to have no enumerable properties'
    } catch (e) {
      // If stringification fails, try to get error properties
      const keys = Object.keys(error)
      if (keys.length > 0) {
        return `Error with keys: ${keys.join(', ')} (stringification failed)`
      }
      return `Error object exists but extraction failed: ${String(e)}`
    }
  }
  
  return errorMessage || 'Unknown error (empty error object)'
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams): Promise<NotificationFromDB | null> {
  try {
    // Validate that we have at least one identifier (user_id or device_id)
    // This matches the database constraint: notifications_user_or_device
    if (!params.userId && !params.deviceId) {
      console.warn('[createNotification] Skipping notification: both userId and deviceId are null/undefined. At least one is required.')
      return null
    }

    // Validate required fields
    if (!params.reportId) {
      console.warn('[createNotification] Skipping notification: reportId is missing.')
      return null
    }

    if (!params.title || !params.message) {
      console.warn('[createNotification] Skipping notification: title or message is missing.')
      return null
    }

    const insertData = {
      report_id: params.reportId,
      user_id: params.userId || null,
      device_id: params.deviceId || null,
      type: params.type,
      title: params.title,
      message: params.message,
      status: params.status || null,
      read: false,
    }

    console.log('[createNotification] Attempting to create notification:', {
      reportId: params.reportId,
      hasUserId: !!params.userId,
      hasDeviceId: !!params.deviceId,
      type: params.type,
    })

    const { data, error } = await supabase
      .from('notifications')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      // Extract error details using our helper
      const errorDetails = extractErrorDetails(error)
      
      // Extract all possible error properties for logging
      const errorCode = error?.code
      const errorMessage = error?.message
      const errorDetailsProp = error?.details
      const errorHint = error?.hint
      const errorStatus = (error as any)?.status
      const errorStatusText = (error as any)?.statusText

      // Log error details - use multiple console.error calls to avoid serialization issues
      console.error('[createNotification] ❌ Error creating notification')
      console.error('  📋 Extracted Error Details:', errorDetails)
      console.error('  🔢 Error Code:', errorCode || 'N/A')
      console.error('  💬 Error Message:', errorMessage || 'N/A')
      console.error('  📝 Error Details Prop:', errorDetailsProp || 'N/A')
      console.error('  💡 Error Hint:', errorHint || 'N/A')
      if (errorStatus) console.error('  📊 Error Status:', errorStatus)
      if (errorStatusText) console.error('  📊 Error Status Text:', errorStatusText)
      
      // Try to get error object structure
      if (error && typeof error === 'object') {
        try {
          const errorKeys = Object.keys(error)
          console.error('  🔑 Error Object Keys:', errorKeys.length > 0 ? errorKeys.join(', ') : 'No enumerable keys found')
        } catch (e) {
          console.error('  🔑 Error Object Keys:', 'Could not extract keys')
        }
      }
      
      console.error('  📤 Attempted Insert Data:', {
        report_id: insertData.report_id,
        has_user_id: !!insertData.user_id,
        has_device_id: !!insertData.device_id,
        type: insertData.type,
        title: insertData.title?.substring(0, 50) + '...',
      })

      // Check for specific error conditions
      const errorStr = String(errorDetails).toLowerCase()
      const errorCodeStr = String(errorCode || '').toLowerCase()
      
      // If table doesn't exist
      if (
        errorStr.includes('does not exist') || 
        errorStr.includes('relation') ||
        errorStr.includes('relation "notifications" does not exist') ||
        errorStr.includes('table') && errorStr.includes('not found')
      ) {
        console.warn('[createNotification] ⚠️ Notifications table does not exist.')
        console.warn('[createNotification] 💡 Solution: Run DOC/admin_features_migration.sql in your Supabase SQL Editor')
        return null
      }

      // If RLS policy is blocking
      if (
        errorStr.includes('policy') ||
        errorStr.includes('permission') ||
        errorStr.includes('denied') ||
        errorStr.includes('row-level security') ||
        errorStr.includes('insufficient privilege') ||
        errorCode === '42501' || // Insufficient privilege
        errorCode === 'PGRST301' // PostgREST permission error
      ) {
        console.warn('[createNotification] ⚠️ RLS policy blocked notification creation.')
        console.warn('[createNotification] 💡 Solution: Run DOC/RLS_POLICIES_SETUP.sql in your Supabase SQL Editor')
        return null
      }

      // If constraint violation
      if (
        errorStr.includes('constraint') ||
        errorStr.includes('notifications_user_or_device') ||
        errorCode === '23514' || // Check violation
        errorCode === '23505' // Unique violation
      ) {
        console.warn('[createNotification] ⚠️ Constraint violation detected.')
        if (errorStr.includes('notifications_user_or_device')) {
          console.warn('[createNotification] 💡 Issue: user_id and device_id cannot both be null')
        }
        return null
      }

      // If foreign key violation
      if (
        errorStr.includes('foreign key') ||
        errorStr.includes('violates foreign key') ||
        errorCode === '23503'
      ) {
        console.warn('[createNotification] ⚠️ Foreign key violation: report_id may not exist in reports table')
        return null
      }

      // For unknown errors, provide general guidance
      console.warn(`[createNotification] ⚠️ Failed to create notification: ${errorDetails}`)
      console.warn('[createNotification] 💡 Check:')
      console.warn('  1. Does the notifications table exist? (Run DOC/admin_features_migration.sql)')
      console.warn('  2. Are RLS policies set up correctly? (Run DOC/RLS_POLICIES_SETUP.sql)')
      console.warn('  3. Is the report_id valid and exists in the reports table?')
      return null
    }

    if (!data) {
      console.warn('[createNotification] No data returned from insert, but no error occurred.')
      return null
    }

    console.log('[createNotification] ✅ Notification created successfully:', data.id)
    return data as NotificationFromDB
  } catch (error) {
    // Catch any unexpected errors
    const errorDetails = extractErrorDetails(error)
    console.error('[createNotification] Unexpected error creating notification:', {
      error: errorDetails,
      errorType: typeof error,
      errorConstructor: error?.constructor?.name,
      fullError: error,
    })
    // Don't throw - notifications are not critical
    return null
  }
}

/**
 * Fetch notifications for a user (by user_id or device_id)
 */
export async function fetchNotifications(
  userId?: string | null,
  deviceId?: string | null
): Promise<NotificationFromDB[]> {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (userId) {
      query = query.eq('user_id', userId)
    } else if (deviceId) {
      query = query.eq('device_id', deviceId)
    } else {
      // No user or device ID, return empty array
      return []
    }

    const { data, error } = await query

    if (error) {
      const errorDetails = extractErrorDetails(error)
      const errorStr = String(errorDetails).toLowerCase()
      
      // If table doesn't exist, return empty array
      if (
        errorStr.includes('does not exist') || 
        errorStr.includes('relation') ||
        errorStr.includes('table') && errorStr.includes('not found')
      ) {
        console.warn('[fetchNotifications] Notifications table does not exist.')
        return []
      }
      
      // If network error or fetch failure, return empty array gracefully
      if (
        errorStr.includes('failed to fetch') ||
        errorStr.includes('network') ||
        errorStr.includes('typeerror') ||
        error instanceof TypeError
      ) {
        console.warn('[fetchNotifications] Network error fetching notifications:', errorDetails)
        return []
      }
      
      // For other errors, log and return empty array
      console.warn('[fetchNotifications] Error fetching notifications:', errorDetails)
      return []
    }

    return (data || []) as NotificationFromDB[]
  } catch (error) {
    // Handle any unexpected errors (network failures, etc.)
    const errorDetails = extractErrorDetails(error)
    const errorStr = String(errorDetails).toLowerCase()
    
    // Network errors should be handled gracefully
    if (
      errorStr.includes('failed to fetch') ||
      errorStr.includes('network') ||
      errorStr.includes('typeerror') ||
      error instanceof TypeError ||
      error instanceof Error && error.message.includes('Failed to fetch')
    ) {
      console.warn('[fetchNotifications] Network error (likely Supabase connection issue):', errorDetails)
      return []
    }
    
    console.error('[fetchNotifications] Unexpected error fetching notifications:', errorDetails)
    return []
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (error) {
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        console.warn('Notifications table does not exist.')
        return false
      }
      throw new Error(`Failed to mark notification as read: ${error.message}`)
    }

    return true
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return false
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
  userId?: string | null,
  deviceId?: string | null
): Promise<boolean> {
  try {
    let query = supabase
      .from('notifications')
      .update({ read: true })

    if (userId) {
      query = query.eq('user_id', userId)
    } else if (deviceId) {
      query = query.eq('device_id', deviceId)
    } else {
      return false
    }

    const { error } = await query

    if (error) {
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        console.warn('Notifications table does not exist.')
        return false
      }
      throw new Error(`Failed to mark all notifications as read: ${error.message}`)
    }

    return true
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return false
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (error) {
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        console.warn('Notifications table does not exist.')
        return false
      }
      throw new Error(`Failed to delete notification: ${error.message}`)
    }

    return true
  } catch (error) {
    console.error('Error deleting notification:', error)
    return false
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(
  userId?: string | null,
  deviceId?: string | null
): Promise<number> {
  try {
    let query = supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('read', false)

    if (userId) {
      query = query.eq('user_id', userId)
    } else if (deviceId) {
      query = query.eq('device_id', deviceId)
    } else {
      return 0
    }

    const { count, error } = await query

    if (error) {
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        return 0
      }
      throw new Error(`Failed to get unread count: ${error.message}`)
    }

    return count || 0
  } catch (error) {
    console.error('Error getting unread notification count:', error)
    return 0
  }
}
