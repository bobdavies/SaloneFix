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
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams): Promise<NotificationFromDB | null> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        report_id: params.reportId,
        user_id: params.userId || null,
        device_id: params.deviceId || null,
        type: params.type,
        title: params.title,
        message: params.message,
        status: params.status || null,
        read: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      // If table doesn't exist, return null (graceful degradation)
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        console.warn('Notifications table does not exist. Skipping notification creation.')
        return null
      }
      throw new Error(`Failed to create notification: ${error.message}`)
    }

    console.log('✅ Notification created:', data.id)
    return data as NotificationFromDB
  } catch (error) {
    console.error('Error creating notification:', error)
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
      // If table doesn't exist, return empty array
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        console.warn('Notifications table does not exist.')
        return []
      }
      throw new Error(`Failed to fetch notifications: ${error.message}`)
    }

    return (data || []) as NotificationFromDB[]
  } catch (error) {
    console.error('Error fetching notifications:', error)
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
