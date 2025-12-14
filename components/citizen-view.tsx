"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Image from "next/image"
import {
  AlertTriangle,
  Camera,
  Shield,
  Clock,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Users,
  Search,
  Filter,
  Phone,
  X,
  MapPin,
  Bell,
  FileText,
  Home,
  AlertCircle,
  Flame,
  Building,
  Ambulance,
  RefreshCw,
} from "lucide-react"
import { ReportCard } from "@/components/report-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { TimeAgo } from "@/components/time-ago"
import { useToast } from "@/hooks/use-toast"
import { useDebounce } from "@/hooks/use-debounce"
import { usePagination } from "@/hooks/use-pagination"
import { ReportListSkeleton } from "@/components/loading-skeleton"
import { Pagination } from "@/components/ui/pagination"
import { trackReportSubmission, trackSearch, trackFilter } from "@/lib/analytics"
import { cn } from "@/lib/utils"
import type { Report, ReportCategory, ReportStatus } from "@/lib/types"
import { emergencyContacts } from "@/lib/types"
import { submitReport, fetchReportsByDeviceOrUser, convertReportFromDB } from "@/src/services/reportService"
import { getCurrentUser } from "@/src/services/authService"
import { supabase } from "@/src/lib/supabase"
import { getDeviceId } from "@/src/lib/deviceId"
import { useMyReportsSubscription } from "@/hooks/use-my-reports-subscription"
import { useNotifications } from "@/hooks/use-notifications"
import { NotificationDropdown } from "@/components/notification-dropdown"

interface CitizenViewProps {
  reports: Report[]
  onReportClick: () => void
  onReportAdded?: (report: Report) => void
  isLoading?: boolean
}

type CitizenTab = "home" | "my-reports" | "emergency"

function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const end = value
    const incrementTime = duration / end

    const timer = setInterval(() => {
      start += 1
      setCount(start)
      if (start >= end) clearInterval(timer)
    }, incrementTime)

    return () => clearInterval(timer)
  }, [value, duration])

  return <span className="tabular-nums">{count}</span>
}

