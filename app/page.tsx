"use client"

import { useState } from "react"
import { CitizenView } from "@/components/citizen-view"
import { ReportModal } from "@/components/report-modal"
import { SuccessModal } from "@/components/success-modal"
import { ErrorBoundary } from "@/components/error-boundary"
import { type ReportCategory } from "@/lib/types"
import { useReportsSubscription } from "@/hooks/use-reports-subscription"

export default function CitizenPage() {
  const { reports, isLoading: isLoadingReports } = useReportsSubscription()
  const [isReporting, setIsReporting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<{
    category: ReportCategory
    severity: "low" | "medium" | "high"
    description: string
  } | null>(null)

  const handleReportSubmit = () => {
    setIsReporting(true)
  }

  const handleAnalysisComplete = (result: {
    category: ReportCategory
    severity: "low" | "medium" | "high"
    description: string
  }) => {
    setAnalysisResult(result)
    setIsReporting(false)
    setShowSuccess(true)
    // Report will be added automatically via real-time subscription
    // No need to manually add to state
  }

  const handleReportAdded = () => {
    // Report will be added automatically via real-time subscription
    // This callback is kept for compatibility but doesn't need to do anything
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-background">
        <CitizenView reports={reports} onReportClick={handleReportSubmit} onReportAdded={handleReportAdded} isLoading={isLoadingReports} />
      <ReportModal isOpen={isReporting} onClose={() => setIsReporting(false)} onComplete={handleAnalysisComplete} />
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} result={analysisResult} />
    </div>
    </ErrorBoundary>
  )
}
