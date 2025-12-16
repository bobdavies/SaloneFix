import { useEffect, useState } from 'react'
import { supabase } from '../src/lib/supabase'
import { fetchReportsByDeviceOrUser, convertReportFromDB, type ReportFromDB } from '../src/services/reportService'
import type { Report } from '../lib/types'

/**
 * Custom hook for real-time subscription to user's own reports
 * Filters updates to only include reports belonging to this device/user
 */
export function useMyReportsSubscription(deviceId: string | null, userId: string | null) {
  const [myReports, setMyReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout | null = null

    // Initial fetch - always try, even if deviceId/userId is null (will use localStorage fallback)
    const loadMyReports = async () => {
      if (!mounted) return
      
      try {
        setIsLoading(true)
        
        // Get deviceId from localStorage if not provided (for page refresh case)
        let effectiveDeviceId = deviceId
        if (!effectiveDeviceId && typeof window !== 'undefined') {
          try {
            const storedDeviceId = localStorage.getItem('salonefix_device_id')
            if (storedDeviceId) {
              effectiveDeviceId = storedDeviceId
              console.log('Using deviceId from localStorage for initial load')
            }
          } catch {
            // Ignore localStorage errors
          }
        }
        
        // Always try to fetch - fetchReportsByDeviceOrUser handles null values gracefully
        // It will use localStorage fallback to get report IDs if deviceId/userId is null
        const dbReports = await fetchReportsByDeviceOrUser(effectiveDeviceId, userId)
        if (mounted) {
          const convertedReports = dbReports.map(convertReportFromDB)
          console.log(`✅ Loaded ${convertedReports.length} reports for "My Reports"`, { 
            deviceId: effectiveDeviceId ? `${effectiveDeviceId.substring(0, 15)}...` : 'null', 
            userId: userId ? 'present' : 'null',
            fromLocalStorage: !deviceId && effectiveDeviceId ? 'yes' : 'no',
            reportIds: convertedReports.map(r => r.id.substring(0, 8))
          })
          setMyReports(convertedReports)
        }
      } catch (err) {
        console.error('❌ Failed to load my reports:', err)
        if (mounted) {
          setMyReports([])
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    // Always try to load reports - this ensures reports persist on page refresh
    // Strategy:
    // 1. Always try loading (will use localStorage fallback if deviceId/userId is null)
    // 2. If deviceId/userId is available, load immediately
    // 3. Otherwise, wait a bit then load (handles page refresh case)
    // 4. When deviceId changes from null to a value, this effect re-runs and loads again
    
    // Always attempt to load - fetchReportsByDeviceOrUser will use localStorage fallback
    // This ensures reports load on page refresh even before deviceId is set
    const attemptLoad = () => {
      if (deviceId || userId) {
        // We have tracking ID, load immediately
        console.log('🔄 Loading reports with deviceId/userId')
        loadMyReports()
      } else {
        // No tracking ID yet, but try loading anyway (will use localStorage fallback)
        // This handles the page refresh case where deviceId might not be set immediately
        console.log('🔄 Loading reports with localStorage fallback (deviceId/userId not set yet)')
        timeoutId = setTimeout(() => {
          loadMyReports()
        }, 250)
      }
    }
    
    attemptLoad()

    // Set up real-time subscription for this user's reports
    const channel = supabase
      .channel(`my-reports-${deviceId || userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'reports',
        },
        async (payload) => {
          console.log('Real-time update for my reports:', payload)

          // Check if this report belongs to the current user/device
          const report = payload.new as ReportFromDB | null
          const oldReport = payload.old as ReportFromDB | null
          
          // Helper to check if report belongs to this user/device
          const belongsToUser = (r: ReportFromDB | null) => {
            if (!r) return false
            
            // Check authenticated user first
            if (userId && r.reporter_id === userId) return true
            
            // Check device_id (if column exists)
            if (deviceId && r.device_id === deviceId) return true
            
            // Always check localStorage fallback (works even if device_id column doesn't exist or deviceId is null)
            if (typeof window !== 'undefined') {
              try {
                const storedIds = JSON.parse(localStorage.getItem('salonefix_my_report_ids') || '[]')
                if (storedIds.includes(r.id)) return true
              } catch {
                // Ignore localStorage errors
              }
            }
            
            return false
          }

          if (payload.eventType === 'INSERT') {
            // New report added - check if it belongs to this user
            if (report && belongsToUser(report)) {
              const converted = convertReportFromDB(report)
              if (mounted) {
                setMyReports((prev) => {
                  // Check if already exists (avoid duplicates)
                  if (prev.some(r => r.id === converted.id)) {
                    return prev
                  }
                  return [converted, ...prev]
                })
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            // Report updated - check if it belongs to this user
            if (report && belongsToUser(report)) {
              const converted = convertReportFromDB(report)
              if (mounted) {
                setMyReports((prev) => {
                  const existingIndex = prev.findIndex((r) => r.id === converted.id)
                  if (existingIndex >= 0) {
                    // Update existing report - this will trigger notifications
                    const updated = [...prev]
                    const oldReport = updated[existingIndex]
                    updated[existingIndex] = converted
                    console.log('🔄 My report updated via real-time:', {
                      id: converted.id.substring(0, 8) + '...',
                      title: converted.title,
                      oldStatus: oldReport.status,
                      newStatus: converted.status,
                      oldAssigned: oldReport.assignedTo,
                      newAssigned: converted.assignedTo,
                      dbStatus: report.status,
                      dbAssigned: report.assigned_to
                    })
                    
                    // This state update will trigger the notification hook
                    // The notification hook compares previousReportsRef with the new state
                    return updated
                  } else {
                    // Report not in list, add it
                    return [converted, ...prev]
                  }
                })
              }
            }
          } else if (payload.eventType === 'DELETE') {
            // Report deleted - remove if it was in our list
            const deletedId = oldReport?.id || (payload.old as any)?.id
            if (deletedId && mounted) {
              setMyReports((prev) => prev.filter((r) => r.id !== deletedId))
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 My reports subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to my reports changes (real-time enabled)')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ My reports subscription error. Check Supabase Realtime is enabled.')
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ My reports subscription timed out. Check network connection.')
        }
      })

    return () => {
      mounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      supabase.removeChannel(channel)
    }
  }, [deviceId, userId])

  return { myReports, isLoading, setMyReports }
}




