"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import {
  LayoutDashboard,
  Map,
  FileText,
  Settings,
  Shield,
  Bell,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  MoreHorizontal,
  LogOut,
  Search,
  Download,
  UserPlus,
  X,
  ChevronDown,
  Activity,
  BarChart3,
  MapPin,
  Calendar,
  Eye,
  Trash2,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { TimeAgo } from "@/components/time-ago"
import { cn } from "@/lib/utils"
import type { Report, ReportStatus, ReportCategory, Team } from "@/lib/types"
import { mockTeams } from "@/lib/types"
import dynamic from "next/dynamic"
import type { LatLngExpression } from "leaflet"
import { fetchAllReports, type ReportFromDB, assignTeamToReport, deleteReport, updateReportWithProof, uploadProofImage } from "@/src/services/reportService"
import { useToast } from "@/hooks/use-toast"

// Dynamically import Leaflet components with SSR disabled (they require window object)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
)

// Import leaflet utilities dynamically (only used on client side)
// These will be loaded when needed in the createMarkerIcon function
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { MapSkeleton, TableSkeleton, StatsSkeleton } from "@/components/loading-skeleton"
import { Pagination } from "@/components/ui/pagination"
import { usePagination } from "@/hooks/use-pagination"
import { trackMapInteraction } from "@/lib/analytics"

interface AdminViewProps {
  reports: Report[]
  onStatusChange: (reportId: string, newStatus: ReportStatus) => void
  onTeamAssigned?: (reportId: string, teamName: string) => void
}

type AdminTab = "dashboard" | "reports" | "map" | "teams" | "analytics"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", tab: "dashboard" as const },
  { icon: FileText, label: "Reports", tab: "reports" as const },
  { icon: Map, label: "Map View", tab: "map" as const },
  { icon: Users, label: "Teams", tab: "teams" as const },
  { icon: BarChart3, label: "Analytics", tab: "analytics" as const },
  { icon: Settings, label: "Settings", tab: "dashboard" as const },
]

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const duration = 800
    const steps = 30
    const increment = value / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(current))
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [value])

  return (
    <span className="tabular-nums">
      {prefix}
      {displayValue}
      {suffix}
    </span>
  )
}

