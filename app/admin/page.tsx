"use client"

import { AdminView } from "@/components/admin-view"
import { AdminAuthGuard } from "@/components/admin-auth-guard"
import { ErrorBoundary } from "@/components/error-boundary"
import { type ReportStatus } from "@/lib/types"
import { updateReportStatus as updateReportStatusInDB, assignTeamToReport, deleteReport, fetchAllReports, convertReportFromDB } from "@/src/services/reportService"
import { trackStatusUpdate } from "@/lib/analytics"
import { useToast } from "@/hooks/use-toast"
import { useReportsSubscription } from "@/hooks/use-reports-subscription"
import { useState, useCallback } from "react"
// Import test functions for debugging
import "@/src/services/testDatabase"

function AdminPageContent() {
  const { reports, setReports, isLoading } = useReportsSubscription()
  const { toast } = useToast()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleStatusChange = async (reportId: string, newStatus: ReportStatus) => {
    // Map ReportStatus to database status format
    const dbStatus = newStatus === 'in-progress' ? 'In Progress' : 
                     newStatus === 'resolved' ? 'Resolved' : 
                     'Pending'

    // Store original status for potential revert
    const originalReport = reports.find(r => r.id === reportId)
    
    if (!originalReport) {
      toast({
        title: "Error",
        description: "Report not found",
        variant: "destructive",
      })
      return
    }

    // Optimistically update UI
    setReports((prev) => prev.map((report) => 
      report.id === reportId 
        ? { ...report, status: newStatus } 
        : report
    ))

    try {
      // Update in database
      console.log(`[handleStatusChange] Updating report ${reportId.substring(0, 8)}... status: ${originalReport.status} → ${newStatus} (DB: ${dbStatus})`)
      const success = await updateReportStatusInDB(
        reportId, 
        dbStatus as 'Pending' | 'In Progress' | 'Resolved',
        'Admin',
        originalReport.status === 'pending' ? 'Pending' : 
        originalReport.status === 'in-progress' ? 'In Progress' : 'Resolved'
      )
      
      if (!success) {
        throw new Error('Failed to update report status in database')
      }
      
      console.log(`[handleStatusChange] ✅ Status updated successfully`)
      
      // Track analytics
      trackStatusUpdate(reportId, originalReport.status, newStatus)
      
      // Show success toast
      toast({
        title: "Success",
        description: `Report status updated to ${newStatus}.`,
        duration: 3000,
      })
      
      // Real-time subscription will automatically update the UI
    } catch (error) {
      // Revert on error
      setReports((prev) => prev.map((report) => 
        report.id === reportId ? originalReport : report
      ))
      
      console.error('[handleStatusChange] Error:', error)
      const errorMessage = error instanceof Error ? error.message : "Failed to update report status"
      
      // Check for RLS policy errors
      if (errorMessage.includes('policy') || errorMessage.includes('permission') || errorMessage.includes('denied')) {
        toast({
          title: "Permission Error",
          description: "Database permissions issue. Please check RLS policies. See DOC/RLS_POLICIES_SETUP.sql",
          variant: "destructive",
          duration: 8000,
        })
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        })
      }
    }
  }

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const dbReports = await fetchAllReports()
      const convertedReports = dbReports.map(convertReportFromDB)
      setReports(convertedReports)
      toast({
        title: "Refreshed",
        description: `Loaded ${convertedReports.length} reports`,
        duration: 2000,
      })
    } catch (error) {
      console.error('Failed to refresh reports:', error)
      toast({
        title: "Error",
        description: "Failed to refresh reports. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [setReports, toast])

  const handleTeamAssigned = async (reportId: string, teamName: string) => {
    const originalReport = reports.find(r => r.id === reportId)
    
    if (!originalReport) {
      toast({
        title: "Error",
        description: "Report not found",
        variant: "destructive",
      })
      return
    }

    const isUnassign = teamName.trim() === ""
    const displayTeamName = isUnassign ? null : teamName

    // Optimistically update UI
    setReports((prev) => prev.map((report) => 
      report.id === reportId 
        ? { ...report, assignedTo: displayTeamName } 
        : report
    ))

    try {
      if (isUnassign) {
        console.log(`[handleTeamAssigned] Unassigning team from report ${reportId.substring(0, 8)}...`)
      } else {
        console.log(`[handleTeamAssigned] Assigning team "${teamName}" to report ${reportId.substring(0, 8)}...`)
      }
      
      const success = await assignTeamToReport(reportId, teamName, 'Admin')
      
      if (!success) {
        // Check if it's a column issue
        toast({
          title: "Column Missing",
          description: "The assigned_to column does not exist. Please run the database migration (DOC/admin_features_migration.sql)",
          variant: "destructive",
          duration: 8000,
        })
        // Revert UI
        setReports((prev) => prev.map((report) => 
          report.id === reportId ? originalReport : report
        ))
        return
      }
      
      console.log(`[handleTeamAssigned] ✅ Team ${isUnassign ? 'unassigned' : 'assigned'} successfully`)
      
      // If assigning and status is pending, also update to in-progress
      if (!isUnassign && originalReport.status === 'pending') {
        console.log(`[handleTeamAssigned] Auto-updating status to in-progress`)
        // Don't await - let it happen in background
        handleStatusChange(reportId, 'in-progress').catch(err => {
          console.warn('[handleTeamAssigned] Status update failed:', err)
        })
      }
      
      toast({
        title: "Success",
        description: isUnassign 
          ? "Team unassigned from report"
          : `Report assigned to ${teamName}.${originalReport.status === 'pending' ? ' Status updated to In Progress.' : ''}`,
        duration: 3000,
      })
    } catch (error) {
      // Revert on error
      setReports((prev) => prev.map((report) => 
        report.id === reportId ? originalReport : report
      ))
      
      console.error('[handleTeamAssigned] Error:', error)
      const errorMessage = error instanceof Error ? error.message : `Failed to ${isUnassign ? 'unassign' : 'assign'} team`
      
      // Check for RLS policy errors
      if (errorMessage.includes('policy') || errorMessage.includes('permission') || errorMessage.includes('denied')) {
        toast({
          title: "Permission Error",
          description: "Database permissions issue. Please check RLS policies. See DOC/RLS_POLICIES_SETUP.sql",
          variant: "destructive",
          duration: 8000,
        })
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        })
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminView 
        reports={reports} 
        onStatusChange={handleStatusChange}
        onTeamAssigned={handleTeamAssigned}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
    </div>
  )
}

export default function AdminPage() {
  return (
    <ErrorBoundary>
      <AdminAuthGuard>
        <AdminPageContent />
      </AdminAuthGuard>
    </ErrorBoundary>
  )
}
