"use client"

import { AdminView } from "@/components/admin-view"
import { AdminAuthGuard } from "@/components/admin-auth-guard"
import { ErrorBoundary } from "@/components/error-boundary"
import { type ReportStatus } from "@/lib/types"
import { updateReportStatus as updateReportStatusInDB, assignTeamToReport, deleteReport } from "@/src/services/reportService"
import { trackStatusUpdate } from "@/lib/analytics"
import { useToast } from "@/hooks/use-toast"
import { useReportsSubscription } from "@/hooks/use-reports-subscription"

function AdminPageContent() {
  const { reports, setReports, isLoading } = useReportsSubscription()
  const { toast } = useToast()

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
      // Update in database - this is the critical part that must succeed
      console.log(`🔄 Updating report ${reportId} status: ${originalReport.status} → ${newStatus} (DB: ${dbStatus})`)
      const success = await updateReportStatusInDB(reportId, dbStatus as 'Pending' | 'In Progress' | 'Resolved')
      
      if (!success) {
        throw new Error('Failed to update report status in database')
      }
      
      console.log(`✅ Report status updated successfully in database. Real-time subscription will update UI.`)
      
      // Track analytics
      trackStatusUpdate(reportId, originalReport.status, newStatus)
      
      // The real-time subscription should automatically update the UI
      // But we'll also manually refresh to ensure consistency
      toast({
        title: "Success",
        description: `Report status updated to ${newStatus}. Changes are saved.`,
        duration: 3000,
      })
    } catch (error) {
      // Revert on error
      setReports((prev) => prev.map((report) => 
        report.id === reportId ? originalReport : report
      ))
      
      console.error('Status update error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update report status. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    }
  }

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

    // Optimistically update UI
    setReports((prev) => prev.map((report) => 
      report.id === reportId 
        ? { ...report, assignedTo: teamName } 
        : report
    ))

    try {
      console.log(`🔄 Assigning team "${teamName}" to report ${reportId}`)
      const success = await assignTeamToReport(reportId, teamName)
      
      if (!success) {
        throw new Error('Failed to assign team. The assigned_to column may not exist in the database.')
      }
      
      console.log(`✅ Team assigned successfully. Real-time subscription will update UI.`)
      
      // If status is pending, also update to in-progress
      if (originalReport.status === 'pending') {
        console.log(`🔄 Auto-updating status to in-progress (team assigned to pending report)`)
        await handleStatusChange(reportId, 'in-progress')
      }
      
      toast({
        title: "Success",
        description: `Report assigned to ${teamName}. Status updated to In Progress.`,
        duration: 3000,
      })
    } catch (error) {
      // Revert on error
      setReports((prev) => prev.map((report) => 
        report.id === reportId ? originalReport : report
      ))
      
      console.error('Team assignment error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign team. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminView 
        reports={reports} 
        onStatusChange={handleStatusChange}
        onTeamAssigned={handleTeamAssigned}
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
