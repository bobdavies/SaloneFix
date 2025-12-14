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
  const { reports, setReports } = useReportsSubscription()
  const { toast } = useToast()

  const handleStatusChange = async (reportId: string, newStatus: ReportStatus) => {
    // Map ReportStatus to database status format
    const dbStatus = newStatus === 'in-progress' ? 'In Progress' : 
                     newStatus === 'resolved' ? 'Resolved' : 
                     'Pending'

    // Store original status for potential revert
    const originalReport = reports.find(r => r.id === reportId)
    
    // Optimistically update UI
    setReports((prev) => prev.map((report) => (report.id === reportId ? { ...report, status: newStatus } : report)))

    try {
      // Update in database
      await updateReportStatusInDB(reportId, dbStatus as 'Pending' | 'In Progress' | 'Resolved')
      
      // Track analytics
      trackStatusUpdate(reportId, originalReport?.status || 'unknown', newStatus)
      
      toast({
        title: "Success",
        description: `Report status updated to ${newStatus}`,
      })
    } catch (error) {
      // Revert on error
      if (originalReport) {
        setReports((prev) => prev.map((report) => 
          report.id === reportId ? originalReport : report
        ))
      }
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update report status",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminView reports={reports} onStatusChange={handleStatusChange} />
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
