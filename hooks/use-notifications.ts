import { useState, useEffect, useCallback, useRef } from 'react'
import type { Report, ReportStatus } from '@/lib/types'
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, type NotificationFromDB } from '@/src/services/notificationService'
import { getDeviceId } from '@/src/lib/deviceId'
import { getCurrentUser } from '@/src/services/authService'

export interface Notification {
  id: string
  reportId: string
  reportTitle: string
  type: 'status-change' | 'team-assigned' | 'comment' | 'resolved'
  status: ReportStatus
  previousStatus?: ReportStatus
  timestamp: Date
  read: boolean
  title?: string
  message?: string
}

/**
 * Hook to manage notifications for report status changes
 * Fetches notifications from database and tracks when reports change
 */
export function useNotifications(myReports: Report[]) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const previousReportsRef = useRef<Report[]>([])

  // Initialize user ID and device ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const device = getDeviceId()
      setDeviceId(device)
      
      getCurrentUser().then((user) => {
        setUserId(user?.id || null)
      }).catch(() => {
        setUserId(null)
      })
    }
  }, [])

  // Fetch notifications from database
  useEffect(() => {
    if (!userId && !deviceId) return

    const loadNotifications = async () => {
      try {
        const dbNotifications = await fetchNotifications(userId, deviceId)
        
        // Convert database notifications to app notifications
        const convertedNotifications: Notification[] = dbNotifications.map((dbNotif) => {
          // Find the report to get the title
          const report = myReports.find((r) => r.id === dbNotif.report_id)
          
          // Map status
          const statusMap: Record<string, ReportStatus> = {
            'Pending': 'pending',
            'In Progress': 'in-progress',
            'Resolved': 'resolved',
            'pending': 'pending',
            'in-progress': 'in-progress',
            'resolved': 'resolved',
          }
          
          return {
            id: dbNotif.id,
            reportId: dbNotif.report_id,
            reportTitle: report?.title || dbNotif.title,
            type: dbNotif.type as Notification['type'],
            status: statusMap[dbNotif.status || ''] || 'pending',
            timestamp: new Date(dbNotif.created_at),
            read: dbNotif.read,
            title: dbNotif.title,
            message: dbNotif.message,
          }
        })

        setNotifications(convertedNotifications)
        setUnreadCount(convertedNotifications.filter((n) => !n.read).length)
      } catch (error) {
        console.error('Failed to load notifications:', error)
        // Fallback to client-side tracking if database fails
        trackNotificationsClientSide()
      }
    }

    loadNotifications()
    
    // Also track client-side changes as fallback
    const interval = setInterval(() => {
      if (userId || deviceId) {
        loadNotifications()
      }
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [userId, deviceId, myReports])

  // Fallback: Track status changes by comparing previous and current report states
  const trackNotificationsClientSide = useCallback(() => {
    const previousReports = previousReportsRef.current
    const currentReports = myReports

    // Skip on initial load
    if (previousReports.length === 0) {
      previousReportsRef.current = [...currentReports]
      return
    }

    const newNotifications: Notification[] = []

    currentReports.forEach((currentReport) => {
      const previousReport = previousReports.find((r) => r.id === currentReport.id)
      
      if (previousReport && previousReport.status !== currentReport.status) {
        const notification: Notification = {
          id: `${currentReport.id}-${Date.now()}-${Math.random()}`,
          reportId: currentReport.id,
          reportTitle: currentReport.title,
          type: 'status-change',
          status: currentReport.status,
          previousStatus: previousReport.status,
          timestamp: new Date(),
          read: false,
        }

        if (
          (previousReport.status === 'pending' && currentReport.status === 'in-progress') ||
          (previousReport.status === 'in-progress' && currentReport.status === 'resolved') ||
          (previousReport.status === 'pending' && currentReport.status === 'resolved')
        ) {
          newNotifications.push(notification)
        }
      }
    })

    if (newNotifications.length > 0) {
      setNotifications((prev) => [...newNotifications, ...prev].slice(0, 50))
      setUnreadCount((prev) => prev + newNotifications.length)
    }

    previousReportsRef.current = [...currentReports]
  }, [myReports])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    // Optimistically update UI
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      const newUnreadCount = updated.filter((n) => !n.read).length
      setUnreadCount(newUnreadCount)
      return updated
    })
    
    // Update in database
    try {
      await markNotificationAsRead(notificationId)
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      // Revert on error
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === notificationId ? { ...n, read: false } : n))
        setUnreadCount(updated.filter((n) => !n.read).length)
        return updated
      })
    }
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    // Optimistically update UI
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    
    // Update in database
    try {
      await markAllNotificationsAsRead(userId, deviceId)
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }, [userId, deviceId])

  // Clear all notifications
  const clearAll = useCallback(async () => {
    // Delete all notifications from database
    try {
      for (const notification of notifications) {
        await deleteNotification(notification.id)
      }
    } catch (error) {
      console.error('Failed to delete notifications:', error)
    }
    
    setNotifications([])
    setUnreadCount(0)
  }, [notifications])

  // Get notification message
  const getNotificationMessage = useCallback((notification: Notification): string => {
    // Use message from database if available
    if (notification.message) {
      return notification.message
    }
    
    // Fallback to generated messages
    if (notification.type === 'status-change') {
      if (notification.status === 'in-progress') {
        return `Your report "${notification.reportTitle}" is now in progress!`
      }
      if (notification.status === 'resolved') {
        return `Your report "${notification.reportTitle}" has been resolved! 🎉`
      }
    }
    
    if (notification.type === 'team-assigned') {
      return `A team has been assigned to handle your report "${notification.reportTitle}".`
    }
    
    return `Your report "${notification.reportTitle}" status was updated.`
  }, [])

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    getNotificationMessage,
  }
}