function ReportTriageModal({
  report,
  onClose,
  onStatusChange,
  teams,
  onTeamAssigned,
  onReportDeleted,
}: {
  report: Report | null
  onClose: () => void
  onStatusChange: (reportId: string, newStatus: ReportStatus) => void
  teams: Team[]
  onTeamAssigned?: (reportId: string, teamName: string) => void
  onReportDeleted?: () => void
}) {
  const [selectedTeam, setSelectedTeam] = useState<string>(report?.assignedTo || "")
  const [showTeamDropdown, setShowTeamDropdown] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [isUploadingProof, setIsUploadingProof] = useState(false)
  const { toast } = useToast()

  if (!report) return null

  const handleAssign = async () => {
    if (!selectedTeam) return
    
    try {
      // Call the parent handler which will update the database and UI
      if (onTeamAssigned) {
        await onTeamAssigned(report.id, selectedTeam)
      } else {
        // Fallback: direct assignment if handler not provided
        await assignTeamToReport(report.id, selectedTeam)
        toast({
          title: "Success",
          description: `Report assigned to ${selectedTeam}`,
        })
        
        // If status is pending, also update to in-progress
        if (report.status === "pending") {
          onStatusChange(report.id, "in-progress")
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign team",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (report.status !== "resolved") {
      toast({
        title: "Cannot Delete",
        description: "Only resolved reports can be deleted. Please resolve the report first.",
        variant: "destructive",
      })
      return
    }

    setIsDeleting(true)
    try {
      // If proof file is provided, upload it first
      let proofImageUrl: string | undefined
      if (proofFile) {
        setIsUploadingProof(true)
        try {
          proofImageUrl = await uploadProofImage(proofFile)
          if (proofImageUrl) {
            await updateReportWithProof(report.id, proofImageUrl)
          }
        } catch (error) {
          console.error('Error uploading proof:', error)
          // Continue with deletion even if proof upload fails
        } finally {
          setIsUploadingProof(false)
        }
      }

      await deleteReport(report.id, proofImageUrl || undefined)
      toast({
        title: "Success",
        description: "Report deleted successfully",
      })
      
      if (onReportDeleted) {
        onReportDeleted()
      }
      
      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete report",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setIsUploadingProof(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-card rounded-2xl shadow-2xl overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card z-10 flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Badge
              variant={
                report.severity === "high" ? "destructive" : report.severity === "medium" ? "secondary" : "outline"
              }
            >
              {report.severity.toUpperCase()}
            </Badge>
            <h2 className="text-lg font-semibold text-card-foreground">Report #{report.id}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Report Image */}
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
            </div>
          )}

          {/* Report Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-card-foreground">{report.title}</h3>
                <p className="text-muted-foreground mt-2">{report.description}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-card-foreground">{report.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-card-foreground">{formatDate(report.timestamp)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-card-foreground capitalize">{report.category}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-card-foreground">Current Status</label>
                <div className="flex gap-2 mt-2">
                  {(["pending", "in-progress", "resolved"] as ReportStatus[]).map((status) => (
                    <Button
                      key={status}
                      variant={report.status === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => onStatusChange(report.id, status)}
                      className={cn(
                        report.status === status && status === "pending" && "bg-muted-foreground",
                        report.status === status && status === "in-progress" && "bg-info",
                        report.status === status && status === "resolved" && "bg-success",
                      )}
                    >
                      {status === "in-progress" ? "In Progress" : status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-card-foreground">Assign to Team</label>
                <div className="relative mt-2">
                  <Button
                    variant="outline"
                    className="w-full justify-between bg-transparent"
                    onClick={() => setShowTeamDropdown(!showTeamDropdown)}
                  >
                    <span>{selectedTeam || "Select a team..."}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  {showTeamDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {teams.map((team) => (
                        <button
                          key={team.id}
                          className="w-full px-4 py-2 text-left hover:bg-muted transition-colors text-sm"
                          onClick={() => {
                            setSelectedTeam(team.name)
                            setShowTeamDropdown(false)
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-popover-foreground">{team.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {team.activeJobs} active
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">{team.department}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedTeam && (
                <Button 
                  onClick={handleAssign} 
                  className="w-full"
                  disabled={selectedTeam === report.assignedTo}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {report.status === "pending" ? "Assign & Start Progress" : 
                   selectedTeam === report.assignedTo ? "Already Assigned" : 
                   "Update Assignment"}
                </Button>
              )}
            </div>
          </div>

          {/* Activity Log */}
          {report.activityLog && report.activityLog.length > 0 && (
            <div className="space-y-3 border-t border-border pt-6">
              <h4 className="text-sm font-medium text-card-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Activity Log
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {report.activityLog.map((entry, index) => (
                  <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
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
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-card rounded-xl p-6 max-w-md w-full space-y-4">
              <h3 className="text-lg font-semibold text-card-foreground">Delete Report</h3>
              <p className="text-sm text-muted-foreground">
                This report is resolved. You can delete it, but proof of resolution is recommended.
              </p>
              
              {report.status === "resolved" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-card-foreground">
                    Upload Proof of Resolution (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setProofFile(null)
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting || isUploadingProof}
                >
                  {isDeleting ? "Deleting..." : "Delete Report"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-card border-t border-border p-4 flex items-center justify-between">
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "text-destructive hover:bg-destructive/10 bg-transparent",
              report.status !== "resolved" && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => {
              if (report.status === "resolved") {
                setShowDeleteConfirm(true)
              } else {
                toast({
                  title: "Cannot Delete",
                  description: "Only resolved reports can be deleted. Please resolve the report first.",
                  variant: "destructive",
                })
              }
            }}
            disabled={report.status !== "resolved"}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {report.status === "resolved" ? "Delete Report" : "Resolve to Delete"}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function AdminView({ reports, onStatusChange, onTeamAssigned }: AdminViewProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | "all">("all")
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | "all">("all")
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [selectedReports, setSelectedReports] = useState<string[]>([])
  const [mapReports, setMapReports] = useState<ReportFromDB[]>([])
  const [isLoadingMapReports, setIsLoadingMapReports] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)
  const [leafletModule, setLeafletModule] = useState<typeof import("leaflet") | null>(null)
  const { logout } = useAuth()
  const router = useRouter()

  // Load leaflet module on client side only
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet").then((L) => {
        setLeafletModule(L)
      })
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push("/admin/login")
  }

  const totalReports = reports.length
  const resolvedReports = reports.filter((r) => r.status === "resolved").length
  const pendingReports = reports.filter((r) => r.status === "pending").length
  const inProgressReports = reports.filter((r) => r.status === "in-progress").length

  const pendingAlerts = reports.filter((r) => r.status === "pending")
  const completionRate = totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch =
        report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.id.includes(searchQuery)
      const matchesStatus = selectedStatus === "all" || report.status === selectedStatus
      const matchesCategory = selectedCategory === "all" || report.category === selectedCategory
      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [reports, searchQuery, selectedStatus, selectedCategory])

  // Pagination for reports table
  const { paginatedItems: paginatedReports, currentPage, totalPages, goToPage, totalItems } = usePagination(
    filteredReports,
    10
  )

  const analyticsData = useMemo(() => {
    const byCategory = reports.reduce(
      (acc, r) => {
        acc[r.category] = (acc[r.category] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const bySeverity = reports.reduce(
      (acc, r) => {
        acc[r.severity] = (acc[r.severity] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return { byCategory, bySeverity }
  }, [reports])

  useEffect(() => {
    setIsLoaded(true)
    // Ensure map only renders on client side
    setIsMapReady(true)
  }, [])

  // Fetch reports from Supabase when map tab is active
  useEffect(() => {
    if (activeTab === "map") {
      const loadMapReports = async () => {
        setIsLoadingMapReports(true)
        try {
          const fetchedReports = await fetchAllReports()
          setMapReports(fetchedReports)
        } catch (error) {
          console.error("Failed to load map reports:", error)
          // Fallback to using the reports prop if Supabase fetch fails
          setMapReports([])
        } finally {
          setIsLoadingMapReports(false)
        }
      }
      loadMapReports()
    }
  }, [activeTab])

  // Create custom icon based on severity and status
  // This function is only called on the client side after map is ready
  const createMarkerIcon = (severity: string, status: string) => {
    // Return undefined if leaflet is not loaded yet
    if (!leafletModule) {
      return undefined
    }

    let color = "#6b7280" // default gray
    
    if (status === "resolved" || status === "Resolved") {
      color = "#10b981" // green
    } else if (status === "in-progress" || status === "In Progress") {
      color = "#3b82f6" // blue
    } else if (severity === "high" || severity === "High") {
      color = "#ef4444" // red
    } else if (severity === "medium" || severity === "Medium") {
      color = "#f59e0b" // yellow/amber
    } else {
      color = "#6b7280" // gray for low
    }

    return leafletModule.divIcon({
      className: "custom-marker",
      html: `<div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 20],
      popupAnchor: [0, -20],
    })
  }

  const handleBulkStatusChange = (status: ReportStatus) => {
    selectedReports.forEach((id) => onStatusChange(id, status))
    setSelectedReports([])
  }

  const toggleSelectReport = (reportId: string) => {
    setSelectedReports((prev) => (prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId]))
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sidebar-primary to-amber-600 shadow-lg shadow-sidebar-primary/25">
            <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-sidebar-foreground">SaloneFix</span>
            <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">Admin Panel</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveTab(item.tab)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                activeTab === item.tab
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className={cn("h-5 w-5", activeTab === item.tab && "text-sidebar-primary")} />
              {item.label}
              {item.label === "Reports" && pendingReports > 0 && (
                <Badge className="ml-auto bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0">
                  {pendingReports}
                </Badge>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-4 space-y-2">
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-sidebar-accent/30">
            <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
              <Users className="h-4 w-4 text-sidebar-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">Admin User</p>
              <p className="text-xs text-muted-foreground truncate">Freetown City Council</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start bg-transparent border-sidebar-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-amber-600">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">SaloneFix</span>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground capitalize">{activeTab}</h1>
            <Badge variant="secondary" className="text-xs">
              Live
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/50"
              />
            </div>

            <Button variant="outline" size="sm" className="hidden sm:flex gap-2 bg-transparent">
              <Download className="h-4 w-4" />
              Export
            </Button>

            <Button variant="ghost" size="icon" className="relative group">
              <Bell className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
              {pendingReports > 0 && (
                <>
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-lg">
                    {pendingReports}
                  </span>
                  <span className="absolute -right-0.5 -top-0.5 h-5 w-5 rounded-full bg-destructive animate-ping opacity-75" />
                </>
              )}
            </Button>

            <Button variant="outline" size="sm" className="lg:hidden bg-transparent">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-auto p-6">
          {activeTab === "dashboard" && (
            <>
              <div
                className={cn(
                  "mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4 transition-all duration-500",
                  isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
                )}
              >
                <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Reports</CardTitle>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-card-foreground">
                      <AnimatedNumber value={totalReports} />
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3 text-success" />
                      <span className="text-success font-medium">+12%</span>
                      <span>this week</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-card-foreground">
                      <AnimatedNumber value={resolvedReports} />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-success rounded-full transition-all duration-1000 ease-out"
                          style={{ width: isLoaded ? `${completionRate}%` : "0%" }}
                        />
                      </div>
                      <span className="text-xs font-medium text-success">{completionRate}%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-info/5 to-transparent" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10 text-info">
                      <Clock className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-card-foreground">
                      <AnimatedNumber value={inProgressReports} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Being addressed</p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 text-warning">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-card-foreground">
                      <AnimatedNumber value={pendingReports} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
                  </CardContent>
                </Card>
              </div>

              {/* Split View */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                        <Bell className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-card-foreground">Incoming Alerts</CardTitle>
                        <p className="text-xs text-muted-foreground">{pendingAlerts.length} pending review</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab("reports")}>
                      View All
                      <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Button>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-2 overflow-auto max-h-[400px]">
                    {pendingAlerts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 mb-3">
                          <CheckCircle2 className="h-6 w-6 text-success" />
                        </div>
                        <p className="text-sm font-medium text-foreground">All caught up!</p>
                        <p className="text-xs text-muted-foreground mt-1">No pending alerts to review</p>
                      </div>
                    ) : (
                      pendingAlerts.map((alert, index) => (
                        <div
                          key={alert.id}
                          onClick={() => setSelectedReport(alert)}
                          className={cn(
                            "flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all duration-200",
                            "hover:bg-muted/50 hover:border-primary/20 hover:shadow-sm cursor-pointer group",
                            alert.severity === "high" && "border-destructive/30",
                          )}
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full flex-shrink-0",
                              alert.severity === "high" && "bg-destructive animate-pulse",
                              alert.severity === "medium" && "bg-warning",
                              alert.severity === "low" && "bg-muted-foreground",
                            )}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-card-foreground truncate">{alert.title}</span>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[10px] px-1.5 py-0",
                                  alert.severity === "high" && "bg-destructive/10 text-destructive",
                                  alert.severity === "medium" && "bg-warning/10 text-warning",
                                  alert.severity === "low" && "bg-muted text-muted-foreground",
                                )}
                              >
                                {alert.severity}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{alert.location}</p>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedReport(alert)
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            Triage
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Map className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-card-foreground">Live Incident Map</CardTitle>
                        <p className="text-xs text-muted-foreground">Real-time hazard locations</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                      Live
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex flex-1 items-center justify-center">
                    <div className="relative flex h-72 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 overflow-hidden">
                      <div className="absolute inset-0 opacity-20">
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: `
                            linear-gradient(to right, var(--border) 1px, transparent 1px),
                            linear-gradient(to bottom, var(--border) 1px, transparent 1px)
                          `,
                            backgroundSize: "40px 40px",
                          }}
                        />
                      </div>

                      <div className="absolute top-1/4 left-1/3 h-3 w-3 rounded-full bg-destructive shadow-lg shadow-destructive/50">
                        <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-75" />
                      </div>
                      <div className="absolute top-1/2 right-1/3 h-3 w-3 rounded-full bg-warning shadow-lg" />
                      <div className="absolute bottom-1/3 left-1/2 h-3 w-3 rounded-full bg-success shadow-lg" />
                      <div className="absolute top-1/3 right-1/4 h-3 w-3 rounded-full bg-info shadow-lg" />

                      <Map className="h-12 w-12 text-muted-foreground/50 relative z-10" />
                      <p className="mt-3 text-sm font-medium text-muted-foreground relative z-10">Interactive Map</p>
                      <p className="text-xs text-muted-foreground/70 relative z-10">Mapbox integration ready</p>

                      <div className="mt-6 flex gap-4 text-xs relative z-10">
                        <div className="flex items-center gap-1.5 bg-background/80 rounded-full px-2.5 py-1">
                          <div className="h-2 w-2 rounded-full bg-destructive" />
                          <span className="text-muted-foreground">High</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-background/80 rounded-full px-2.5 py-1">
                          <div className="h-2 w-2 rounded-full bg-warning" />
                          <span className="text-muted-foreground">Medium</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-background/80 rounded-full px-2.5 py-1">
                          <div className="h-2 w-2 rounded-full bg-success" />
                          <span className="text-muted-foreground">Resolved</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {activeTab === "reports" && (
            <div className="space-y-6">
              {/* Filters Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant={selectedStatus === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStatus("all")}
                  >
                    All ({reports.length})
                  </Button>
                  <Button
                    variant={selectedStatus === "pending" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStatus("pending")}
                    className={selectedStatus === "pending" ? "bg-warning text-warning-foreground" : ""}
                  >
                    Pending ({pendingReports})
                  </Button>
                  <Button
                    variant={selectedStatus === "in-progress" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStatus("in-progress")}
                    className={selectedStatus === "in-progress" ? "bg-info text-info-foreground" : ""}
                  >
                    In Progress ({inProgressReports})
                  </Button>
                  <Button
                    variant={selectedStatus === "resolved" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStatus("resolved")}
                    className={selectedStatus === "resolved" ? "bg-success text-success-foreground" : ""}
                  >
                    Resolved ({resolvedReports})
                  </Button>
                </div>

                {/* Bulk Actions */}
                {selectedReports.length > 0 && (
                  <div className="flex items-center gap-2 animate-fade-up">
                    <span className="text-sm text-muted-foreground">{selectedReports.length} selected</span>
                    <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange("in-progress")}>
                      <Clock className="mr-1 h-3 w-3" />
                      Mark In Progress
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkStatusChange("resolved")}
                      className="text-success"
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Mark Resolved
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedReports([])}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Reports Table */}
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-4 w-10">
                          <input
                            type="checkbox"
                            className="rounded border-border"
                            checked={selectedReports.length === filteredReports.length && filteredReports.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedReports(filteredReports.map((r) => r.id))
                              } else {
                                setSelectedReports([])
                              }
                            }}
                          />
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">ID</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Report</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Location</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Category</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Severity</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Assigned</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedReports.map((report) => (
                        <tr
                          key={report.id}
                          className="border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedReport(report)}
                        >
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="rounded border-border"
                              checked={selectedReports.includes(report.id)}
                              onChange={() => toggleSelectReport(report.id)}
                            />
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">#{report.id}</td>
                          <td className="p-4">
                            <div className="font-medium text-card-foreground">{report.title}</div>
                            <div className="text-xs text-muted-foreground">
                              <TimeAgo date={report.timestamp} />
                            </div>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">{report.location}</td>
                          <td className="p-4">
                            <Badge variant="outline" className="capitalize">
                              {report.category}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge
                              variant={
                                report.severity === "high"
                                  ? "destructive"
                                  : report.severity === "medium"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {report.severity}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge
                              className={cn(
                                report.status === "pending" && "bg-muted text-muted-foreground",
                                report.status === "in-progress" && "bg-info/10 text-info",
                                report.status === "resolved" && "bg-success/10 text-success",
                              )}
                            >
                              {report.status === "in-progress"
                                ? "In Progress"
                                : report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">{report.assignedTo || "-"}</td>
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" onClick={() => setSelectedReport(report)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="p-4 border-t border-border">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={goToPage}
                      pageSize={10}
                      totalItems={totalItems}
                    />
                  </div>
                )}
              </Card>
            </div>
          )}

          {activeTab === "teams" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Response Teams</h2>
                  <p className="text-sm text-muted-foreground">Manage and monitor field teams</p>
                </div>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Team
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {mockTeams.map((team) => (
                  <Card key={team.id} className="hover:shadow-lg transition-all duration-200">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{team.name}</CardTitle>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{team.department}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between py-3 border-t border-border">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{team.members} members</span>
                        </div>
                        <Badge variant={team.activeJobs > 3 ? "destructive" : "secondary"}>
                          {team.activeJobs} active jobs
                        </Badge>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                          View Tasks
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                          Contact
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Analytics Overview</h2>
                  <p className="text-sm text-muted-foreground">Insights and performance metrics</p>
                </div>
                <Button variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Reports by Category */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Reports by Category</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(analyticsData.byCategory).map(([category, count]) => (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize text-card-foreground">{category}</span>
                          <span className="text-muted-foreground">{count} reports</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${(count / totalReports) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Reports by Severity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Reports by Severity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(analyticsData.bySeverity).map(([severity, count]) => (
                      <div key={severity} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize text-card-foreground">{severity}</span>
                          <span className="text-muted-foreground">{count} reports</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              severity === "high" && "bg-destructive",
                              severity === "medium" && "bg-warning",
                              severity === "low" && "bg-success",
                            )}
                            style={{ width: `${(count / totalReports) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Performance Metrics */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-primary">{completionRate}%</p>
                        <p className="text-sm text-muted-foreground">Resolution Rate</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-info">2.5h</p>
                        <p className="text-sm text-muted-foreground">Avg. Response Time</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-success">4.8</p>
                        <p className="text-sm text-muted-foreground">Citizen Rating</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-warning">{mockTeams.length}</p>
                        <p className="text-sm text-muted-foreground">Active Teams</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "map" && (
            <Card className="h-[calc(100vh-12rem)]">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Live Incident Map</CardTitle>
                  <p className="text-sm text-muted-foreground">Real-time visualization of all reported hazards</p>
                </div>
                <Badge variant="outline" className="gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  {isLoadingMapReports ? "Loading..." : `${mapReports.length} incidents`}
                </Badge>
              </CardHeader>
              <CardContent className="h-full pb-6">
                {isLoadingMapReports ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Loading map data...</p>
                  </div>
                  </div>
                ) : isMapReady ? (
                  <div className="relative h-full w-full rounded-xl overflow-hidden border border-border">
                    <MapContainer
                      center={[8.4606, -13.2562] as LatLngExpression}
                      zoom={13}
                      style={{ height: "100%", width: "100%", zIndex: 0 }}
                      scrollWheelZoom={true}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {mapReports.map((report) => {
                        if (!report.latitude || !report.longitude) return null
                        
                        return (
                          <Marker
                      key={report.id}
                            position={[report.latitude, report.longitude] as LatLngExpression}
                            icon={createMarkerIcon(report.severity, report.status)}
                            eventHandlers={{
                              click: () => {
                                trackMapInteraction('marker_clicked', report.id)
                              },
                            }}
                          >
                            <Popup>
                              <div className="space-y-2 min-w-[200px]">
                                {report.image_url && (
                                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted mb-2">
                                    <Image
                                      src={report.image_url}
                                      alt={report.category}
                                      fill
                                      className="object-cover"
                                      sizes="(max-width: 768px) 100vw, 400px"
                                      unoptimized={report.image_url.startsWith('http') && !report.image_url.includes('supabase')}
                                    />
                                  </div>
                                )}
                                <div>
                                  <Badge variant="outline" className="mb-1 capitalize">
                                    {report.category}
                                  </Badge>
                                  <p className="text-sm font-medium text-foreground mt-1">{report.category}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                                  <div className="flex items-center gap-2 mt-2 text-xs">
                                    <Badge
                                      variant={
                                        report.severity === "High"
                                          ? "destructive"
                                          : report.severity === "Medium"
                                            ? "secondary"
                                            : "outline"
                                      }
                                      className="text-xs"
                                    >
                                      {report.severity}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-xs",
                                        report.status === "Resolved" && "bg-success/10 text-success",
                                        report.status === "In Progress" && "bg-info/10 text-info",
                                      )}
                                    >
                                      {report.status}
                                    </Badge>
                    </div>
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        )
                      })}
                    </MapContainer>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <Map className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Initializing map...</p>
                    </div>
                  </div>
                )}
                <div className="mt-4 flex gap-4 text-xs flex-wrap">
                  <div className="flex items-center gap-1.5 bg-background/80 rounded-full px-3 py-1.5 border border-border">
                      <div className="h-2.5 w-2.5 rounded-full bg-destructive" />
                      <span className="text-muted-foreground">High Priority</span>
                    </div>
                  <div className="flex items-center gap-1.5 bg-background/80 rounded-full px-3 py-1.5 border border-border">
                      <div className="h-2.5 w-2.5 rounded-full bg-warning" />
                    <span className="text-muted-foreground">Medium Priority</span>
                    </div>
                  <div className="flex items-center gap-1.5 bg-background/80 rounded-full px-3 py-1.5 border border-border">
                      <div className="h-2.5 w-2.5 rounded-full bg-info" />
                      <span className="text-muted-foreground">In Progress</span>
                    </div>
                  <div className="flex items-center gap-1.5 bg-background/80 rounded-full px-3 py-1.5 border border-border">
                      <div className="h-2.5 w-2.5 rounded-full bg-success" />
                      <span className="text-muted-foreground">Resolved</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      {/* Report Triage Modal */}
      {selectedReport && (
        <ReportTriageModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onStatusChange={onStatusChange}
          teams={mockTeams}
          onTeamAssigned={onTeamAssigned}
          onReportDeleted={() => {
            // Refresh reports will happen automatically via real-time subscription
            // The subscription will remove the deleted report from the list
            setSelectedReport(null)
          }}
        />
      )}
    </div>
  )
}
