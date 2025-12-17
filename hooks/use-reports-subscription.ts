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

    // Initial fetch - load fresh data from database
    // Use a timestamp to prevent caching
    const loadReports = async () => {
      try {
        setIsLoading(true)
        console.log('🔄 Loading initial reports from database (fresh fetch)...')
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
          
          // Log a sample report to verify data
          if (convertedReports.length > 0) {
            const sample = convertedReports[0]
            console.log('📋 Sample report:', {
              id: sample.id.substring(0, 8) + '...',
              status: sample.status,
              assignedTo: sample.assignedTo,
              title: sample.title
            })
          }
          
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

    // Load immediately
    loadReports()
    
    // Also reload after a short delay to catch any updates that happened during page load
    const reloadTimeout = setTimeout(() => {
      if (mounted) {
        console.log('🔄 Reloading reports after initial load (catch any missed updates)...')
        loadReports()
      }
    }, 2000)
    
    return () => {
      clearTimeout(reloadTimeout)
    }

    // Set up real-time subscription
    // Note: This is optional - if Realtime is not enabled, the app will still work
    let channel: ReturnType<typeof supabase.channel> | null = null
    
    try {
      channel = supabase
        .channel('reports-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'reports',
          },
          async (payload) => {
            if (!mounted) return
            
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
          if (!mounted) return
          
          console.log('📡 Reports subscription status:', status)
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to reports changes (real-time enabled)')
          } else if (status === 'CHANNEL_ERROR') {
            // Realtime is not enabled or there's a configuration issue
            // This is not a critical error - the app will still work without real-time updates
            console.warn(
              '⚠️ Real-time subscription unavailable. ' +
              'The app will continue to work, but updates may require a page refresh. ' +
              'To enable real-time updates, enable Realtime in Supabase Dashboard → Database → Replication for the "reports" table.'
            )
          } else if (status === 'TIMED_OUT') {
            console.warn('⚠️ Real-time subscription timed out. Check network connection.')
          }
        })
    } catch (error) {
      // If subscription setup fails, log but don't break the app
      console.warn('⚠️ Failed to set up real-time subscription:', error)
      console.warn('The app will continue to work, but updates may require a page refresh.')
    }

    return () => {
      mounted = false
      if (channel) {
        try {
          supabase.removeChannel(channel)
        } catch (error) {
          // Ignore cleanup errors
          console.warn('Failed to remove channel:', error)
        }
      }
    }
  }, [])

  return { reports, isLoading, error, setReports }
}