function ReportDetailModal({
  report,
  onClose,
}: {
  report: Report | null
  onClose: () => void
}) {
  if (!report) return null

  const statusSteps = [
    { status: "pending", label: "Submitted", icon: FileText },
    { status: "in-progress", label: "In Progress", icon: Clock },
    { status: "resolved", label: "Resolved", icon: CheckCircle2 },
  ]

  const currentStepIndex = statusSteps.findIndex((s) => s.status === report.status)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card z-10 flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-card-foreground">Report Details</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 space-y-6">
          {report.imageUrl && (
            <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
              <Image
                src={report.imageUrl || "/placeholder.svg"}
                alt={report.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                unoptimized={report.imageUrl.startsWith('http') && !report.imageUrl.includes('supabase')}
              />
              <Badge className="absolute top-3 left-3 bg-black/60 text-white border-0 z-10">{report.category}</Badge>
            </div>
          )}

          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-xl font-semibold text-card-foreground">{report.title}</h3>
              <Badge
                variant={
                  report.severity === "high" ? "destructive" : report.severity === "medium" ? "secondary" : "outline"
                }
              >
                {report.severity} priority
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2">
              <MapPin className="h-4 w-4" />
              {report.location}
            </div>
          </div>

          <p className="text-muted-foreground">{report.description}</p>

          {/* Status Timeline */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-card-foreground">Status Timeline</h4>
            <div className="relative flex items-center justify-between">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted -translate-y-1/2 rounded-full" />
              <div
                className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-500"
                style={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
              />
              {statusSteps.map((step, index) => {
                const isComplete = index <= currentStepIndex
                const isCurrent = index === currentStepIndex
                return (
                  <div key={step.status} className="relative flex flex-col items-center z-10">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                        isComplete
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-card border-border text-muted-foreground",
                        isCurrent && "ring-4 ring-primary/20",
                      )}
                    >
                      <step.icon className="h-5 w-5" />
                    </div>
                    <span
                      className={cn(
                        "text-xs mt-2 font-medium",
                        isComplete ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Activity Log */}
          {report.activityLog && report.activityLog.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-card-foreground">Activity Log</h4>
              <div className="space-y-2">
                {report.activityLog.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground">{entry.action}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{entry.user}</span>
                        <span>•</span>
                        <TimeAgo date={entry.timestamp} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.assignedTo && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-info/10 border border-info/20">
              <Users className="h-5 w-5 text-info" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Assigned to</p>
                <p className="text-xs text-muted-foreground">{report.assignedTo}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function CitizenView({ reports, onReportClick, onReportAdded, isLoading = false }: CitizenViewProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<CitizenTab>("home")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | "all">("all")
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | "all">("all")
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const { toast } = useToast()
  
  // Use real-time subscription for "My Reports"
  const { myReports, isLoading: isLoadingMyReports, setMyReports } = useMyReportsSubscription(deviceId, currentUserId)
  
  // Notification system for status changes
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    getNotificationMessage,
  } = useNotifications(myReports)

  // Show toast notifications when new notifications arrive
  const previousNotificationCountRef = useRef(0)
  useEffect(() => {
    // Only show toast if we have new notifications (count increased)
    if (notifications.length > previousNotificationCountRef.current) {
      const newNotifications = notifications.slice(0, notifications.length - previousNotificationCountRef.current)
      // Show toast for the most recent new notification
      if (newNotifications.length > 0) {
        const latestNotification = newNotifications[0]
        const message = getNotificationMessage(latestNotification)
        toast({
          title: latestNotification.status === 'resolved' ? 'Report Resolved! 🎉' : 'Status Updated',
          description: message,
          duration: 5000,
        })
      }
    }
    previousNotificationCountRef.current = notifications.length
  }, [notifications.length, getNotificationMessage, toast])
  
  // Track when component has mounted (client-side only)
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Initialize device ID and user ID
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    // Get device ID for anonymous tracking immediately
    const device = getDeviceId()
    setDeviceId(device)
    console.log('Device ID initialized:', device ? device.substring(0, 20) + '...' : 'null')

    // Get authenticated user ID
    const getUser = async () => {
      try {
        const user = await getCurrentUser()
        setCurrentUserId(user?.id || null)
        console.log('User ID initialized:', user?.id || 'null')
      } catch (error) {
        console.warn('Error getting user:', error)
        setCurrentUserId(null)
      }
    }
    getUser()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      const newUserId = session?.user?.id || null
      setCurrentUserId(newUserId)
      console.log('Auth state changed, user ID:', newUserId || 'null')
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])
  
  // Debounce search query for performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  const resolvedCount = useMemo(() => reports.filter((r) => r.status === "resolved").length, [reports])

  // Filter "My Reports" for search and status
  const filteredMyReports = useMemo(() => {
    return myReports.filter((report) => {
      const matchesSearch =
        report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = selectedStatus === "all" || report.status === selectedStatus
      return matchesSearch && matchesStatus
    })
  }, [myReports, searchQuery, selectedStatus])

  const filteredReports = useMemo(() => {
    const filtered = reports.filter((report) => {
      const matchesSearch =
        report.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        report.location.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "all" || report.category === selectedCategory
      const matchesStatus = selectedStatus === "all" || report.status === selectedStatus
      return matchesSearch && matchesCategory && matchesStatus
    })

    // Track search and filter usage
    if (debouncedSearchQuery) {
      trackSearch(debouncedSearchQuery, filtered.length)
    }
    if (selectedCategory !== "all") {
      trackFilter('category', selectedCategory)
    }
    if (selectedStatus !== "all") {
      trackFilter('status', selectedStatus)
    }

    return filtered
  }, [reports, debouncedSearchQuery, selectedCategory, selectedStatus])

  // Pagination for reports list
  const { paginatedItems: paginatedReports, currentPage, totalPages, goToPage, totalItems } = usePagination(
    filteredReports,
    6
  )

  useEffect(() => {
    setIsVisible(true)
  }, [])

  // Map category from AI response to ReportCategory type
  const mapCategoryToReportCategory = (category: string): ReportCategory => {
    const lowerCategory = category.toLowerCase()
    if (lowerCategory.includes('sanitation') || lowerCategory.includes('trash') || lowerCategory.includes('garbage')) {
      return 'sanitation'
    }
    if (lowerCategory.includes('road') || lowerCategory.includes('pothole') || lowerCategory.includes('street')) {
      return 'roads'
    }
    if (lowerCategory.includes('water') || lowerCategory.includes('drain') || lowerCategory.includes('flood')) {
      return 'water'
    }
    if (lowerCategory.includes('electrical') || lowerCategory.includes('light') || lowerCategory.includes('power')) {
      return 'electrical'
    }
    return 'other'
  }

  // Map severity from AI response to Report severity type
  const mapSeverityToReportSeverity = (severity: 'High' | 'Medium' | 'Low'): 'high' | 'medium' | 'low' => {
    return severity.toLowerCase() as 'high' | 'medium' | 'low'
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsAnalyzing(true)

    try {
      // Get geolocation with error handling
      let location: { lat: number; lng: number }
      
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'))
            return
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
        })
        location = { lat: position.coords.latitude, lng: position.coords.longitude }
      } catch (geoError) {
        // Default to Freetown coordinates if geolocation fails
        console.warn('Geolocation failed, using default location:', geoError)
        location = { lat: 8.4606, lng: -13.2562 } // Freetown, Sierra Leone
      }

      // Submit report with current user ID and device ID (for anonymous tracking)
      const result = await submitReport(file, location, currentUserId, deviceId)

      // Convert result to Report type
      const newReport: Report = {
        id: result.id,
        title: `${result.category.charAt(0).toUpperCase() + result.category.slice(1)} Issue`,
        location: `${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`,
        category: mapCategoryToReportCategory(result.category),
        status: result.status === 'Pending' ? 'pending' : result.status === 'In Progress' ? 'in-progress' : 'resolved',
        severity: mapSeverityToReportSeverity(result.severity),
        description: result.description,
        timestamp: new Date(result.created_at),
        imageUrl: result.image_url,
        reportedBy: currentUserId || undefined, // Include user ID in report
      }

      // Track analytics
      trackReportSubmission(result.category, result.severity)

      // Show success alert
      toast({
        title: 'Report Submitted Successfully!',
        description: `Category: ${result.category} | ${result.description}`,
        variant: 'default',
      })

      // Immediately add the new report to "My Reports" list (optimistic update)
      // Real-time subscription will confirm and update if needed
      setMyReports((prev) => {
        // Check if already exists (avoid duplicates)
        if (prev.some(r => r.id === newReport.id)) {
          return prev
        }
        return [newReport, ...prev]
      })

      // Switch to "My Reports" tab to show the new report
      if (activeTab !== "my-reports") {
        setActiveTab("my-reports")
      }

      // Add report to local feed
      if (onReportAdded) {
        onReportAdded(newReport)
      }
    } catch (error) {
      console.error('Error submitting report:', error)
      toast({
        title: 'Error Submitting Report',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsAnalyzing(false)
      // Reset file input
      if (fileInputRef) {
        fileInputRef.value = ''
      }
    }
  }

  const categories: { value: ReportCategory | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "sanitation", label: "Sanitation" },
    { value: "roads", label: "Roads" },
    { value: "water", label: "Water" },
    { value: "electrical", label: "Electrical" },
    { value: "other", label: "Other" },
  ]

  const statuses: { value: ReportStatus | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "in-progress", label: "In Progress" },
    { value: "resolved", label: "Resolved" },
  ]

  const emergencyIcons: Record<string, typeof Shield> = {
    shield: Shield,
    flame: Flame,
    ambulance: Ambulance,
    building: Building,
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 transition-all duration-300">
        <div className="container flex h-16 items-center justify-between px-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-amber-600 shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:scale-105">
              <Shield className="h-5 w-5 text-primary-foreground" />
              <div className="absolute inset-0 rounded-xl bg-primary/20 blur-md -z-10" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-foreground">SaloneFix</span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
                Citizen Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationDropdown
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onClearAll={clearAll}
              getNotificationMessage={getNotificationMessage}
              onNotificationClick={(reportId) => {
                // Find and show the report
                const report = myReports.find((r) => r.id === reportId)
                if (report) {
                  setSelectedReport(report)
                  setActiveTab("my-reports")
                }
              }}
            />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-medium text-success">Online</span>
            </div>
          </div>
        </div>
      </header>

      {activeTab === "home" && (
        <>
          <section className="relative overflow-hidden px-4 py-16 md:py-24">
            <div className="absolute inset-0 bg-gradient-to-b from-accent via-accent/50 to-background" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

            <div
              className="absolute inset-0 opacity-[0.015]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23000000' fillOpacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            <div
              className={`container mx-auto text-center relative max-w-4xl transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary mb-6">
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI-Powered Civic Reporting</span>
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl text-balance leading-[1.1]">
                Don't Shout into the Void.
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-lg md:text-xl text-muted-foreground text-pretty leading-relaxed">
                Snap, Send, Solved. Report civic hazards instantly and watch your community improve.
              </p>

              <div className="relative mt-12 flex justify-center">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="h-36 w-36 rounded-full bg-primary/20 pulse-ring" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="h-36 w-36 rounded-full bg-primary/15 pulse-ring" style={{ animationDelay: "0.4s" }} />
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="h-36 w-36 rounded-full bg-primary/10 pulse-ring" style={{ animationDelay: "0.8s" }} />
                </div>

                <input
                  ref={setFileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="hazard-file-input"
                  disabled={isAnalyzing}
                />
                <label
                  htmlFor="hazard-file-input"
                  className={cn(
                    "relative z-10 flex h-36 w-36 flex-col items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-amber-600 text-primary-foreground shadow-2xl shadow-primary/40 transition-all duration-300 hover:scale-105 hover:shadow-primary/50 active:scale-95 group cursor-pointer",
                    isAnalyzing && "opacity-75 cursor-wait"
                  )}
                >
                  <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {isAnalyzing ? (
                    <Spinner className="h-10 w-10 text-primary-foreground" />
                  ) : (
                    <>
                      <AlertTriangle className="h-10 w-10 transition-transform duration-300 group-hover:scale-110" />
                      <span className="mt-2 text-sm font-bold tracking-wide">Report Hazard</span>
                    </>
                  )}
                </label>
              </div>

              <div className="flex items-center justify-center gap-8 mt-12 text-sm flex-wrap">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-success/10">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <span>
                    <AnimatedCounter value={resolvedCount} /> Resolved
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-info/10">
                    <TrendingUp className="h-4 w-4 text-info" />
                  </div>
                  <span>
                    <AnimatedCounter value={reports.length} /> Reports
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <span>
                    <AnimatedCounter value={847} /> Citizens
                  </span>
                </div>
              </div>

              <div className="mx-auto mt-16 grid max-w-3xl gap-4 md:grid-cols-3 stagger-children">
                {[
                  { icon: Camera, step: "1", title: "Snap", desc: "Take a photo of the issue" },
                  { icon: Sparkles, step: "2", title: "Send", desc: "AI auto-tags & locates" },
                  { icon: Clock, step: "3", title: "Track", desc: "Monitor until resolved" },
                ].map((item, index) => (
                  <div
                    key={item.step}
                    className="group relative flex flex-col items-center gap-3 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/20 hover:-translate-y-1"
                  >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-lg">
                      {item.step}
                    </div>

                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/50 border border-primary/10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/10">
                      <item.icon className="h-7 w-7 text-accent-foreground transition-colors duration-300" />
                    </div>
                    <h3 className="font-semibold text-card-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground text-center">{item.desc}</p>

                    {index < 2 && <div className="hidden md:block absolute top-1/2 -right-2 w-4 h-px bg-border" />}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="flex-1 px-4 py-10 bg-muted/30">
            <div className="container mx-auto max-w-3xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Recent Reports</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Latest submissions from your community</p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search reports..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-background"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(showFilters && "bg-primary/10 border-primary/30")}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {showFilters && (
                <div className="mb-6 p-4 rounded-xl bg-card border border-border animate-fade-up space-y-4">
                  <div>
                    <p className="text-sm font-medium text-card-foreground mb-2">Category</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <Button
                          key={cat.value}
                          variant={selectedCategory === cat.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedCategory(cat.value)}
                          className="text-xs"
                        >
                          {cat.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-card-foreground mb-2">Status</p>
                    <div className="flex flex-wrap gap-2">
                      {statuses.map((stat) => (
                        <Button
                          key={stat.value}
                          variant={selectedStatus === stat.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedStatus(stat.value)}
                          className="text-xs"
                        >
                          {stat.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 stagger-children">
                {isLoading ? (
                  <ReportListSkeleton count={5} />
                ) : filteredReports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-foreground">No reports found</p>
                    <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <>
                    {paginatedReports.map((report, index) => (
                      <div key={report.id} onClick={() => setSelectedReport(report)}>
                        <ReportCard report={report} index={index} />
                      </div>
                    ))}
                    {totalPages > 1 && (
                      <div className="pt-4">
                        <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          onPageChange={goToPage}
                          pageSize={6}
                          totalItems={totalItems}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {activeTab === "my-reports" && (
        <section className="flex-1 px-4 py-6 bg-muted/30">
          <div className="container mx-auto max-w-3xl">
            {/* Header with Report Button */}
            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">My Reports</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {isMounted && deviceId 
                    ? "Track all your submitted reports (tracked anonymously)" 
                    : "Track the status of your submitted reports"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    // Manual refresh with loading state
                    try {
                      const dbReports = await fetchReportsByDeviceOrUser(deviceId, currentUserId)
                      const convertedReports = dbReports.map(convertReportFromDB)
                      setMyReports(convertedReports)
                      toast({
                        title: "Refreshed",
                        description: `Loaded ${convertedReports.length} report${convertedReports.length !== 1 ? 's' : ''}`,
                        duration: 2000,
                      })
                    } catch (error) {
                      console.error('Refresh error:', error)
                      toast({
                        title: "Refresh Failed",
                        description: error instanceof Error ? error.message : "Failed to refresh reports. Please try again.",
                        variant: "destructive",
                        duration: 3000,
                      })
                    }
                  }}
                  disabled={isLoadingMyReports}
                  className={cn(
                    "text-xs transition-all duration-200",
                    isLoadingMyReports && "opacity-75 cursor-wait"
                  )}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5 transition-transform", isLoadingMyReports && "animate-spin")} />
                  {isLoadingMyReports ? "Refreshing..." : "Refresh"}
                </Button>
              <input
                ref={setFileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
                id="my-reports-file-input"
                disabled={isAnalyzing}
              />
              <label
                htmlFor="my-reports-file-input"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-primary via-primary to-amber-600 text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-300 hover:scale-105 hover:shadow-primary/40 active:scale-95 cursor-pointer font-medium",
                  isAnalyzing && "opacity-75 cursor-wait"
                )}
              >
                {isAnalyzing ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    <span>Report Hazard</span>
                  </>
                )}
              </label>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <Card className="bg-card hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-card-foreground">
                    {isMounted ? myReports.length : 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Reports</p>
                </CardContent>
              </Card>
              <Card className="bg-info/10 border-info/20 hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-info">
                    {isMounted ? myReports.filter((r) => r.status === "in-progress").length : 0}
                  </p>
                  <p className="text-xs text-info/70">In Progress</p>
                </CardContent>
              </Card>
              <Card className="bg-success/10 border-success/20 hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-success">
                    {isMounted ? myReports.filter((r) => r.status === "resolved").length : 0}
                  </p>
                  <p className="text-xs text-success/70">Resolved</p>
                </CardContent>
              </Card>
            </div>

            {/* Anonymous Tracking Info */}
            {isMounted && deviceId && (
              <Card className="mb-6 bg-primary/5 border-primary/20">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">Anonymous Tracking Active</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Your reports are tracked via device ID: {deviceId.substring(0, 20)}...
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Search and Filter for My Reports */}
            {isMounted && myReports.length > 0 && (
              <div className="mb-6 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search your reports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant={selectedStatus === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStatus("all")}
                    className="text-xs"
                  >
                    All ({myReports.length})
                  </Button>
                  <Button
                    variant={selectedStatus === "pending" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStatus("pending")}
                    className="text-xs"
                  >
                    Pending ({myReports.filter((r) => r.status === "pending").length})
                  </Button>
                  <Button
                    variant={selectedStatus === "in-progress" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStatus("in-progress")}
                    className="text-xs"
                  >
                    In Progress ({myReports.filter((r) => r.status === "in-progress").length})
                  </Button>
                  <Button
                    variant={selectedStatus === "resolved" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStatus("resolved")}
                    className="text-xs"
                  >
                    Resolved ({myReports.filter((r) => r.status === "resolved").length})
                  </Button>
                </div>
              </div>
            )}

            {/* Reports List */}
            <div className="space-y-3">
              {isLoadingMyReports ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Spinner className="h-8 w-8 mb-3" />
                  <p className="text-sm text-muted-foreground">Loading your reports...</p>
                </div>
              ) : myReports.length === 0 ? (
                <Card className="bg-card">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="relative mb-4">
                      <FileText className="h-16 w-16 text-muted-foreground/30" />
                      <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                        <AlertTriangle className="h-3 w-3 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Reports Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                      Start making a difference in your community by reporting hazards you encounter.
                    </p>
                    <input
                      ref={setFileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="empty-state-file-input"
                      disabled={isAnalyzing}
                    />
                    <label
                      htmlFor="empty-state-file-input"
                      className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-primary via-primary to-amber-600 text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-300 hover:scale-105 hover:shadow-primary/40 active:scale-95 cursor-pointer font-medium",
                        isAnalyzing && "opacity-75 cursor-wait"
                      )}
                    >
                      {isAnalyzing ? (
                        <>
                          <Spinner className="h-4 w-4" />
                          <span>Analyzing Image...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="h-5 w-5" />
                          <span>Report Your First Hazard</span>
                        </>
                      )}
                    </label>
                    <p className="text-xs text-muted-foreground mt-3">
                      Take a photo and let AI analyze it automatically
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      {filteredMyReports.length} {filteredMyReports.length === 1 ? 'report' : 'reports'} {searchQuery || selectedStatus !== "all" ? 'found' : 'submitted'}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {isMounted && deviceId ? 'Anonymous' : 'Tracked'}
                    </Badge>
                  </div>
                  {filteredMyReports.length === 0 ? (
                    <Card className="bg-card">
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
                        <p className="text-sm font-medium text-foreground">No reports found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Try adjusting your search or filter criteria
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredMyReports.map((report, index) => (
                      <div key={report.id} onClick={() => setSelectedReport(report)}>
                        <ReportCard report={report} index={index} />
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === "emergency" && (
        <section className="flex-1 px-4 py-6 bg-muted/30">
          <div className="container mx-auto max-w-3xl">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">Emergency Contacts</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Important numbers for emergencies</p>
            </div>

            <Card className="mb-6 bg-destructive/10 border-destructive/20">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-destructive">In case of life-threatening emergency</p>
                  <p className="text-sm text-destructive/80">Call emergency services immediately at 999</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {emergencyContacts.map((contact, index) => {
                const IconComponent = emergencyIcons[contact.icon] || Phone
                return (
                  <Card key={index} className="group hover:shadow-md transition-all duration-200">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                          <IconComponent className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-card-foreground">{contact.name}</p>
                          <p className="text-sm text-muted-foreground">{contact.number}</p>
                        </div>
                      </div>
                      <a
                        href={`tel:${contact.number.replace(/\s/g, "")}`}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-success text-success-foreground hover:bg-success/90 transition-colors"
                      >
                        <Phone className="h-5 w-5" />
                      </a>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Reporting Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "Take clear photos of the hazard from multiple angles",
                  "Include nearby landmarks to help locate the issue",
                  "Describe the hazard and any immediate dangers",
                  "Note the time you first noticed the issue",
                ].map((tip, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-sm text-muted-foreground">{tip}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      <nav className="sticky bottom-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border md:hidden" suppressHydrationWarning>
        <div className="container max-w-5xl mx-auto flex items-center justify-around h-16">
          {[
            { tab: "home" as const, icon: Home, label: "Home" },
            { tab: "my-reports" as const, icon: FileText, label: "My Reports" },
            { tab: "emergency" as const, icon: Phone, label: "Emergency" },
          ].map((item) => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200",
                activeTab === item.tab ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {isMounted && item.tab === "my-reports" && myReports.filter((r) => r.status === "in-progress").length > 0 && (
                <span className="absolute -top-0.5 right-1/4 h-2 w-2 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="hidden md:block fixed bottom-6 left-1/2 -translate-x-1/2 z-50" suppressHydrationWarning>
        <div className="flex items-center gap-1 p-1.5 rounded-full bg-background/95 backdrop-blur-xl border border-border shadow-lg">
          {[
            { tab: "home" as const, icon: Home, label: "Home" },
            { tab: "my-reports" as const, icon: FileText, label: "My Reports" },
            { tab: "emergency" as const, icon: Phone, label: "Emergency" },
          ].map((item) => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200",
                activeTab === item.tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer - Only on Home */}
      {activeTab === "home" && (
        <footer className="border-t border-border bg-background py-6 px-4 pb-20 md:pb-20">
          <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span>SaloneFix - Civic Tech for Sierra Leone</span>
            </div>
            <span>Making communities safer, one report at a time.</span>
          </div>
        </footer>
      )}

      {/* Report Detail Modal */}
      {selectedReport && <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />}
    </div>
  )
}
