import { useEffect, useState } from 'react'
import { supabase } from '../src/lib/supabase'
import { fetchAllReports, convertReportFromDB, type ReportFromDB } from '../src/services/reportService'
import type { Report } from '../lib/types'

export function useReportsSubscription() {
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    // Initial fetch - only load once, real-time will handle updates
    const loadReports = async () => {
      try {
        setIsLoading(true)
        console.log('🔄 Loading initial reports from database...')
        const dbReports = await fetchAllReports()
        if (mounted) {
          const convertedReports = dbReports.map(convertReportFromDB)
          console.log(`✅ Loaded ${convertedReports.length} reports from database`)
          // Log status distribution for debugging
          const statusCounts = convertedReports.reduce((acc, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          console.log('📊 Status distribution:', statusCounts)
          setReports(convertedReports)
          setError(null)
        }
      } catch (err) {
        console.error('❌ Failed to load reports:', err)
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load reports'))
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadReports()

    // Set up real-time subscription
    const channel = supabase
      .channel('reports-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'reports',
        },
        async (payload) => {
          console.log('Real-time update received:', payload)

          if (payload.eventType === 'INSERT') {
            // New report added
            const newReport = payload.new as ReportFromDB
            const converted = convertReportFromDB(newReport)
            if (mounted) {
              setReports((prev) => [converted, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            // Report updated - ensure we get the latest data
            const updatedReport = payload.new as ReportFromDB
            const oldReport = payload.old as ReportFromDB | null
            const converted = convertReportFromDB(updatedReport)
            
            if (mounted) {
              setReports((prev) => {
                const existingIndex = prev.findIndex((r) => r.id === converted.id)
                if (existingIndex >= 0) {
                  // Update existing report
                  const updated = [...prev]
                  const previousReport = updated[existingIndex]
                  updated[existingIndex] = converted
                  
                  // Log the change for debugging
                  console.log('🔄 Report updated via real-time:', {
                    id: converted.id.substring(0, 8) + '...',
                    oldStatus: previousReport.status,
                    newStatus: converted.status,
                    oldAssigned: previousReport.assignedTo,
                    newAssigned: converted.assignedTo,
                    dbStatus: updatedReport.status,
                    dbAssigned: updatedReport.assigned_to
                  })
                  
                  return updated
                } else {
                  // Report not in list, add it (shouldn't happen but handle it)
                  console.log('➕ New report added via real-time update:', converted.id)
                  return [converted, ...prev]
                }
              })
            }
          } else if (payload.eventType === 'DELETE') {
            // Report deleted
            const deletedId = payload.old.id
            if (mounted) {
              setReports((prev) => prev.filter((report) => report.id !== deletedId))
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Reports subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to reports changes (real-time enabled)')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error. Check Supabase Realtime is enabled.')
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ Real-time subscription timed out. Check network connection.')
        }
      })

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  return { reports, isLoading, error, setReports }
}

