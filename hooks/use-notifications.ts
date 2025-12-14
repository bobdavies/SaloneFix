import { useState, useEffect, useCallback, useRef } from 'react'
import type { Report, ReportStatus } from '@/lib/types'

export interface Notification {
  id: string
  reportId: string
  reportTitle: string
  type: 'status-change'
  status: ReportStatus
  previousStatus: ReportStatus
  timestamp: Date
  read: boolean
}

/**
 * Hook to manage notifications for report status changes
 * Tracks when reports change from pending -> in-progress or in-progress -> resolved
 */
export function useNotifications(myReports: Report[]) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const previousReportsRef = useRef<Report[]>([])

  // Track status changes by comparing previous and current report states
  useEffect(() => {
    const previousReports = previousReportsRef.current
    const currentReports = myReports

    // Skip on initial load (when previousReports is empty)
    if (previousReports.length === 0) {
      console.log('📋 Initializing notifications with', currentReports.length, 'reports')
      previousReportsRef.current = [...currentReports]
      return
    }

    const newNotifications: Notification[] = []

    currentReports.forEach((currentReport) => {
      const previousReport = previousReports.find((r) => r.id === currentReport.id)
      
      if (previousReport && previousReport.status !== currentReport.status) {
        // Status changed - create notification
        console.log('🔔 Status change detected:', {
          reportId: currentReport.id.substring(0, 8) + '...',
          title: currentReport.title,
          oldStatus: previousReport.status,
          newStatus: currentReport.status
        })
        
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

        // Only notify for meaningful status changes
        if (
          (previousReport.status === 'pending' && currentReport.status === 'in-progress') ||
          (previousReport.status === 'in-progress' && currentReport.status === 'resolved') ||
          (previousReport.status === 'pending' && currentReport.status === 'resolved')
        ) {
          console.log('✅ Creating notification for status change:', notification)
          newNotifications.push(notification)
        } else {
          console.log('⏭️ Skipping notification (not a meaningful status change)')
        }
      }
    })

    // Also check for new reports that were added
    currentReports.forEach((currentReport) => {
      const wasInPrevious = previousReports.some((r) => r.id === currentReport.id)
      if (!wasInPrevious && currentReport.status !== 'pending') {
        // New report with non-pending status (shouldn't happen, but handle it)
        const notification: Notification = {
          id: `${currentReport.id}-${Date.now()}-${Math.random()}`,
          reportId: currentReport.id,
          reportTitle: currentReport.title,
          type: 'status-change',
          status: currentReport.status,
          previousStatus: 'pending',
          timestamp: new Date(),
          read: false,
        }
        if (currentReport.status === 'in-progress' || currentReport.status === 'resolved') {
          newNotifications.push(notification)
        }
      }
    })

    if (newNotifications.length > 0) {
      console.log(`🔔 Adding ${newNotifications.length} new notification(s)`)
      setNotifications((prev) => {
        const updated = [...newNotifications, ...prev].slice(0, 50) // Limit to 50 notifications
        console.log(`📬 Total notifications: ${updated.length}`)
        return updated
      })
      setUnreadCount((prev) => {
        const newCount = prev + newNotifications.length
        console.log(`🔴 Unread count: ${newCount}`)
        return newCount
      })
    } else if (currentReports.length !== previousReports.length) {
      // Reports count changed but no status changes - just log it
      console.log('📊 Reports count changed:', previousReports.length, '→', currentReports.length)
    }

    // Update ref for next comparison
    previousReportsRef.current = [...currentReports]
  }, [myReports])

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      const newUnreadCount = updated.filter((n) => !n.read).length
      setUnreadCount(newUnreadCount)
      return updated
    })
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [])

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
  }, [])

  // Get notification message
  const getNotificationMessage = useCallback((notification: Notification): string => {
    if (notification.type === 'status-change') {
      if (notification.status === 'in-progress') {
        return `Your report "${notification.reportTitle}" is now in progress!`
      }
      if (notification.status === 'resolved') {
        return `Your report "${notification.reportTitle}" has been resolved! 🎉`
      }
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
