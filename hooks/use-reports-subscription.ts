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

    // Initial fetch
    const loadReports = async () => {
      try {
        setIsLoading(true)
        const dbReports = await fetchAllReports()
        if (mounted) {
          const convertedReports = dbReports.map(convertReportFromDB)
          setReports(convertedReports)
          setError(null)
        }
      } catch (err) {
        console.error('Failed to load reports:', err)
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
            // Report updated
            const updatedReport = payload.new as ReportFromDB
            const converted = convertReportFromDB(updatedReport)
            if (mounted) {
              setReports((prev) =>
                prev.map((report) => (report.id === converted.id ? converted : report))
              )
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
        console.log('Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to reports changes')
        }
      })

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  return { reports, isLoading, error, setReports }
}

