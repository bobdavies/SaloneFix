"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import {
  LayoutDashboard,
  Map,
  FileText,
  Settings,
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
  Phone,
  Mail,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize,
  Layers,
  BarChart2,
  Target,
  Zap,
  TrendingDown,
  Moon,
  Sun,
  Bell as BellIcon,
  Database,
  ShieldCheck,
  Globe,
  Save,
  Download as DownloadIcon,
  Upload,
  Info,
  Mail as MailIcon,
  Lock,
  UserCog,
  Palette,
  Menu,
  MessageSquare,
  Send,
  PlayCircle,
  Square,
  Flag,
  Copy,
  ExternalLink,
  Droplets,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp"
import { TimeAgo } from "@/components/time-ago"
import { cn } from "@/lib/utils"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"
import type { Report, ReportStatus, ReportCategory, ReportPriority, Team, AdminNote } from "@/lib/types"
import { mockTeams } from "@/lib/types"
import dynamic from "next/dynamic"
import type { LatLngExpression } from "leaflet"
import { fetchAllReports, type ReportFromDB, assignTeamToReport, deleteReport, updateReportWithProof, uploadProofImage, convertReportFromDBWithActivityLog, updateReportPriority } from "@/src/services/reportService"
import { fetchAllTeams, convertTeamFromDB, type TeamFromDB } from "@/src/services/teamService"
import { 
  autoAssignReport, 
  suggestTeamForReport, 
  getAssignmentRules, 
  saveAssignmentRules,
  isAutoAssignmentEnabled,
  setAutoAssignmentEnabled,
  type AssignmentRule 
} from "@/src/services/autoAssignmentService"
import { useTheme } from "next-themes"
import { 
  loadSettings, 
  saveSettings, 
  type UserSettings,
  LANGUAGE_NAMES,
  type Language,
  type Theme
} from "@/src/services/settingsService"
import { exportReports, downloadBackup } from "@/src/utils/exportUtils"
import {
  generateTOTPSecret,
  generateQRCodeURL,
  getQRCodeImageURL,
  verifyTOTPCodeAsync,
  is2FAEnabled,
  enable2FA,
  disable2FA,
  get2FASecret,
} from "@/src/services/twoFactorService"
import {
  getSavedViews,
  saveView,
  updateView,
  deleteView,
  type SavedView,
} from "@/src/services/savedViewsService"
import { fetchActivityLogForReport } from "@/src/services/activityLogService"
import { testAdminAccess } from "@/src/services/adminService"
import { fetchNotesForReport, saveNoteToReport } from "@/src/services/notesService"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { useIsMobile } from "@/components/ui/use-mobile"

// Dynamically import Leaflet components with SSR disabled (they require window object)
// Type annotations are added to fix TypeScript errors with dynamic imports
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
) as React.ComponentType<any>

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
) as React.ComponentType<any>

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
) as React.ComponentType<any>

const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
) as React.ComponentType<any>

// Import leaflet utilities dynamically (only used on client side)
// These will be loaded when needed in the createMarkerIcon function
import { useRouter } from "next/navigation"
import { MapSkeleton, TableSkeleton, StatsSkeleton } from "@/components/loading-skeleton"
import { Pagination } from "@/components/ui/pagination"
import { usePagination } from "@/hooks/use-pagination"
import { trackMapInteraction } from "@/lib/analytics"

interface AdminViewProps {
  reports: Report[]
  onStatusChange: (reportId: string, newStatus: ReportStatus) => void
  onTeamAssigned?: (reportId: string, teamName: string) => void
  onRefresh?: () => void
  isRefreshing?: boolean
}

type AdminTab = "dashboard" | "reports" | "map" | "teams" | "analytics" | "settings"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", tab: "dashboard" as const },
  { icon: FileText, label: "Reports", tab: "reports" as const },
  { icon: Map, label: "Map View", tab: "map" as const },
  { icon: Users, label: "Teams", tab: "teams" as const },
  { icon: BarChart3, label: "Analytics", tab: "analytics" as const },
  { icon: Settings, label: "Settings", tab: "settings" as const },
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

// Priority Badge Component
function PriorityBadge({ priority }: { priority: ReportPriority }) {
  const priorityConfig = {
    critical: {
      label: "Critical",
      className: "bg-red-500/10 text-red-600 border-red-500/20",
      icon: AlertTriangle,
    },
    high: {
      label: "High",
      className: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      icon: Zap,
    },
    medium: {
      label: "Medium",
      className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      icon: Clock,
    },
    low: {
      label: "Low",
      className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      icon: CheckCircle2,
    },
  }

  const config = priorityConfig[priority]
  const Icon = config.icon

  return (
    <Badge variant="outline" className={cn("text-xs font-medium flex items-center gap-1", config.className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
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
  const [activityLog, setActivityLog] = useState<Report['activityLog']>(report?.activityLog || [])
  const [isLoadingActivityLog, setIsLoadingActivityLog] = useState(false)
  const [isAssigningTeam, setIsAssigningTeam] = useState(false)
  const [notes, setNotes] = useState<AdminNote[]>(report?.internalNotes || [])
  const [newNote, setNewNote] = useState("")
  const [isNotePublic, setIsNotePublic] = useState(false)
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
  const { toast } = useToast()
  const { user } = useAuth()
  
  // Update selectedTeam when report changes
  useEffect(() => {
    if (report?.assignedTo) {
      setSelectedTeam(report.assignedTo)
    } else {
      setSelectedTeam("")
    }
  }, [report?.assignedTo])

  // Fetch notes from database when modal opens
  useEffect(() => {
    if (report?.id) {
      setIsLoadingNotes(true)
      fetchNotesForReport(report.id)
        .then((fetchedNotes) => {
          setNotes(fetchedNotes)
        })
        .catch((error) => {
          console.error('Failed to fetch notes:', error)
          // Fallback to report's internalNotes if available
          setNotes(report?.internalNotes || [])
        })
        .finally(() => {
          setIsLoadingNotes(false)
        })
    } else {
      setNotes([])
    }
  }, [report?.id])

  // Fetch activity log when modal opens
  useEffect(() => {
    if (report?.id) {
      setIsLoadingActivityLog(true)
      fetchActivityLogForReport(report.id)
        .then((entries) => {
          const convertedLog = entries.map((entry) => ({
            id: entry.id,
            action: entry.details || entry.action,
            user: entry.performed_by,
            timestamp: new Date(entry.created_at),
            details: entry.metadata ? JSON.stringify(entry.metadata) : undefined,
          }))
          setActivityLog(convertedLog)
        })
        .catch((error) => {
          console.error('Failed to fetch activity log:', error)
          setActivityLog(report.activityLog || [])
        })
        .finally(() => {
          setIsLoadingActivityLog(false)
        })
    }
  }, [report?.id])

  if (!report) return null

  // Get mentionable items (teams and common mentions)
  const getMentionSuggestions = (query: string): string[] => {
    const allSuggestions = [
      ...teams.map(t => t.name),
      'Roads Team',
      'Sanitation Team',
      'Water Team',
      'Electrical Team',
      'Emergency Response',
      'Admin',
      'Manager',
    ]
    
    if (!query) return allSuggestions.slice(0, 5)
    
    const lowerQuery = query.toLowerCase()
    return allSuggestions
      .filter(item => item.toLowerCase().includes(lowerQuery))
      .slice(0, 5)
  }

  // Handle mention input
  const handleNoteInput = (value: string) => {
    setNewNote(value)
    
    // Check for @ mention
    const cursorPos = value.length // Simplified - in real app, track cursor position
    const textBeforeCursor = value.substring(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      // Only show suggestions if we're still typing the mention (no space after @)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionQuery(textAfterAt)
        setShowMentionSuggestions(true)
      } else {
        setShowMentionSuggestions(false)
      }
    } else {
      setShowMentionSuggestions(false)
    }
  }

  // Insert mention into note
  const insertMention = (mention: string) => {
    const cursorPos = newNote.length
    const textBeforeCursor = newNote.substring(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const beforeAt = newNote.substring(0, lastAtIndex)
      const afterCursor = newNote.substring(cursorPos)
      const newText = `${beforeAt}@${mention} ${afterCursor}`
      setNewNote(newText)
      setShowMentionSuggestions(false)
      setMentionQuery("")
    }
  }

  // Handle adding a new note
  const handleAddNote = async () => {
    if (!newNote.trim() || !report?.id) return

    setIsAddingNote(true)
    try {
      // Enhanced mention extraction - supports @TeamName and @username patterns
      const mentionRegex = /@([\w\s]+?)(?=\s|$|@|,|\.|!|\?)/g
      const mentions: string[] = []
      let match
      while ((match = mentionRegex.exec(newNote)) !== null) {
        const mention = match[1].trim()
        if (mention) {
          mentions.push(mention)
        }
      }

      // Get author name from auth user or fallback
      const authorName = user?.email || user?.id || "Admin User"

      // Save note to database
      const savedNote = await saveNoteToReport(report.id, {
        content: newNote.trim(),
        authorId: user?.id || null,
        authorName,
        isPublic: isNotePublic,
        mentions: mentions.length > 0 ? mentions : undefined,
      })

      // Update local state with saved note
      setNotes([...(notes || []), savedNote])
      setNewNote("")
      setIsNotePublic(false)

      toast({
        title: "Note Added",
        description: isNotePublic ? "Public note added (visible to reporter)" : "Internal note added",
      })
    } catch (error) {
      console.error("Failed to add note:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add note. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAddingNote(false)
    }
  }

  const handleAssign = async () => {
    if (!selectedTeam) return
    
    setIsAssigningTeam(true)
    try {
      console.log(`[ReportTriageModal] handleAssign called for report ${report.id} with team ${selectedTeam}`)
      
      // Call the parent handler which will update the database and UI
      if (onTeamAssigned) {
        console.log(`[ReportTriageModal] Calling onTeamAssigned handler`)
        await onTeamAssigned(report.id, selectedTeam)
        console.log(`[ReportTriageModal] onTeamAssigned completed`)
      } else {
        console.log(`[ReportTriageModal] No handler provided, using direct assignment`)
        // Fallback: direct assignment if handler not provided
        const success = await assignTeamToReport(report.id, selectedTeam, 'Admin')
        if (success) {
          toast({
            title: "Success",
            description: `Report assigned to ${selectedTeam}`,
          })
          
          // If status is pending, also update to in-progress
          if (report.status === "pending") {
            onStatusChange(report.id, "in-progress")
          }
        } else {
          toast({
            title: "Warning",
            description: "Team assignment may have failed. Check console for details.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error(`[ReportTriageModal] handleAssign error:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign team",
        variant: "destructive",
      })
    } finally {
      setIsAssigningTeam(false)
    }
  }
  
  const handleUnassign = async () => {
    setIsAssigningTeam(true)
    try {
      console.log(`[ReportTriageModal] handleUnassign called for report ${report.id}`)
      
      if (onTeamAssigned) {
        // Pass empty string to unassign
        await onTeamAssigned(report.id, "")
        toast({
          title: "Success",
          description: "Team unassigned from report",
        })
      } else {
        // Direct unassignment
        const success = await assignTeamToReport(report.id, "", 'Admin')
        if (success) {
          toast({
            title: "Success",
            description: "Team unassigned from report",
          })
        }
      }
      setSelectedTeam("")
    } catch (error) {
      console.error(`[ReportTriageModal] handleUnassign error:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to unassign team",
        variant: "destructive",
      })
    } finally {
      setIsAssigningTeam(false)
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
    <Dialog open={!!report} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge
                variant={
                  report.severity === "high" ? "destructive" : report.severity === "medium" ? "secondary" : "outline"
                }
                className="text-xs"
              >
                {report.severity.toUpperCase()}
              </Badge>
              <DialogTitle className="text-lg font-semibold">Report #{report.id.slice(0, 8)}</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize text-xs">
                {report.category}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Report Image */}
          {report.imageUrl && (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted border">
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

          {/* Report Title & Description */}
          <div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">{report.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{report.description}</p>
          </div>

          {/* Report Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Location:</span>
              <span className="font-medium">{report.location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">{formatDate(report.timestamp)}</span>
            </div>
          </div>

          {/* Priority Section */}
          <div className="pt-2 border-t">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Priority</label>
            <div className="flex items-center gap-2">
              <PriorityBadge priority={report.priority || 'medium'} />
              <Select
                value={report.priority || 'medium'}
                onValueChange={async (value: ReportPriority) => {
                  try {
                    const success = await updateReportPriority(report.id, value, user?.email || 'Admin')
                    if (success) {
                      toast({
                        title: "Priority Updated",
                        description: `Priority changed to ${value}`,
                      })
                      // Update local state if report is available
                      // The real-time subscription will update the report automatically
                    }
                  } catch (error) {
                    console.error('Priority update error:', error)
                    toast({
                      title: "Error",
                      description: error instanceof Error ? error.message : "Failed to update priority",
                      variant: "destructive",
                    })
                  }
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status & Team Assignment */}
          <div className="grid md:grid-cols-2 gap-4 pt-2 border-t">
            {/* Status Section */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Status</label>
              <div className="flex gap-2">
                {(["pending", "in-progress", "resolved"] as ReportStatus[]).map((status) => (
                  <Button
                    key={status}
                    variant={report.status === status ? "default" : "outline"}
                    size="sm"
                    onClick={async () => {
                      try {
                        await onStatusChange(report.id, status)
                      } catch (error) {
                        console.error(`Status change error:`, error)
                      }
                    }}
                    className={cn(
                      "text-xs",
                      report.status === status && status === "pending" && "bg-warning text-warning-foreground",
                      report.status === status && status === "in-progress" && "bg-info text-info-foreground",
                      report.status === status && status === "resolved" && "bg-success text-success-foreground",
                    )}
                  >
                    {status === "in-progress" ? "Active" : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Team Assignment Section */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Team Assignment</label>
              {report.assignedTo ? (
                <div className="p-2 rounded border bg-primary/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{report.assignedTo}</p>
                      <p className="text-xs text-muted-foreground">
                        {teams.find(t => t.name === report.assignedTo)?.department || "Assigned team"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                    Assigned
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No team assigned</p>
              )}
            </div>
          </div>

          {/* Team Selection */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Assign Team</label>
            <div className="relative">
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => setShowTeamDropdown(!showTeamDropdown)}
                disabled={isAssigningTeam}
              >
                <span className={selectedTeam ? "font-medium" : "text-muted-foreground"}>
                  {selectedTeam || (report.assignedTo ? "Change team..." : "Select a team...")}
                </span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", showTeamDropdown && "rotate-180")} />
              </Button>
              {showTeamDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  {report.assignedTo && (
                    <button
                      className="w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm border-b"
                      onClick={() => {
                        setSelectedTeam("")
                        setShowTeamDropdown(false)
                      }}
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <X className="h-3.5 w-3.5" />
                        <span>Unassign Team</span>
                      </div>
                    </button>
                  )}
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      className={cn(
                        "w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm",
                        team.name === report.assignedTo && "bg-primary/5"
                      )}
                      onClick={() => {
                        setSelectedTeam(team.name)
                        setShowTeamDropdown(false)
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-sm font-medium",
                              team.name === report.assignedTo && "text-primary"
                            )}>
                              {team.name}
                            </span>
                            {team.name === report.assignedTo && (
                              <Badge variant="outline" className="text-xs text-primary border-primary/30">
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{team.department}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {team.activeJobs} jobs
                        </Badge>
                      </div>
                    </button>
                  ))}
                  {teams.length === 0 && (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No teams available
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Assign/Unassign Button */}
          {(selectedTeam && selectedTeam !== report.assignedTo) || (report.assignedTo && !selectedTeam) ? (
            <Button
              onClick={selectedTeam ? handleAssign : handleUnassign}
              className="w-full"
              disabled={isAssigningTeam}
            >
              {isAssigningTeam ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {selectedTeam ? "Assigning..." : "Unassigning..."}
                </>
              ) : (
                <>
                  {selectedTeam ? (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      {report.status === "pending" ? "Assign & Start Progress" : "Assign Team"}
                    </>
                  ) : (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      Unassign Team
                    </>
                  )}
                </>
              )}
            </Button>
          ) : null}

          {/* Internal Notes/Comments Section */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Internal Notes & Comments
              </h4>
            </div>

            {/* Existing Notes */}
            {notes && notes.length > 0 ? (
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={cn(
                      "p-3 rounded-lg border",
                      note.isPublic
                        ? "bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
                        : "bg-muted/50 border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-card-foreground">{note.author}</span>
                        {note.isPublic ? (
                          <Badge variant="outline" className="text-xs">
                            <Globe className="h-3 w-3 mr-1" />
                            Public
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            Internal
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        <TimeAgo date={note.timestamp} />
                      </span>
                    </div>
                    <p className="text-sm text-card-foreground whitespace-pre-wrap">{note.content}</p>
                    {note.mentions && note.mentions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {note.mentions.map((mention, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            @{mention}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground mb-4">
                No notes yet. Add a note to track internal discussions.
              </div>
            )}

            {/* Add New Note */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add a note or comment... Use @ to mention teams (e.g., @Roads Team)"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      handleAddNote()
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || isAddingNote}
                  size="sm"
                >
                  {isAddingNote ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="note-visibility"
                  checked={isNotePublic}
                  onCheckedChange={setIsNotePublic}
                />
                <Label htmlFor="note-visibility" className="text-xs text-muted-foreground cursor-pointer">
                  {isNotePublic ? (
                    <>
                      <Globe className="h-3 w-3 inline mr-1" />
                      Public (visible to reporter)
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3 inline mr-1" />
                      Internal (admin only)
                    </>
                  )}
                </Label>
                <span className="text-xs text-muted-foreground ml-auto">
                  Press Ctrl+Enter to submit
                </span>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Activity Log
              </h4>
              {isLoadingActivityLog && (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
            {isLoadingActivityLog ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : activityLog && activityLog.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activityLog.map((entry, index) => (
                  <div key={entry.id || index} className="flex items-start gap-3 p-2.5 rounded border bg-muted/30">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
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
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No activity log entries
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t px-6 py-4 bg-muted/30 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
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
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Report</DialogTitle>
              <DialogDescription>
                This action cannot be undone. Upload proof of resolution (optional) before deleting.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {report.status === "resolved" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Upload Proof (Optional)</label>
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
                  onClick={handleDelete}
                  disabled={isDeleting || isUploadingProof}
                >
                  {isDeleting ? "Deleting..." : "Delete Report"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  )
}

function TeamTasksModal({
  team,
  reports,
  isOpen,
  onClose,
  onReportClick,
}: {
  team: Team | null
  reports: Report[]
  isOpen: boolean
  onClose: () => void
  onReportClick?: (report: Report) => void
}) {
  if (!team) return null

  const teamTasks = useMemo(() => {
    return reports.filter((report) => report.assignedTo === team.name)
  }, [reports, team.name])

  const tasksByStatus = useMemo(() => {
    return {
      pending: teamTasks.filter((r) => r.status === "pending"),
      inProgress: teamTasks.filter((r) => r.status === "in-progress"),
      resolved: teamTasks.filter((r) => r.status === "resolved"),
    }
  }, [teamTasks])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg font-semibold">{team.name} - Tasks</DialogTitle>
          <DialogDescription>
            {teamTasks.length} {teamTasks.length === 1 ? 'task' : 'tasks'} assigned
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded bg-warning/5 border border-warning/20">
              <p className="text-2xl font-bold text-warning">{tasksByStatus.pending.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Pending</p>
            </div>
            <div className="text-center p-3 rounded bg-info/5 border border-info/20">
              <p className="text-2xl font-bold text-info">{tasksByStatus.inProgress.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Active</p>
            </div>
            <div className="text-center p-3 rounded bg-success/5 border border-success/20">
              <p className="text-2xl font-bold text-success">{tasksByStatus.resolved.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Resolved</p>
            </div>
          </div>

          {/* Tasks List */}
          {teamTasks.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No tasks assigned to this team</p>
            </div>
          ) : (
            <div className="space-y-2">
              {teamTasks.map((report) => (
                <Card
                  key={report.id}
                  className="hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    if (onReportClick) {
                      onReportClick(report)
                      onClose()
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-sm">{report.title}</h4>
                          <Badge
                            variant={
                              report.severity === "high"
                                ? "destructive"
                                : report.severity === "medium"
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
                              report.status === "pending" && "bg-warning/10 text-warning",
                              report.status === "in-progress" && "bg-info/10 text-info",
                              report.status === "resolved" && "bg-success/10 text-success",
                            )}
                          >
                            {report.status === "in-progress" ? "Active" : report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{report.description}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {report.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <TimeAgo date={report.timestamp} />
                          </span>
                        </div>
                      </div>
                      <Eye className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TeamContactModal({
  team,
  isOpen,
  onClose,
}: {
  team: Team | null
  isOpen: boolean
  onClose: () => void
}) {
  if (!team) return null

  const handlePhoneClick = () => {
    if (team.contactPhone) {
      window.location.href = `tel:${team.contactPhone}`
    }
  }

  const handleEmailClick = () => {
    if (team.contactEmail) {
      window.location.href = `mailto:${team.contactEmail}`
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{team.name}</DialogTitle>
          <DialogDescription>Contact Information</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Team Info */}
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Department</p>
              <p className="text-sm font-medium">{team.department}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Team Size</p>
              <p className="text-sm font-medium">{team.members} {team.members === 1 ? 'member' : 'members'}</p>
            </div>
            {team.description && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{team.description}</p>
              </div>
            )}
          </div>

          {/* Contact Methods */}
          <div className="space-y-2 pt-2 border-t">
            {team.contactPhone ? (
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3"
                onClick={handlePhoneClick}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{team.contactPhone}</p>
                  </div>
                </div>
              </Button>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded border bg-muted/50 opacity-60">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-xs text-muted-foreground">Not available</p>
                </div>
              </div>
            )}

            {team.contactEmail ? (
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3"
                onClick={handleEmailClick}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground truncate">{team.contactEmail}</p>
                  </div>
                </div>
              </Button>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded border bg-muted/50 opacity-60">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-xs text-muted-foreground">Not available</p>
                </div>
              </div>
            )}
          </div>

          {/* Active Jobs */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between p-3 rounded bg-primary/5">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Active Jobs</p>
                <p className="text-2xl font-bold text-primary">{team.activeJobs}</p>
              </div>
              <Activity className="h-8 w-8 text-primary/50" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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

export function AdminView({ reports, onStatusChange, onTeamAssigned, onRefresh, isRefreshing = false }: AdminViewProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard")
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const isMobile = useIsMobile()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | "all">("all")
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | "all">("all")
  const [selectedPriority, setSelectedPriority] = useState<ReportPriority | "all">("all")
  const [sortBy, setSortBy] = useState<"priority" | "date" | "status">("priority")
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })
  const [dateRangePreset, setDateRangePreset] = useState<"today" | "this-week" | "this-month" | "custom" | null>(null)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [selectedReports, setSelectedReports] = useState<string[]>([])
  const [mapReports, setMapReports] = useState<ReportFromDB[]>([])
  const [isLoadingMapReports, setIsLoadingMapReports] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)
  const [leafletModule, setLeafletModule] = useState<typeof import("leaflet") | null>(null)
  const [teams, setTeams] = useState<Team[]>(mockTeams) // Fallback to mock teams
  const [isLoadingTeams, setIsLoadingTeams] = useState(false)
  const [selectedTeamForTasks, setSelectedTeamForTasks] = useState<Team | null>(null)
  const [selectedTeamForContact, setSelectedTeamForContact] = useState<Team | null>(null)
  const [mapStatusFilter, setMapStatusFilter] = useState<ReportStatus | "all">("all")
  const [mapCategoryFilter, setMapCategoryFilter] = useState<ReportCategory | "all">("all")
  const [mapSeverityFilter, setMapSeverityFilter] = useState<"low" | "medium" | "high" | "all">("all")
  const [showMapFilters, setShowMapFilters] = useState(false)
  const [showMapStats, setShowMapStats] = useState(true)
  const [selectedMapReport, setSelectedMapReport] = useState<ReportFromDB | null>(null)
  const { user, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [isThemeMounted, setIsThemeMounted] = useState(false)

  // Settings state - load from localStorage on mount
  const [settings, setSettings] = useState<UserSettings>(() => {
    if (typeof window !== 'undefined') {
      return loadSettings()
    }
    return {
      notifications: {
        emailEnabled: true,
        pushEnabled: true,
        reportUpdates: true,
        teamAssignments: true,
        weeklyDigest: false,
      },
      preferences: {
        theme: "system",
        language: "en",
        timezone: "Africa/Freetown",
        itemsPerPage: 10,
      },
      data: {
        autoBackup: true,
        retentionDays: 90,
        exportFormat: "csv",
      },
    }
  })

  // Wait for theme to mount (prevents hydration mismatch)
  useEffect(() => {
    setIsThemeMounted(true)
  }, [])

  // Sync theme with next-themes on mount
  useEffect(() => {
    if (isThemeMounted && settings.preferences.theme && setTheme) {
      setTheme(settings.preferences.theme)
    }
  }, [isThemeMounted]) // Only run after theme is mounted

  // Update HTML lang attribute when language changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = settings.preferences.language
    }
  }, [settings.preferences.language])

  // Auto-assignment state
  const [autoAssignmentEnabled, setAutoAssignmentEnabledState] = useState(false)
  const [assignmentRules, setAssignmentRules] = useState<AssignmentRule[]>([])
  const [isLoadingRules, setIsLoadingRules] = useState(false)

  // 2FA state
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [twoFASecret, setTwoFASecret] = useState<string | null>(null)
  const [twoFAQRCode, setTwoFAQRCode] = useState<string | null>(null)
  const [twoFACode, setTwoFACode] = useState("")
  const [isVerifying2FA, setIsVerifying2FA] = useState(false)
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)

  // Saved Views state
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [showSaveViewDialog, setShowSaveViewDialog] = useState(false)
  const [newViewName, setNewViewName] = useState("")
  const [showSavedViewsMenu, setShowSavedViewsMenu] = useState(false)

  // Load auto-assignment settings on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAutoAssignmentEnabledState(isAutoAssignmentEnabled())
      setAssignmentRules(getAssignmentRules())
      setTwoFAEnabled(is2FAEnabled(user?.id))
      setSavedViews(getSavedViews())
    }
  }, [user?.id])

  // Function to apply a saved view
  const applySavedView = (view: SavedView) => {
    if (view.filters.status) setSelectedStatus(view.filters.status as ReportStatus | "all")
    if (view.filters.category) setSelectedCategory(view.filters.category as ReportCategory | "all")
    if (view.filters.priority) setSelectedPriority(view.filters.priority as ReportPriority | "all")
    if (view.filters.searchQuery) setSearchQuery(view.filters.searchQuery)
    if (view.filters.sortBy) setSortBy(view.filters.sortBy as "priority" | "date" | "status")
    
    toast({
      title: "View Applied",
      description: `Applied saved view: ${view.name}`,
      duration: 2000,
    })
  }

  // Function to save current view
  const handleSaveCurrentView = () => {
    if (!newViewName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for this view",
        variant: "destructive",
      })
      return
    }

    try {
      const view = saveView({
        name: newViewName.trim(),
        filters: {
          status: selectedStatus !== "all" ? selectedStatus : undefined,
          category: selectedCategory !== "all" ? selectedCategory : undefined,
          priority: selectedPriority !== "all" ? selectedPriority : undefined,
          searchQuery: searchQuery || undefined,
          sortBy: sortBy,
        },
      })
      
      setSavedViews(getSavedViews())
      setShowSaveViewDialog(false)
      setNewViewName("")
      
      toast({
        title: "View Saved",
        description: `Saved view "${view.name}" successfully`,
        duration: 2000,
      })
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save view",
        variant: "destructive",
      })
    }
  }

  // Function to delete a saved view
  const handleDeleteView = (viewId: string, viewName: string) => {
    try {
      deleteView(viewId)
      setSavedViews(getSavedViews())
      toast({
        title: "View Deleted",
        description: `Deleted view "${viewName}"`,
        duration: 2000,
      })
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete view",
        variant: "destructive",
      })
    }
  }

  // Handler to toggle auto-assignment
  const handleToggleAutoAssignment = (enabled: boolean) => {
    setAutoAssignmentEnabledState(enabled)
    setAutoAssignmentEnabled(enabled)
    toast({
      title: enabled ? "Auto-Assignment Enabled" : "Auto-Assignment Disabled",
      description: enabled 
        ? "Reports will be automatically assigned based on rules"
        : "Reports will require manual assignment",
      duration: 2000,
    })
  }

  // Handler to save assignment rules
  const handleSaveRules = () => {
    saveAssignmentRules(assignmentRules)
    toast({
      title: "Rules Saved",
      description: "Auto-assignment rules have been saved successfully",
      duration: 2000,
    })
  }

  // Handler to toggle a rule
  const handleToggleRule = (ruleId: string) => {
    setAssignmentRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ))
  }

  // Fetch teams from database on mount
  useEffect(() => {
    const loadTeams = async () => {
      setIsLoadingTeams(true)
      try {
        const dbTeams = await fetchAllTeams()
        if (dbTeams.length > 0) {
          const convertedTeams = dbTeams.map(convertTeamFromDB)
          setTeams(convertedTeams)
        } else {
          // Use mock teams if database is empty
          setTeams(mockTeams)
        }
      } catch (error) {
        console.error('Failed to load teams:', error)
        // Fallback to mock teams
        setTeams(mockTeams)
      } finally {
        setIsLoadingTeams(false)
      }
    }
    loadTeams()
  }, [])

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
  
  // Saved filter presets
  const applyFilterPreset = (preset: "my-assigned" | "overdue" | "high-priority" | "this-week" | "critical" | "today" | "this-month" | "pending") => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay()) // Sunday
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    switch (preset) {
      case "my-assigned":
        // Filter by assigned reports (in-progress status indicates assigned work)
        setSelectedStatus("in-progress")
        setSelectedPriority("all")
        setSelectedCategory("all")
        setSearchQuery("")
        setDateRange({ start: null, end: null })
        setDateRangePreset(null)
        break
      case "overdue":
        // Filter by reports older than 24 hours and still pending (likely overdue)
        setSelectedStatus("pending")
        setSelectedPriority("high")
        setSelectedCategory("all")
        setSearchQuery("")
        setSortBy("date") // Sort by date to show oldest first
        setDateRange({ start: null, end: null })
        setDateRangePreset(null)
        break
      case "high-priority":
        setSelectedStatus("all")
        setSelectedPriority("high")
        setSelectedCategory("all")
        setSearchQuery("")
        setSortBy("priority")
        setDateRange({ start: null, end: null })
        setDateRangePreset(null)
        break
      case "today":
        setSelectedStatus("all")
        setSelectedPriority("all")
        setSelectedCategory("all")
        setSearchQuery("")
        setSortBy("date")
        setDateRange({ start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) })
        setDateRangePreset("today")
        break
      case "this-week":
        setSelectedStatus("all")
        setSelectedPriority("all")
        setSelectedCategory("all")
        setSearchQuery("")
        setSortBy("date")
        setDateRange({ start: startOfWeek, end: new Date() })
        setDateRangePreset("this-week")
        break
      case "this-month":
        setSelectedStatus("all")
        setSelectedPriority("all")
        setSelectedCategory("all")
        setSearchQuery("")
        setSortBy("date")
        setDateRange({ start: startOfMonth, end: endOfMonth })
        setDateRangePreset("this-month")
        break
      case "critical":
        setSelectedStatus("all")
        setSelectedPriority("critical")
        setSelectedCategory("all")
        setSearchQuery("")
        setSortBy("priority")
        setDateRange({ start: null, end: null })
        setDateRangePreset(null)
        break
      case "pending":
        setSelectedStatus("pending")
        setSelectedPriority("all")
        setSelectedCategory("all")
        setSearchQuery("")
        setSortBy("priority")
        setDateRange({ start: null, end: null })
        setDateRangePreset(null)
        break
    }
    toast({
      title: "Filter Applied",
      description: `Applied "${preset.replace(/-/g, " ")}" filter preset`,
      duration: 2000,
    })
  }

  // SLA Configuration (hours) - defined early for use in calculateSLAStatus and useMemo hooks
  const slaConfig = {
    critical: 2,    // Critical: 2 hours
    high: 4,        // High: 4 hours
    medium: 24,     // Medium: 24 hours
    low: 72,        // Low: 72 hours
  }

  // Calculate SLA status for a report
  const calculateSLAStatus = (report: Report): {
    status: 'on-time' | 'warning' | 'breached'
    hoursRemaining: number | null
    hoursElapsed: number
    targetHours: number
  } => {
    if (report.status === "resolved") {
      return {
        status: 'on-time',
        hoursRemaining: null,
        hoursElapsed: 0,
        targetHours: 0,
      }
    }

    const reportPriority = report.priority || calculatePriority(report)
    const targetHours = slaConfig[reportPriority]
    const hoursElapsed = (Date.now() - report.timestamp.getTime()) / (1000 * 60 * 60)
    const hoursRemaining = targetHours - hoursElapsed
    const percentageUsed = (hoursElapsed / targetHours) * 100

    if (hoursRemaining < 0) {
      return { status: 'breached', hoursRemaining: 0, hoursElapsed, targetHours }
    } else if (percentageUsed >= 80) {
      return { status: 'warning', hoursRemaining, hoursElapsed, targetHours }
    } else {
      return { status: 'on-time', hoursRemaining, hoursElapsed, targetHours }
    }
  }
  
  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K - Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      }
      // Ctrl+F or Cmd+F - Focus filter (when on reports tab)
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && activeTab === "reports") {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      }
      // Ctrl+/ or Cmd+/ - Show keyboard shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault()
        setShowKeyboardShortcuts(true)
      }
      // Ctrl+S or Cmd+S - Save current view (prevent default save dialog)
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && activeTab === "reports") {
        e.preventDefault()
        toast({
          title: "View Saved",
          description: "Current filter settings saved as 'My View'",
          duration: 2000,
        })
      }
      // Esc - Close modals
      if (e.key === "Escape") {
        if (selectedReport) {
          setSelectedReport(null)
        }
        if (showKeyboardShortcuts) {
          setShowKeyboardShortcuts(false)
        }
      }
    }
    
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activeTab, selectedReport, showKeyboardShortcuts, toast])

  const totalReports = reports.length
  const resolvedReports = reports.filter((r) => r.status === "resolved").length
  const pendingReports = reports.filter((r) => r.status === "pending").length
  const inProgressReports = reports.filter((r) => r.status === "in-progress").length

  const pendingAlerts = reports.filter((r) => r.status === "pending")
  const completionRate = totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0

  // Category breakdown statistics
  const categoryStats = useMemo(() => {
    const stats = {
      sanitation: reports.filter(r => r.category === "sanitation").length,
      roads: reports.filter(r => r.category === "roads").length,
      water: reports.filter(r => r.category === "water").length,
      electrical: reports.filter(r => r.category === "electrical").length,
      other: reports.filter(r => r.category === "other").length,
    }
    return stats
  }, [reports])

  // Calculate average response time (time from pending to in-progress)
  const avgResponseTime = useMemo(() => {
    const resolved = reports.filter(r => r.status === "resolved" && r.resolvedAt)
    if (resolved.length === 0) return null
    
    const totalHours = resolved.reduce((sum, report) => {
      const resolvedAt = report.resolvedAt ? new Date(report.resolvedAt).getTime() : Date.now()
      const hours = (resolvedAt - report.timestamp.getTime()) / (1000 * 60 * 60)
      return sum + hours
    }, 0)
    
    return Math.round(totalHours / resolved.length * 10) / 10 // Round to 1 decimal
  }, [reports])

  // Recent activity (last 5 reports sorted by timestamp)
  const recentActivity = useMemo(() => {
    return [...reports]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5)
  }, [reports])

  // Calculate SLA compliance rate
  const slaCompliance = useMemo(() => {
    const resolved = reports.filter(r => r.status === "resolved" && r.resolvedAt)
    if (resolved.length === 0) return 100
    
    // For resolved reports, check if they were resolved within SLA
    let compliant = 0
    resolved.forEach(report => {
      const reportPriority = report.priority || calculatePriority(report)
      const targetHours = slaConfig[reportPriority]
      const resolvedAt = report.resolvedAt ? new Date(report.resolvedAt).getTime() : Date.now()
      const hoursElapsed = (resolvedAt - report.timestamp.getTime()) / (1000 * 60 * 60)
      
      if (hoursElapsed <= targetHours) {
        compliant++
      }
    })
    
    return Math.round((compliant / resolved.length) * 100)
  }, [reports])

  // Calculate trend (comparing last 7 days vs previous 7 days)
  const trendData = useMemo(() => {
    const now = Date.now()
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000)
    
    const recent = reports.filter(r => r.timestamp.getTime() >= sevenDaysAgo).length
    const previous = reports.filter(r => {
      const time = r.timestamp.getTime()
      return time >= fourteenDaysAgo && time < sevenDaysAgo
    }).length
    
    if (previous === 0) return { change: 0, isPositive: true }
    const change = Math.round(((recent - previous) / previous) * 100)
    return { change: Math.abs(change), isPositive: change >= 0 }
  }, [reports])

  // Priority calculation function
  // Auto-calculates priority based on severity + time since report
  const calculatePriority = (report: Report): ReportPriority => {
    // If report is resolved, priority is low
    if (report.status === "resolved") {
      return "low"
    }

    const hoursSinceReport = (Date.now() - report.timestamp.getTime()) / (1000 * 60 * 60)
    
    // Critical: High severity + >24 hours old, or High severity + >48 hours old
    if (report.severity === "high" && hoursSinceReport > 24) {
      return "critical"
    }
    if (report.severity === "high" && hoursSinceReport > 48) {
      return "critical"
    }
    
    // High: High severity, or Medium severity + >24 hours old
    if (report.severity === "high") {
      return "high"
    }
    if (report.severity === "medium" && hoursSinceReport > 24) {
      return "high"
    }
    
    // Medium: Medium severity, or Low severity + >48 hours old
    if (report.severity === "medium") {
      return "medium"
    }
    if (report.severity === "low" && hoursSinceReport > 48) {
      return "medium"
    }
    
    // Low: Everything else
    return "low"
  }

  // Add calculated priority to reports
  const reportsWithPriority = useMemo(() => {
    return reports.map(report => ({
      ...report,
      priority: report.priority || calculatePriority(report)
    }))
  }, [reports])

  // Priority statistics
  const priorityStats = useMemo(() => {
    return {
      critical: reportsWithPriority.filter(r => calculatePriority(r) === "critical").length,
      high: reportsWithPriority.filter(r => calculatePriority(r) === "high").length,
      medium: reportsWithPriority.filter(r => calculatePriority(r) === "medium").length,
      low: reportsWithPriority.filter(r => calculatePriority(r) === "low").length,
    }
  }, [reportsWithPriority])

  // Enhanced search functionality for reports with priority filtering and sorting
  const filteredReports = useMemo(() => {
    let filtered = reportsWithPriority

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((report) => {
        const matchesSearch =
          report.title.toLowerCase().includes(query) ||
          report.location.toLowerCase().includes(query) ||
          report.id.toLowerCase().includes(query) ||
          report.description.toLowerCase().includes(query) ||
          (report.assignedTo && report.assignedTo.toLowerCase().includes(query)) ||
          report.category.toLowerCase().includes(query) ||
          report.status.toLowerCase().includes(query) ||
          report.severity.toLowerCase().includes(query) ||
          (report.reportedBy && report.reportedBy.toLowerCase().includes(query)) ||
          (report.priority && report.priority.toLowerCase().includes(query))
        
        return matchesSearch
      })
    }

    // Apply status filter
    if (selectedStatus !== "all") {
      filtered = filtered.filter(report => report.status === selectedStatus)
    }

    // Apply category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(report => report.category === selectedCategory)
    }

    // Apply priority filter
    if (selectedPriority !== "all") {
      filtered = filtered.filter(report => {
        const reportPriority = report.priority || calculatePriority(report)
        return reportPriority === selectedPriority
      })
    }

    // Apply date range filter
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(report => {
        const reportTime = report.timestamp.getTime()
        const startTime = dateRange.start!.getTime()
        const endTime = dateRange.end!.getTime()
        return reportTime >= startTime && reportTime <= endTime
      })
    } else if (dateRange.start) {
      filtered = filtered.filter(report => report.timestamp.getTime() >= dateRange.start!.getTime())
    } else if (dateRange.end) {
      filtered = filtered.filter(report => report.timestamp.getTime() <= dateRange.end!.getTime())
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === "priority") {
        const priorityOrder: Record<ReportPriority, number> = {
          critical: 0,
          high: 1,
          medium: 2,
          low: 3
        }
        const aPriority = a.priority || calculatePriority(a)
        const bPriority = b.priority || calculatePriority(b)
        return priorityOrder[aPriority] - priorityOrder[bPriority]
      } else if (sortBy === "date") {
        return b.timestamp.getTime() - a.timestamp.getTime() // Newest first
      } else if (sortBy === "status") {
        const statusOrder: Record<ReportStatus, number> = {
          pending: 0,
          "in-progress": 1,
          resolved: 2
        }
        return statusOrder[a.status] - statusOrder[b.status]
      }
      return 0
    })

    return filtered
  }, [reportsWithPriority, searchQuery, selectedStatus, selectedCategory, selectedPriority, sortBy, dateRange])

  // Search functionality for teams
  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) {
      return teams
    }

    const query = searchQuery.toLowerCase().trim()
    return teams.filter((team) => {
      return (
        team.name.toLowerCase().includes(query) ||
        team.department.toLowerCase().includes(query) ||
        (team.contactEmail && team.contactEmail.toLowerCase().includes(query)) ||
        (team.contactPhone && team.contactPhone.toLowerCase().includes(query)) ||
        (team.description && team.description.toLowerCase().includes(query))
      )
    })
  }, [teams, searchQuery])


  // Export functions
  const exportReportsToCSV = () => {
    try {
      // CSV Headers
      const headers = [
        'ID',
        'Title',
        'Location',
        'Category',
        'Status',
        'Severity',
        'Description',
        'Reported By',
        'Assigned To',
        'Timestamp',
        'Resolved At',
        'Image URL'
      ]

      // Convert reports to CSV rows
      const csvRows = filteredReports.map((report) => {
        return [
          report.id,
          `"${report.title.replace(/"/g, '""')}"`,
          `"${report.location.replace(/"/g, '""')}"`,
          report.category,
          report.status,
          report.severity,
          `"${report.description.replace(/"/g, '""')}"`,
          report.reportedBy || '',
          report.assignedTo || '',
          report.timestamp.toISOString(),
          report.resolvedAt ? report.resolvedAt.toISOString() : '',
          report.imageUrl || ''
        ]
      })

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `salonefix-reports-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Export Successful",
        description: `Exported ${filteredReports.length} reports to CSV`,
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: "Export Failed",
        description: "Failed to export reports. Please try again.",
        variant: "destructive",
      })
    }
  }

  const exportReportsToJSON = () => {
    try {
      // Convert reports to JSON format
      const jsonData = filteredReports.map((report) => ({
        id: report.id,
        title: report.title,
        location: report.location,
        category: report.category,
        status: report.status,
        severity: report.severity,
        description: report.description,
        reportedBy: report.reportedBy || null,
        assignedTo: report.assignedTo || null,
        timestamp: report.timestamp.toISOString(),
        resolvedAt: report.resolvedAt ? report.resolvedAt.toISOString() : null,
        imageUrl: report.imageUrl || null,
        activityLog: report.activityLog?.map(log => ({
          id: log.id,
          action: log.action,
          user: log.user,
          timestamp: log.timestamp.toISOString(),
          details: log.details || null
        })) || []
      }))

      // Create blob and download
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `salonefix-reports-${new Date().toISOString().split('T')[0]}.json`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Export Successful",
        description: `Exported ${filteredReports.length} reports to JSON`,
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: "Export Failed",
        description: "Failed to export reports. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleExport = () => {
    if (filteredReports.length === 0) {
      toast({
        title: "No Reports to Export",
        description: "There are no reports matching your current filters.",
        variant: "destructive",
      })
      return
    }

    // Use export format from settings, default to CSV
    const exportFormat = settings.data.exportFormat || 'csv'
    
    if (exportFormat === 'json') {
      exportReportsToJSON()
    } else {
      exportReportsToCSV()
    }
  }

  // Pagination for reports table - use itemsPerPage from settings
  const { paginatedItems: paginatedReports, currentPage, totalPages, goToPage, totalItems } = usePagination(
    filteredReports,
    settings.preferences.itemsPerPage
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

    // Time-based analytics (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      date.setHours(0, 0, 0, 0)
      return date
    })

    const reportsByDay = last7Days.map(date => {
      const dayStart = new Date(date)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)
      
      const dayReports = reports.filter(r => {
        const reportDate = new Date(r.timestamp)
        return reportDate >= dayStart && reportDate <= dayEnd
      })
      
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        reports: dayReports.length,
        resolved: dayReports.filter(r => r.status === 'resolved').length,
      }
    })

    // Team performance analytics
    const teamPerformance = teams.map(team => {
      const teamReports = reports.filter(r => r.assignedTo === team.name)
      const resolved = teamReports.filter(r => r.status === 'resolved').length
      const completionRate = teamReports.length > 0 ? Math.round((resolved / teamReports.length) * 100) : 0
      
      return {
        name: team.name,
        total: teamReports.length,
        resolved,
        completionRate,
        active: teamReports.filter(r => r.status === 'in-progress').length,
        pending: teamReports.filter(r => r.status === 'pending').length,
      }
    }).sort((a, b) => b.total - a.total)

    // Status distribution
    const byStatus = {
      pending: reports.filter(r => r.status === 'pending').length,
      inProgress: reports.filter(r => r.status === 'in-progress').length,
      resolved: reports.filter(r => r.status === 'resolved').length,
    }

    // Average response time (simulated based on resolved reports)
    const resolvedReports = reports.filter(r => r.status === 'resolved' && r.resolvedAt)
    const avgResponseTime = resolvedReports.length > 0
      ? resolvedReports.reduce((sum, r) => {
          const timeDiff = r.resolvedAt!.getTime() - r.timestamp.getTime()
          return sum + (timeDiff / (1000 * 60 * 60)) // Convert to hours
        }, 0) / resolvedReports.length
      : 0

    // Category performance
    const categoryPerformance = Object.keys(byCategory).map(category => {
      const categoryReports = reports.filter(r => r.category === category)
      const resolved = categoryReports.filter(r => r.status === 'resolved').length
      return {
        category,
        total: categoryReports.length,
        resolved,
        completionRate: categoryReports.length > 0 ? Math.round((resolved / categoryReports.length) * 100) : 0,
      }
    }).sort((a, b) => b.total - a.total)

    return {
      byCategory,
      bySeverity,
      byStatus,
      reportsByDay,
      teamPerformance,
      categoryPerformance,
      avgResponseTime,
    }
  }, [reports, teams])

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

  // Filter map reports based on selected filters and search query
  const filteredMapReports = useMemo(() => {
    return mapReports.filter((report) => {
      const matchesStatus = mapStatusFilter === "all" || report.status?.toLowerCase() === mapStatusFilter.toLowerCase()
      const matchesCategory = mapCategoryFilter === "all" || report.category?.toLowerCase() === mapCategoryFilter.toLowerCase()
      const matchesSeverity = mapSeverityFilter === "all" || report.severity?.toLowerCase() === mapSeverityFilter.toLowerCase()
      
      // Add search functionality for map tab
      let matchesSearch = true
      if (searchQuery.trim() && activeTab === "map") {
        const query = searchQuery.toLowerCase().trim()
        // ReportFromDB doesn't have title/location directly, search in available fields
        const reportTitle = report.category || report.description?.substring(0, 50) || ''
        const reportLocation = report.latitude && report.longitude
          ? `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`
          : ''
        matchesSearch = (
          reportTitle.toLowerCase().includes(query) ||
          reportLocation.toLowerCase().includes(query) ||
          report.id?.toLowerCase().includes(query) ||
          (report.description || '')?.toLowerCase().includes(query) ||
          (report.category || '')?.toLowerCase().includes(query) ||
          (report.status || '')?.toLowerCase().includes(query) ||
          (report.severity || '')?.toLowerCase().includes(query) ||
          (report.assigned_to || '')?.toLowerCase().includes(query)
        )
      }
      
      return matchesStatus && matchesCategory && matchesSeverity && matchesSearch
    })
  }, [mapReports, mapStatusFilter, mapCategoryFilter, mapSeverityFilter, searchQuery, activeTab])

  // Map statistics
  const mapStats = useMemo(() => {
    const stats = {
      total: filteredMapReports.length,
      pending: filteredMapReports.filter((r) => r.status?.toLowerCase() === "pending").length,
      inProgress: filteredMapReports.filter((r) => r.status?.toLowerCase() === "in-progress").length,
      resolved: filteredMapReports.filter((r) => r.status?.toLowerCase() === "resolved").length,
      high: filteredMapReports.filter((r) => r.severity?.toLowerCase() === "high").length,
      medium: filteredMapReports.filter((r) => r.severity?.toLowerCase() === "medium").length,
      low: filteredMapReports.filter((r) => r.severity?.toLowerCase() === "low").length,
    }
    return stats
  }, [filteredMapReports])

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
    <div className="flex min-h-screen bg-muted/30 w-full max-w-full overflow-x-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
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

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 flex-col border-r border-sidebar-border bg-sidebar z-50 lg:hidden transform transition-transform duration-300 ease-in-out",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-lg font-bold text-sidebar-foreground">SaloneFix</span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">Admin Panel</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setActiveTab(item.tab)
                setIsMobileSidebarOpen(false)
              }}
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
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={
                  activeTab === "teams" 
                    ? "Search teams..." 
                    : activeTab === "map"
                    ? "Search incidents..."
                    : activeTab === "analytics"
                    ? "Search analytics..."
                    : "Search reports..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  // Clear search on Escape key
                  if (e.key === "Escape") {
                    setSearchQuery("")
                  }
                  // Focus search with Ctrl+K or Cmd+K
                  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                    e.preventDefault()
                    e.currentTarget.focus()
                  }
                }}
                className="pl-9 pr-9 bg-muted/50"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-transparent"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </Button>
              )}
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="hidden sm:flex gap-2 bg-transparent"
              onClick={handleExport}
            >
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
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-6 w-full max-w-full">
          {activeTab === "dashboard" && (
            <>
              {/* Page Header */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Overview</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Monitor and manage all reports in real-time
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                    disabled={isRefreshing || !onRefresh}
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("reports")}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View All Reports
                  </Button>
                </div>
              </div>

              {/* Enhanced Stats Cards */}
              <div
                className={cn(
                  "mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4 transition-all duration-500",
                  isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
                )}
              >
                <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-primary">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/2 to-transparent" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Reports</CardTitle>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
                      <FileText className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="text-4xl font-bold text-card-foreground mb-2">
                      <AnimatedNumber value={totalReports} />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {trendData.isPositive ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                      <span className={cn(
                        "text-xs font-semibold",
                        trendData.isPositive ? "text-success" : "text-destructive"
                      )}>
                        {trendData.isPositive ? "+" : "-"}{trendData.change}%
                      </span>
                      <span className="text-xs text-muted-foreground">vs last week</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-success">
                  <div className="absolute inset-0 bg-gradient-to-br from-success/5 via-success/2 to-transparent" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success shadow-sm">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="text-4xl font-bold text-card-foreground mb-2">
                      <AnimatedNumber value={resolvedReports} />
                    </div>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Completion Rate</span>
                        <span className="text-xs font-semibold text-success">{completionRate}%</span>
                      </div>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-success to-success/80 rounded-full transition-all duration-1000 ease-out shadow-sm"
                          style={{ width: isLoaded ? `${completionRate}%` : "0%" }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-info">
                  <div className="absolute inset-0 bg-gradient-to-br from-info/5 via-info/2 to-transparent" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info/10 text-info shadow-sm">
                      <Clock className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="text-4xl font-bold text-card-foreground mb-2">
                      <AnimatedNumber value={inProgressReports} />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Activity className="h-3.5 w-3.5 text-info" />
                      <span className="text-xs text-muted-foreground">Being addressed</span>
                    </div>
                    {avgResponseTime && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Avg Response</span>
                          <span className="text-xs font-semibold text-info">{avgResponseTime}h</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-warning">
                  <div className="absolute inset-0 bg-gradient-to-br from-warning/5 via-warning/2 to-transparent" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning shadow-sm">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="text-4xl font-bold text-card-foreground mb-2">
                      <AnimatedNumber value={pendingReports} />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="h-3.5 w-3.5 text-warning" />
                      <span className="text-xs text-muted-foreground">Awaiting review</span>
                    </div>
                    {priorityStats.critical > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Critical</span>
                          <Badge variant="destructive" className="text-xs px-2 py-0">
                            {priorityStats.critical}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Priority Overview & Quick Actions */}
              <div className="grid gap-6 lg:grid-cols-3 mb-6">
                {/* Priority Overview */}
                <Card className="lg:col-span-2 border-2 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        Priority Overview
                      </CardTitle>
                      <CardDescription className="mt-1">Reports requiring immediate attention</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveTab("reports")
                        setSelectedPriority("critical")
                      }}
                      className="text-xs"
                    >
                      View All
                      <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="flex flex-col items-center p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border-2 border-red-500/20 hover:border-red-500/40 transition-all cursor-pointer group"
                        onClick={() => {
                          setActiveTab("reports")
                          setSelectedPriority("critical")
                        }}>
                        <div className="p-2 rounded-lg bg-red-500/20 mb-2 group-hover:scale-110 transition-transform">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="text-3xl font-bold text-red-600 mb-1">{priorityStats.critical}</div>
                        <div className="text-xs font-medium text-muted-foreground">Critical</div>
                        {priorityStats.critical > 0 && (
                          <Badge variant="destructive" className="mt-2 text-[10px] px-1.5 py-0 animate-pulse">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col items-center p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-2 border-orange-500/20 hover:border-orange-500/40 transition-all cursor-pointer group"
                        onClick={() => {
                          setActiveTab("reports")
                          setSelectedPriority("high")
                        }}>
                        <div className="p-2 rounded-lg bg-orange-500/20 mb-2 group-hover:scale-110 transition-transform">
                          <Zap className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="text-3xl font-bold text-orange-600 mb-1">{priorityStats.high}</div>
                        <div className="text-xs font-medium text-muted-foreground">High</div>
                      </div>
                      <div className="flex flex-col items-center p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-2 border-yellow-500/20 hover:border-yellow-500/40 transition-all cursor-pointer group"
                        onClick={() => {
                          setActiveTab("reports")
                          setSelectedPriority("medium")
                        }}>
                        <div className="p-2 rounded-lg bg-yellow-500/20 mb-2 group-hover:scale-110 transition-transform">
                          <Clock className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div className="text-3xl font-bold text-yellow-600 mb-1">{priorityStats.medium}</div>
                        <div className="text-xs font-medium text-muted-foreground">Medium</div>
                      </div>
                      <div className="flex flex-col items-center p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-2 border-blue-500/20 hover:border-blue-500/40 transition-all cursor-pointer group"
                        onClick={() => {
                          setActiveTab("reports")
                          setSelectedPriority("low")
                        }}>
                        <div className="p-2 rounded-lg bg-blue-500/20 mb-2 group-hover:scale-110 transition-transform">
                          <CheckCircle2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="text-3xl font-bold text-blue-600 mb-1">{priorityStats.low}</div>
                        <div className="text-xs font-medium text-muted-foreground">Low</div>
                      </div>
                    </div>
                    {priorityStats.critical > 0 && (
                      <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-red-500/5 border-2 border-red-500/20 flex items-center gap-3 animate-pulse">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-600">
                            {priorityStats.critical} critical {priorityStats.critical === 1 ? 'report' : 'reports'} require immediate attention
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">These reports are overdue or high severity</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => {
                            setActiveTab("reports")
                            setSelectedPriority("critical")
                          }}
                        >
                          View Critical
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions & SLA */}
                <Card className="border-2 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Performance Metrics
                    </CardTitle>
                    <CardDescription>SLA compliance and response times</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">SLA Compliance</span>
                        <span className={cn(
                          "text-lg font-bold",
                          slaCompliance >= 95 ? "text-success" : slaCompliance >= 80 ? "text-warning" : "text-destructive"
                        )}>
                          {slaCompliance}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            slaCompliance >= 95 ? "bg-success" : slaCompliance >= 80 ? "bg-warning" : "bg-destructive"
                          )}
                          style={{ width: `${slaCompliance}%` }}
                        />
                      </div>
                    </div>
                    {avgResponseTime && (
                      <div className="pt-3 border-t border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Avg Response Time</span>
                          <span className="text-lg font-bold text-info">{avgResponseTime}h</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Time to resolution</p>
                      </div>
                    )}
                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Quick Actions</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs"
                          onClick={() => {
                            setActiveTab("reports")
                            setSelectedStatus("pending")
                          }}
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Pending
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs"
                          onClick={() => {
                            setActiveTab("reports")
                            setSelectedStatus("in-progress")
                          }}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Active
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs"
                          onClick={() => {
                            setActiveTab("analytics")
                          }}
                        >
                          <BarChart3 className="h-3 w-3 mr-1" />
                          Analytics
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs"
                          onClick={() => {
                            setActiveTab("map")
                          }}
                        >
                          <Map className="h-3 w-3 mr-1" />
                          Map View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Category Breakdown & Recent Activity */}
              <div className="grid gap-6 lg:grid-cols-3 mb-6">
                {/* Category Breakdown */}
                <Card className="lg:col-span-2 border-2 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart2 className="h-5 w-5 text-primary" />
                        Category Breakdown
                      </CardTitle>
                      <CardDescription className="mt-1">Reports by category</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab("analytics")}>
                      View Analytics
                      <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {[
                        { key: 'sanitation', label: 'Sanitation', icon: Trash2, color: 'orange' },
                        { key: 'roads', label: 'Roads', icon: MapPin, color: 'amber' },
                        { key: 'water', label: 'Water', icon: Droplets, color: 'blue' },
                        { key: 'electrical', label: 'Electrical', icon: Zap, color: 'yellow' },
                        { key: 'other', label: 'Other', icon: FileText, color: 'gray' },
                      ].map(({ key, label, icon: Icon, color }) => {
                        const count = categoryStats[key as keyof typeof categoryStats]
                        const percentage = totalReports > 0 ? Math.round((count / totalReports) * 100) : 0
                        const colorClasses = {
                          orange: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
                          amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                          blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                          yellow: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
                          gray: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
                        }
                        
                        return (
                          <div
                            key={key}
                            className="flex flex-col items-center p-4 rounded-xl border-2 hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => {
                              setActiveTab("reports")
                              setSelectedCategory(key as ReportCategory)
                            }}
                          >
                            <div className={cn(
                              "p-2 rounded-lg mb-2 group-hover:scale-110 transition-transform",
                              colorClasses[color as keyof typeof colorClasses]
                            )}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="text-2xl font-bold mb-1">{count}</div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-1000",
                                  color === 'orange' ? 'bg-orange-500' :
                                  color === 'amber' ? 'bg-amber-500' :
                                  color === 'blue' ? 'bg-blue-500' :
                                  color === 'yellow' ? 'bg-yellow-500' : 'bg-gray-500'
                                )}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1">{percentage}%</div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="border-2 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Recent Activity
                      </CardTitle>
                      <CardDescription className="mt-1">Latest report submissions</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab("reports")}>
                      View All
                      <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Button>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3 overflow-auto max-h-[400px]">
                    {recentActivity.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-2">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No recent activity</p>
                        <p className="text-xs text-muted-foreground mt-1">Reports will appear here</p>
                      </div>
                    ) : (
                      recentActivity.map((report, index) => (
                        <div
                          key={report.id}
                          onClick={() => setSelectedReport(report)}
                          className={cn(
                            "flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-all duration-200",
                            "hover:bg-muted/50 hover:border-primary/20 hover:shadow-sm cursor-pointer group"
                          )}
                        >
                          <div className={cn(
                            "h-2 w-2 rounded-full flex-shrink-0 mt-2",
                            report.status === "pending" && "bg-warning",
                            report.status === "in-progress" && "bg-info",
                            report.status === "resolved" && "bg-success",
                          )} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm text-card-foreground truncate">{report.title}</span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] px-1.5 py-0",
                                  report.severity === "high" && "bg-destructive/10 text-destructive border-destructive/20",
                                  report.severity === "medium" && "bg-warning/10 text-warning border-warning/20",
                                  report.severity === "low" && "bg-muted text-muted-foreground",
                                )}
                              >
                                {report.severity}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mb-1">{report.location}</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <TimeAgo date={report.timestamp} />
                              <span>•</span>
                              <span className="capitalize">{report.category}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedReport(report)
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Incoming Alerts */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="flex flex-col border-2 shadow-sm">
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
                      pendingAlerts.slice(0, 5).map((alert, index) => (
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
            <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
              {/* Enhanced Header */}
              <div className="flex flex-col gap-4 w-full max-w-full overflow-x-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full min-w-0">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground break-words">Reports Management</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 break-words">
                      {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'} found
                      {selectedReports.length > 0 && (
                        <span className="ml-2 text-primary font-medium whitespace-nowrap">
                          • {selectedReports.length} selected
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                    {selectedReports.length > 0 && (
                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap px-2 sm:px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg max-w-full overflow-hidden">
                        <span className="text-xs sm:text-sm font-medium text-primary whitespace-nowrap flex-shrink-0">{selectedReports.length} selected</span>
                        <Separator orientation="vertical" className="h-4 hidden sm:block flex-shrink-0" />
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button size="sm" variant="ghost" className="h-7 text-xs px-1.5 sm:px-2 flex-shrink-0 touch-manipulation" onClick={() => handleBulkStatusChange("in-progress")}>
                            <Clock className="h-3.5 w-3.5 sm:mr-1.5 flex-shrink-0" />
                            <span className="hidden sm:inline">Mark Active</span>
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs px-1.5 sm:px-2 flex-shrink-0 touch-manipulation" onClick={() => handleBulkStatusChange("resolved")}>
                            <CheckCircle2 className="h-3.5 w-3.5 sm:mr-1.5 flex-shrink-0" />
                            <span className="hidden sm:inline">Mark Resolved</span>
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 flex-shrink-0 touch-manipulation" onClick={() => setSelectedReports([])}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={onRefresh}
                      disabled={isRefreshing || !onRefresh}
                      className="flex-shrink-0 touch-manipulation"
                    >
                      <RefreshCw className={cn("h-4 w-4 sm:mr-2 flex-shrink-0", isRefreshing && "animate-spin")} />
                      <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
                    </Button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative w-full max-w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    placeholder={isMobile ? "Search reports..." : "Search reports by title, location, ID, category, or description..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 h-11 text-sm touch-manipulation w-full max-w-full"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 touch-manipulation flex-shrink-0"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Filters Section */}
              <Card className="border-2 w-full max-w-full overflow-hidden">
                <CardHeader className="pb-3 px-3 sm:px-6">
                  <div className="flex items-center justify-between gap-2 w-full min-w-0">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2 min-w-0 flex-1">
                      <Filter className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Filters & Views</span>
                    </CardTitle>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      {isMobile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowFilters(!showFilters)}
                          className="text-xs h-7 w-7 p-0 touch-manipulation"
                        >
                          {showFilters ? <X className="h-3 w-3" /> : <Filter className="h-3 w-3" />}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedStatus("all")
                          setSelectedCategory("all")
                          setSelectedPriority("all")
                          setSearchQuery("")
                          setDateRange({ start: null, end: null })
                          setDateRangePreset(null)
                        }}
                        className="text-xs h-7 px-2 touch-manipulation"
                      >
                        <X className="h-3 w-3 sm:mr-1 flex-shrink-0" />
                        <span className="hidden sm:inline">Clear All</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className={cn("space-y-4 px-3 sm:px-6 pb-3 sm:pb-6 w-full max-w-full overflow-hidden", isMobile && !showFilters && "hidden")}>
                  {/* Quick Filter Presets */}
                  <div className="w-full max-w-full overflow-hidden">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Quick Filters</Label>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full">
                      <Button
                        variant={selectedPriority === "critical" && selectedStatus === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => applyFilterPreset("critical")}
                        className="text-xs h-8 touch-manipulation"
                      >
                        <AlertTriangle className="h-3 w-3 sm:mr-1.5" />
                        <span className="hidden sm:inline">Critical Only</span>
                        <span className="sm:hidden">Critical</span>
                      </Button>
                      <Button
                        variant={selectedPriority === "high" && selectedStatus === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => applyFilterPreset("high-priority")}
                        className="text-xs h-8 touch-manipulation"
                      >
                        <Zap className="h-3 w-3 sm:mr-1.5" />
                        <span className="hidden sm:inline">High Priority</span>
                        <span className="sm:hidden">High</span>
                      </Button>
                      <Button
                        variant={selectedStatus === "pending" && selectedPriority === "high" ? "default" : "outline"}
                        size="sm"
                        onClick={() => applyFilterPreset("overdue")}
                        className="text-xs h-8 touch-manipulation"
                      >
                        <Clock className="h-3 w-3 sm:mr-1.5" />
                        Overdue
                      </Button>
                      <Button
                        variant={selectedStatus === "in-progress" ? "default" : "outline"}
                        size="sm"
                        onClick={() => applyFilterPreset("my-assigned")}
                        className="text-xs h-8 touch-manipulation"
                      >
                        <Users className="h-3 w-3 sm:mr-1.5" />
                        <span className="hidden sm:inline">My Assigned</span>
                        <span className="sm:hidden">Mine</span>
                      </Button>
                      <Button
                        variant={dateRangePreset === "today" ? "default" : "outline"}
                        size="sm"
                        onClick={() => applyFilterPreset("today")}
                        className="text-xs h-8 touch-manipulation"
                      >
                        <Calendar className="h-3 w-3 sm:mr-1.5" />
                        Today
                      </Button>
                      <Button
                        variant={dateRangePreset === "this-week" ? "default" : "outline"}
                        size="sm"
                        onClick={() => applyFilterPreset("this-week")}
                        className="text-xs h-8 touch-manipulation"
                      >
                        <Calendar className="h-3 w-3 sm:mr-1.5" />
                        <span className="hidden sm:inline">This Week</span>
                        <span className="sm:hidden">Week</span>
                      </Button>
                      <Button
                        variant={dateRangePreset === "this-month" ? "default" : "outline"}
                        size="sm"
                        onClick={() => applyFilterPreset("this-month")}
                        className="text-xs h-8 touch-manipulation"
                      >
                        <Calendar className="h-3 w-3 sm:mr-1.5" />
                        <span className="hidden sm:inline">This Month</span>
                        <span className="sm:hidden">Month</span>
                      </Button>
                {dateRangePreset && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {dateRangePreset === "today" && "Today"}
                    {dateRangePreset === "this-week" && "This Week"}
                    {dateRangePreset === "this-month" && "This Month"}
                  </Badge>
                )}
                    </div>
                  </div>

                  {/* Status Filters */}
                  <div className="w-full max-w-full overflow-hidden">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Status</Label>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full">
                      <Button
                        variant={selectedStatus === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedStatus("all")}
                        className="h-8 touch-manipulation"
                      >
                        All
                        <Badge variant="secondary" className="ml-1.5 sm:ml-2">
                          {reports.length}
                        </Badge>
                      </Button>
                      <Button
                        variant={selectedStatus === "pending" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedStatus("pending")}
                        className={cn("h-8 touch-manipulation", selectedStatus === "pending" && "bg-warning text-warning-foreground")}
                      >
                        Pending
                        <Badge variant="secondary" className="ml-1.5 sm:ml-2">
                          {pendingReports}
                        </Badge>
                      </Button>
                      <Button
                        variant={selectedStatus === "in-progress" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedStatus("in-progress")}
                        className={cn("h-8 touch-manipulation", selectedStatus === "in-progress" && "bg-info text-info-foreground")}
                      >
                        Active
                        <Badge variant="secondary" className="ml-1.5 sm:ml-2">
                          {inProgressReports}
                        </Badge>
                      </Button>
                      <Button
                        variant={selectedStatus === "resolved" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedStatus("resolved")}
                        className={cn("h-8 touch-manipulation", selectedStatus === "resolved" && "bg-success text-success-foreground")}
                      >
                        Resolved
                        <Badge variant="secondary" className="ml-1.5 sm:ml-2">
                          {resolvedReports}
                        </Badge>
                      </Button>
                    </div>
                  </div>

                  {/* Priority Filters */}
                  <div className="w-full max-w-full overflow-hidden">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Priority</Label>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full">
                      <Button
                        variant={selectedPriority === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPriority("all")}
                        className="h-8 touch-manipulation"
                      >
                        All
                      </Button>
                      <Button
                        variant={selectedPriority === "critical" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPriority("critical")}
                        className={cn("h-8 touch-manipulation", selectedPriority === "critical" && "bg-red-500 text-white hover:bg-red-600")}
                      >
                        <AlertTriangle className="h-3.5 w-3.5 sm:mr-1.5" />
                        Critical
                        <Badge variant="secondary" className="ml-1.5 sm:ml-2">
                          {priorityStats.critical}
                        </Badge>
                      </Button>
                      <Button
                        variant={selectedPriority === "high" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPriority("high")}
                        className={cn("h-8 touch-manipulation", selectedPriority === "high" && "bg-orange-500 text-white hover:bg-orange-600")}
                      >
                        <Zap className="h-3.5 w-3.5 sm:mr-1.5" />
                        High
                        <Badge variant="secondary" className="ml-1.5 sm:ml-2">
                          {priorityStats.high}
                        </Badge>
                      </Button>
                      <Button
                        variant={selectedPriority === "medium" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPriority("medium")}
                        className={cn("h-8 touch-manipulation", selectedPriority === "medium" && "bg-yellow-500 text-white hover:bg-yellow-600")}
                      >
                        <Clock className="h-3.5 w-3.5 sm:mr-1.5" />
                        Medium
                        <Badge variant="secondary" className="ml-1.5 sm:ml-2">
                          {priorityStats.medium}
                        </Badge>
                      </Button>
                      <Button
                        variant={selectedPriority === "low" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPriority("low")}
                        className={cn("h-8 touch-manipulation", selectedPriority === "low" && "bg-blue-500 text-white hover:bg-blue-600")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 sm:mr-1.5" />
                        Low
                        <Badge variant="secondary" className="ml-1.5 sm:ml-2">
                          {priorityStats.low}
                        </Badge>
                      </Button>
                    </div>
                  </div>

                  {/* Category Filters */}
                  <div className="w-full max-w-full overflow-hidden">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Category</Label>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full">
                      <Button
                        variant={selectedCategory === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory("all")}
                        className="text-xs h-8 touch-manipulation"
                      >
                        All
                      </Button>
                      {(["sanitation", "roads", "water", "electrical", "other"] as ReportCategory[]).map((category) => (
                        <Button
                          key={category}
                          variant={selectedCategory === category ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedCategory(category)}
                          className="text-xs capitalize h-8 touch-manipulation"
                        >
                          {category}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Sort & Saved Views */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t w-full max-w-full overflow-hidden">
                    <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap flex-shrink-0">Sort:</Label>
                      <Select value={sortBy} onValueChange={(value: "priority" | "date" | "status") => setSortBy(value)}>
                        <SelectTrigger className="flex-1 sm:w-[140px] h-8 text-xs min-w-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="priority">Priority</SelectItem>
                          <SelectItem value="date">Date (Newest)</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DropdownMenu open={showSavedViewsMenu} onOpenChange={setShowSavedViewsMenu}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="text-xs h-8 w-full sm:w-auto min-w-0 flex-shrink-0">
                          <Save className="h-3 w-3 mr-1.5 flex-shrink-0" />
                          <span className="hidden sm:inline truncate">Saved Views</span>
                          <span className="sm:hidden truncate">Views</span>
                          {savedViews.length > 0 && (
                            <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px] flex-shrink-0">
                              {savedViews.length}
                            </Badge>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => setShowSaveViewDialog(true)}>
                          <Save className="h-4 w-4 mr-2" />
                          Save Current View
                        </DropdownMenuItem>
                        {savedViews.length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            {savedViews.map((view) => (
                              <DropdownMenuItem
                                key={view.id}
                                onClick={() => {
                                  applySavedView(view)
                                  setShowSavedViewsMenu(false)
                                }}
                                className="flex items-center justify-between"
                              >
                                <span className="truncate flex-1">{view.name}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteView(view.id, view.name)
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </DropdownMenuItem>
                            ))}
                          </>
                        )}
                        {savedViews.length === 0 && (
                          <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                            No saved views yet
                          </div>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>

              {/* Reports Table - Desktop View */}
              {!isMobile ? (
                <Card className="border-2 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-4 w-12">
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
                        <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ID</th>
                        <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Priority</th>
                        <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">SLA</th>
                        <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Report</th>
                        <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Location</th>
                        <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</th>
                        <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Severity</th>
                        <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                        <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned</th>
                        <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedReports.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="p-12 text-center">
                            <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No reports found</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedReports.map((report) => {
                          const reportPriority = report.priority || calculatePriority(report)
                          const slaStatus = calculateSLAStatus(report)
                          
                          // Helper function to cycle priority
                          const cyclePriority = () => {
                            const priorityOrder: ReportPriority[] = ["critical", "high", "medium", "low"]
                            const currentIndex = priorityOrder.indexOf(reportPriority)
                            const nextIndex = (currentIndex + 1) % priorityOrder.length
                            updateReportPriority(report.id, priorityOrder[nextIndex], "Admin").catch((error) => {
                              console.error("Priority update error:", error)
                              toast({
                                title: "Error",
                                description: "Failed to update priority",
                                variant: "destructive",
                              })
                            })
                          }
                          
                          return (
                          <ContextMenu key={report.id}>
                            <ContextMenuTrigger asChild>
                              <tr
                                className={cn(
                                  "border-b hover:bg-muted/50 transition-all duration-200 cursor-pointer group",
                                  selectedReports.includes(report.id) && "bg-primary/5 border-primary/20",
                                  reportPriority === "critical" && "bg-red-500/5"
                                )}
                                onClick={() => setSelectedReport(report)}
                              >
                            <td className="p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="rounded border-border cursor-pointer"
                                checked={selectedReports.includes(report.id)}
                                onChange={() => toggleSelectReport(report.id)}
                              />
                            </td>
                            <td className="p-3 sm:p-4">
                              <span className="text-xs font-mono font-semibold text-muted-foreground">#{report.id.slice(0, 8)}</span>
                            </td>
                            <td className="p-3 sm:p-4">
                              <PriorityBadge priority={reportPriority} />
                            </td>
                            <td className="p-3 sm:p-4">
                              {report.status !== "resolved" ? (
                                <div className="flex flex-col gap-1.5 min-w-[120px]">
                                  <div className={cn(
                                    "flex items-center gap-1.5 text-xs font-semibold",
                                    slaStatus.status === 'breached' && "text-red-600",
                                    slaStatus.status === 'warning' && "text-orange-600",
                                    slaStatus.status === 'on-time' && "text-green-600"
                                  )}>
                                    {slaStatus.status === 'breached' && <AlertTriangle className="h-3.5 w-3.5" />}
                                    {slaStatus.status === 'warning' && <Clock className="h-3.5 w-3.5" />}
                                    {slaStatus.status === 'on-time' && <CheckCircle2 className="h-3.5 w-3.5" />}
                                    {slaStatus.hoursRemaining !== null && slaStatus.hoursRemaining > 0 ? (
                                      <span>{Math.round(slaStatus.hoursRemaining)}h left</span>
                                    ) : (
                                      <span className="animate-pulse">Breached</span>
                                    )}
                                  </div>
                                  {/* Visual Progress Bar */}
                                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all duration-300",
                                        slaStatus.status === 'breached' && "bg-red-500",
                                        slaStatus.status === 'warning' && "bg-orange-500",
                                        slaStatus.status === 'on-time' && "bg-green-500"
                                      )}
                                      style={{
                                        width: slaStatus.hoursRemaining !== null && slaStatus.targetHours > 0
                                          ? `${Math.max(0, Math.min(100, (slaStatus.hoursRemaining / slaStatus.targetHours) * 100))}%`
                                          : '0%'
                                      }}
                                    />
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    Target: {slaStatus.targetHours}h
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="p-3 sm:p-4">
                              <div className="font-semibold text-sm text-card-foreground mb-1">{report.title}</div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <TimeAgo date={report.timestamp} />
                              </div>
                            </td>
                            <td className="p-3 sm:p-4 hidden lg:table-cell">
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                                <span className="truncate max-w-[150px]" title={report.location}>{report.location}</span>
                              </div>
                            </td>
                            <td className="p-3 sm:p-4">
                              <Badge variant="outline" className="capitalize text-xs">
                                {report.category}
                              </Badge>
                            </td>
                            <td className="p-3 sm:p-4 hidden md:table-cell">
                              <Badge
                                variant={
                                  report.severity === "high"
                                    ? "destructive"
                                    : report.severity === "medium"
                                      ? "secondary"
                                      : "outline"
                                }
                                className="text-xs"
                              >
                                {report.severity}
                              </Badge>
                            </td>
                            <td className="p-3 sm:p-4">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  report.status === "pending" && "bg-warning/10 text-warning border-warning/20",
                                  report.status === "in-progress" && "bg-info/10 text-info border-info/20",
                                  report.status === "resolved" && "bg-success/10 text-success border-success/20",
                                )}
                              >
                                {report.status === "in-progress" ? "Active" : report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                              </Badge>
                            </td>
                            <td className="p-3 sm:p-4 hidden lg:table-cell">
                              {report.assignedTo ? (
                                <div className="flex items-center gap-1.5">
                                  <Users className="h-3.5 w-3.5 text-primary" />
                                  <span className="text-sm text-card-foreground truncate max-w-[120px]">{report.assignedTo}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                {/* Inline Quick Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {report.status !== "in-progress" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 touch-manipulation"
                                      onClick={() => onStatusChange(report.id, "in-progress")}
                                      title="Mark as Active"
                                    >
                                      <PlayCircle className="h-4 w-4 text-info" />
                                    </Button>
                                  )}
                                  {report.status !== "resolved" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 touch-manipulation"
                                      onClick={() => onStatusChange(report.id, "resolved")}
                                      title="Mark as Resolved"
                                    >
                                      <CheckCircle2 className="h-4 w-4 text-success" />
                                    </Button>
                                  )}
                                  {!report.assignedTo && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 touch-manipulation"
                                      onClick={async () => {
                                        const result = await autoAssignReport(report)
                                        if (result.success && result.teamName) {
                                          if (onTeamAssigned) {
                                            await onTeamAssigned(report.id, result.teamName)
                                          }
                                          toast({
                                            title: "Auto-Assigned",
                                            description: `Assigned to ${result.teamName}`,
                                            duration: 2000,
                                          })
                                        }
                                      }}
                                      title="Auto-Assign Team"
                                    >
                                      <Zap className="h-4 w-4 text-primary" />
                                    </Button>
                                  )}
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  <DropdownMenuItem onClick={() => setSelectedReport(report)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Quick Actions</div>
                                  {report.status !== "in-progress" && (
                                    <DropdownMenuItem onClick={() => onStatusChange(report.id, "in-progress")}>
                                      <PlayCircle className="h-4 w-4 mr-2" />
                                      Mark as Active
                                    </DropdownMenuItem>
                                  )}
                                  {report.status !== "resolved" && (
                                    <DropdownMenuItem onClick={() => onStatusChange(report.id, "resolved")}>
                                      <CheckCircle2 className="h-4 w-4 mr-2" />
                                      Mark as Resolved
                                    </DropdownMenuItem>
                                  )}
                                  {report.status === "in-progress" && (
                                    <DropdownMenuItem onClick={() => onStatusChange(report.id, "pending")}>
                                      <Square className="h-4 w-4 mr-2" />
                                      Revert to Pending
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Assignment</div>
                                  {!report.assignedTo && (
                                    <DropdownMenuItem onClick={async () => {
                                      const result = await autoAssignReport(report)
                                      if (result.success && result.teamName) {
                                        if (onTeamAssigned) {
                                          await onTeamAssigned(report.id, result.teamName)
                                        }
                                        toast({
                                          title: "Auto-Assigned",
                                          description: `Assigned to ${result.teamName}`,
                                          duration: 2000,
                                        })
                                      } else {
                                        toast({
                                          title: "Auto-Assignment Failed",
                                          description: result.reason || "No matching rule found",
                                          variant: "default",
                                          duration: 3000,
                                        })
                                      }
                                    }}>
                                      <Zap className="h-4 w-4 mr-2" />
                                      Auto-Assign Team
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => setSelectedReport(report)}>
                                    <Users className="h-4 w-4 mr-2" />
                                    {report.assignedTo ? "Change Team" : "Assign Team"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={cyclePriority}>
                                    <Flag className="h-4 w-4 mr-2" />
                                    Change Priority
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => {
                                    navigator.clipboard.writeText(report.id)
                                    toast({
                                      title: "Copied",
                                      description: "Report ID copied to clipboard",
                                      duration: 2000,
                                    })
                                  }}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy Report ID
                                  </DropdownMenuItem>
                                  {report.imageUrl && (
                                    <DropdownMenuItem onClick={() => window.open(report.imageUrl, "_blank")}>
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      Open Image
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              </div>
                            </td>
                            </tr>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-56">
                              <ContextMenuItem onClick={() => setSelectedReport(report)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Status</div>
                              {report.status !== "in-progress" && (
                                <ContextMenuItem onClick={() => onStatusChange(report.id, "in-progress")}>
                                  <PlayCircle className="h-4 w-4 mr-2" />
                                  Mark as Active
                                </ContextMenuItem>
                              )}
                              {report.status !== "resolved" && (
                                <ContextMenuItem onClick={() => onStatusChange(report.id, "resolved")}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Mark as Resolved
                                </ContextMenuItem>
                              )}
                              {report.status === "in-progress" && (
                                <ContextMenuItem onClick={() => onStatusChange(report.id, "pending")}>
                                  <Square className="h-4 w-4 mr-2" />
                                  Revert to Pending
                                </ContextMenuItem>
                              )}
                              <ContextMenuSeparator />
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Assignment</div>
                              {!report.assignedTo && (
                                <ContextMenuItem onClick={async () => {
                                  const result = await autoAssignReport(report)
                                  if (result.success && result.teamName) {
                                    if (onTeamAssigned) {
                                      await onTeamAssigned(report.id, result.teamName)
                                    }
                                    toast({
                                      title: "Auto-Assigned",
                                      description: `Assigned to ${result.teamName}`,
                                      duration: 2000,
                                    })
                                  } else {
                                    toast({
                                      title: "Auto-Assignment Failed",
                                      description: result.reason || "No matching rule found",
                                      variant: "default",
                                      duration: 3000,
                                    })
                                  }
                                }}>
                                  <Zap className="h-4 w-4 mr-2" />
                                  Auto-Assign Team
                                </ContextMenuItem>
                              )}
                              <ContextMenuItem onClick={() => setSelectedReport(report)}>
                                <Users className="h-4 w-4 mr-2" />
                                {report.assignedTo ? "Change Team" : "Assign Team"}
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Priority</div>
                              <ContextMenuItem onClick={cyclePriority}>
                                <Flag className="h-4 w-4 mr-2" />
                                Change Priority
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Actions</div>
                              <ContextMenuItem onClick={() => {
                                navigator.clipboard.writeText(report.id)
                                toast({
                                  title: "Copied",
                                  description: "Report ID copied to clipboard",
                                  duration: 2000,
                                })
                              }}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Report ID
                              </ContextMenuItem>
                              {report.imageUrl && (
                                <ContextMenuItem onClick={() => window.open(report.imageUrl, "_blank")}>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Open Image
                                </ContextMenuItem>
                              )}
                              <ContextMenuItem onClick={() => {
                                const url = `${window.location.origin}/?report=${report.id}`
                                navigator.clipboard.writeText(url)
                                toast({
                                  title: "Copied",
                                  description: "Report URL copied to clipboard",
                                  duration: 2000,
                                })
                              }}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Report URL
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="p-3 sm:p-4 border-t border-border bg-muted/30">
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
              ) : (
                /* Mobile Card View */
                <div className="space-y-3">
                  {paginatedReports.length === 0 ? (
                    <Card className="border-2">
                      <CardContent className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                            <FileText className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-1">No reports found</h3>
                          <p className="text-sm text-muted-foreground mb-4 max-w-md">
                            {searchQuery || selectedStatus !== "all" || selectedCategory !== "all" || selectedPriority !== "all"
                              ? "Try adjusting your filters to see more results"
                              : "No reports have been submitted yet"}
                          </p>
                          {(searchQuery || selectedStatus !== "all" || selectedCategory !== "all" || selectedPriority !== "all") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedStatus("all")
                                setSelectedCategory("all")
                                setSelectedPriority("all")
                                setSearchQuery("")
                                setDateRange({ start: null, end: null })
                                setDateRangePreset(null)
                              }}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Clear Filters
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    paginatedReports.map((report) => {
                      const reportPriority = report.priority || calculatePriority(report)
                      const slaStatus = calculateSLAStatus(report)
                      
                      return (
                        <Card
                          key={report.id}
                          className={cn(
                            "border-2 transition-all cursor-pointer hover:shadow-md w-full max-w-full overflow-hidden",
                            selectedReports.includes(report.id) && "border-primary bg-primary/5",
                            reportPriority === "critical" && "border-red-500/30 bg-red-500/5"
                          )}
                          onClick={() => setSelectedReport(report)}
                        >
                          <CardContent className="p-3 sm:p-4 space-y-3 w-full max-w-full">
                            {/* Header Row */}
                            <div className="flex items-start justify-between gap-2 w-full min-w-0">
                              <div className="flex items-start gap-2 flex-1 min-w-0 overflow-hidden">
                                <input
                                  type="checkbox"
                                  className="mt-1 rounded border-border cursor-pointer flex-shrink-0"
                                  checked={selectedReports.includes(report.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={() => toggleSelectReport(report.id)}
                                />
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                                    <PriorityBadge priority={reportPriority} />
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-xs flex-shrink-0",
                                        report.status === "pending" && "bg-warning/10 text-warning border-warning/20",
                                        report.status === "in-progress" && "bg-info/10 text-info border-info/20",
                                        report.status === "resolved" && "bg-success/10 text-success border-success/20",
                                      )}
                                    >
                                      {report.status === "in-progress" ? "Active" : report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                    </Badge>
                                  </div>
                                  <h3 className="font-semibold text-sm sm:text-base text-card-foreground mb-1 line-clamp-2 break-words">{report.title}</h3>
                                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground flex-wrap">
                                    <span className="font-mono flex-shrink-0">#{report.id.slice(0, 8)}</span>
                                    <span className="flex-shrink-0">•</span>
                                    <TimeAgo date={report.timestamp} />
                                  </div>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 flex-shrink-0 touch-manipulation">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  <DropdownMenuItem onClick={() => setSelectedReport(report)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Quick Actions</div>
                                  {report.status !== "in-progress" && (
                                    <DropdownMenuItem onClick={() => onStatusChange(report.id, "in-progress")}>
                                      <PlayCircle className="h-4 w-4 mr-2" />
                                      Mark as Active
                                    </DropdownMenuItem>
                                  )}
                                  {report.status !== "resolved" && (
                                    <DropdownMenuItem onClick={() => onStatusChange(report.id, "resolved")}>
                                      <CheckCircle2 className="h-4 w-4 mr-2" />
                                      Mark as Resolved
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Assignment</div>
                                  {!report.assignedTo && (
                                    <DropdownMenuItem onClick={async () => {
                                      const result = await autoAssignReport(report)
                                      if (result.success && result.teamName) {
                                        if (onTeamAssigned) {
                                          await onTeamAssigned(report.id, result.teamName)
                                        }
                                        toast({
                                          title: "Auto-Assigned",
                                          description: `Assigned to ${result.teamName}`,
                                          duration: 2000,
                                        })
                                      }
                                    }}>
                                      <Zap className="h-4 w-4 mr-2" />
                                      Auto-Assign Team
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => setSelectedReport(report)}>
                                    <Users className="h-4 w-4 mr-2" />
                                    {report.assignedTo ? "Change Team" : "Assign Team"}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* SLA Status */}
                            {report.status !== "resolved" && (
                              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 w-full min-w-0">
                                <div className={cn(
                                  "flex items-center gap-1.5 text-xs font-semibold flex-shrink-0 min-w-0",
                                  slaStatus.status === 'breached' && "text-red-600",
                                  slaStatus.status === 'warning' && "text-orange-600",
                                  slaStatus.status === 'on-time' && "text-green-600"
                                )}>
                                  {slaStatus.status === 'breached' && <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />}
                                  {slaStatus.status === 'warning' && <Clock className="h-3.5 w-3.5 flex-shrink-0" />}
                                  {slaStatus.status === 'on-time' && <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />}
                                  <span className="whitespace-nowrap">
                                    {slaStatus.hoursRemaining !== null && slaStatus.hoursRemaining > 0 ? (
                                      `${Math.round(slaStatus.hoursRemaining)}h left`
                                    ) : (
                                      <span className="animate-pulse">Breached</span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-0">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all duration-300",
                                      slaStatus.status === 'breached' && "bg-red-500",
                                      slaStatus.status === 'warning' && "bg-orange-500",
                                      slaStatus.status === 'on-time' && "bg-green-500"
                                    )}
                                    style={{
                                      width: slaStatus.hoursRemaining !== null && slaStatus.targetHours > 0
                                        ? `${Math.max(0, Math.min(100, (slaStatus.hoursRemaining / slaStatus.targetHours) * 100))}%`
                                        : '0%'
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2 border-t w-full">
                              <div className="min-w-0 overflow-hidden">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide block">Location</Label>
                                <div className="flex items-center gap-1.5 mt-1 min-w-0">
                                  <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                  <span className="text-xs sm:text-sm text-card-foreground truncate block min-w-0">{report.location}</span>
                                </div>
                              </div>
                              <div className="min-w-0 overflow-hidden">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide block">Category</Label>
                                <div className="mt-1">
                                  <Badge variant="outline" className="capitalize text-xs">
                                    {report.category}
                                  </Badge>
                                </div>
                              </div>
                              <div className="min-w-0 overflow-hidden">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide block">Severity</Label>
                                <div className="mt-1">
                                  <Badge
                                    variant={
                                      report.severity === "high"
                                        ? "destructive"
                                        : report.severity === "medium"
                                          ? "secondary"
                                          : "outline"
                                    }
                                    className="text-xs"
                                  >
                                    {report.severity}
                                  </Badge>
                                </div>
                              </div>
                              <div className="min-w-0 overflow-hidden">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide block">Assigned</Label>
                                <div className="mt-1 min-w-0">
                                  {report.assignedTo ? (
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <Users className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                      <span className="text-xs sm:text-sm text-card-foreground truncate block min-w-0">{report.assignedTo}</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Unassigned</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex items-center gap-1.5 sm:gap-2 pt-2 border-t w-full">
                              {report.status !== "in-progress" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 min-w-0 h-9 touch-manipulation text-xs sm:text-sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onStatusChange(report.id, "in-progress")
                                  }}
                                >
                                  <PlayCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2 flex-shrink-0" />
                                  <span className="hidden sm:inline">Mark Active</span>
                                  <span className="sm:hidden">Active</span>
                                </Button>
                              )}
                              {report.status !== "resolved" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 min-w-0 h-9 touch-manipulation text-xs sm:text-sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onStatusChange(report.id, "resolved")
                                  }}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2 flex-shrink-0" />
                                  <span className="hidden sm:inline">Resolve</span>
                                  <span className="sm:hidden">Done</span>
                                </Button>
                              )}
                              {!report.assignedTo && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 min-w-0 h-9 touch-manipulation text-xs sm:text-sm"
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    const result = await autoAssignReport(report)
                                    if (result.success && result.teamName) {
                                      if (onTeamAssigned) {
                                        await onTeamAssigned(report.id, result.teamName)
                                      }
                                      toast({
                                        title: "Auto-Assigned",
                                        description: `Assigned to ${result.teamName}`,
                                        duration: 2000,
                                      })
                                    }
                                  }}
                                >
                                  <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2 flex-shrink-0" />
                                  <span className="hidden sm:inline">Assign</span>
                                  <span className="sm:hidden">Auto</span>
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                  {totalPages > 1 && (
                    <div className="pt-4 w-full max-w-full overflow-x-hidden">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={goToPage}
                        pageSize={10}
                        totalItems={totalItems}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "teams" && (
            <div className="space-y-4">
              {/* Simplified Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">Teams</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {isLoadingTeams 
                      ? 'Loading...' 
                      : searchQuery.trim()
                        ? `${filteredTeams.length} of ${teams.length} ${filteredTeams.length === 1 ? 'team' : 'teams'}`
                        : `${teams.length} active ${teams.length === 1 ? 'team' : 'teams'}`
                    }
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    setIsLoadingTeams(true)
                    try {
                      const dbTeams = await fetchAllTeams()
                      if (dbTeams.length > 0) {
                        const convertedTeams = dbTeams.map(convertTeamFromDB)
                        setTeams(convertedTeams)
                      } else {
                        setTeams(mockTeams)
                      }
                    } catch (error) {
                      console.error('Failed to refresh teams:', error)
                      setTeams(mockTeams)
                    } finally {
                      setIsLoadingTeams(false)
                    }
                  }}
                  disabled={isLoadingTeams}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", isLoadingTeams && "animate-spin")} />
                  Refresh
                </Button>
              </div>

              {isLoadingTeams ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </CardContent>
                </Card>
              ) : filteredTeams.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery.trim() ? 'No teams match your search' : 'No teams available'}
                    </p>
                    {searchQuery.trim() && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-4"
                        onClick={() => setSearchQuery("")}
                      >
                        Clear search
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {filteredTeams.map((team) => {
                    const teamReports = reports.filter((r) => r.assignedTo === team.name)
                    const resolvedCount = teamReports.filter((r) => r.status === "resolved").length
                    const completionRate = teamReports.length > 0 ? Math.round((resolvedCount / teamReports.length) * 100) : 0

                    return (
                      <Card key={team.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base font-semibold mb-1">
                                {team.name}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground">{team.department}</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Stats */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-2 rounded bg-muted/50">
                              <p className="text-xs text-muted-foreground mb-1">Members</p>
                              <p className="text-lg font-semibold">{team.members}</p>
                            </div>
                            <div className="text-center p-2 rounded bg-primary/5">
                              <p className="text-xs text-muted-foreground mb-1">Active Jobs</p>
                              <p className="text-lg font-semibold text-primary">{team.activeJobs}</p>
                            </div>
                          </div>

                          {/* Completion Rate */}
                          {teamReports.length > 0 && (
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Completion</span>
                                <span className="font-medium">{completionRate}%</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-success rounded-full transition-all duration-500"
                                  style={{ width: `${completionRate}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => setSelectedTeamForTasks(team)}
                            >
                              <FileText className="mr-2 h-3.5 w-3.5" />
                              Tasks
                              {teamReports.length > 0 && (
                                <Badge variant="secondary" className="ml-1.5 text-xs">
                                  {teamReports.length}
                                </Badge>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => setSelectedTeamForContact(team)}
                            >
                              <Phone className="mr-2 h-3.5 w-3.5" />
                              Contact
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">Analytics</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Performance insights and metrics</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onRefresh}
                  disabled={isRefreshing || !onRefresh}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
              </div>

              {/* Bento Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-auto">
                {/* KPI: Total Reports - spans 1 column */}
                <div className="md:col-span-1 p-5 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Reports</p>
                      <p className="text-3xl font-bold">{totalReports}</p>
                    </div>
                  </div>
                </div>

                {/* KPI: Completion Rate - spans 1 column */}
                <div className="md:col-span-1 p-5 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3">
                      <Target className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Completion Rate</p>
                      <p className="text-3xl font-bold text-success">{completionRate}%</p>
                    </div>
                  </div>
                </div>

                {/* KPI: Avg Response Time - spans 1 column */}
                <div className="md:col-span-1 p-5 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3">
                      <Zap className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Avg Response</p>
                      <p className="text-3xl font-bold text-blue-500">
                        {analyticsData.avgResponseTime > 0 
                          ? `${analyticsData.avgResponseTime.toFixed(1)}h` 
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* KPI: Active Teams - spans 1 column */}
                <div className="md:col-span-1 p-5 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3">
                      <Users className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Active Teams</p>
                      <p className="text-3xl font-bold text-amber-500">{teams.length}</p>
                    </div>
                  </div>
                </div>

                {/* Status Distribution - spans 2 columns */}
                <div className="md:col-span-2 p-5 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm">
                  <h3 className="text-sm font-semibold mb-4">Status Distribution</h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-amber-500" />
                          <span>Pending</span>
                        </div>
                        <span className="font-semibold">{analyticsData.byStatus.pending}</span>
                      </div>
                      <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${totalReports > 0 ? (analyticsData.byStatus.pending / totalReports) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          <span>In Progress</span>
                        </div>
                        <span className="font-semibold">{analyticsData.byStatus.inProgress}</span>
                      </div>
                      <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${totalReports > 0 ? (analyticsData.byStatus.inProgress / totalReports) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span>Resolved</span>
                        </div>
                        <span className="font-semibold">{analyticsData.byStatus.resolved}</span>
                      </div>
                      <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${totalReports > 0 ? (analyticsData.byStatus.resolved / totalReports) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reports Trend Chart - spans 4 columns (full width on md, half on lg) */}
                <div className="md:col-span-4 lg:col-span-6 p-5 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm">
                  <h3 className="text-sm font-semibold mb-4">Reports Trend (Last 7 Days)</h3>
                  <ChartContainer
                    config={{
                      reports: { label: "Reports", color: "#3b82f6" },
                      resolved: { label: "Resolved", color: "#10b981" },
                    }}
                    className="h-[280px]"
                  >
                    <AreaChart data={analyticsData.reportsByDay}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <YAxis 
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area 
                        type="monotone" 
                        dataKey="reports" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.15}
                        name="Total Reports"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="resolved" 
                        stroke="#10b981" 
                        fill="#10b981" 
                        fillOpacity={0.15}
                        name="Resolved"
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>

                {/* Category Chart - spans 3 columns */}
                <div className="md:col-span-3 lg:col-span-3 p-5 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm">
                  <h3 className="text-sm font-semibold mb-4">Reports by Category</h3>
                  <ChartContainer
                    config={{
                      value: { label: "Reports", color: "#3b82f6" },
                    }}
                    className="h-[220px]"
                  >
                    <BarChart data={Object.entries(analyticsData.byCategory).map(([category, count]) => ({ 
                      category: category.charAt(0).toUpperCase() + category.slice(1), 
                      value: count 
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                      <XAxis 
                        dataKey="category" 
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <YAxis 
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </div>

                {/* Severity Chart - spans 3 columns */}
                <div className="md:col-span-3 lg:col-span-3 p-5 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm">
                  <h3 className="text-sm font-semibold mb-4">Reports by Severity</h3>
                  <ChartContainer
                    config={{
                      value: { label: "Reports", color: "hsl(var(--primary))" },
                    }}
                    className="h-[220px]"
                  >
                    <BarChart data={Object.entries(analyticsData.bySeverity).map(([severity, count]) => {
                      const severityColors: Record<string, string> = {
                        high: "#ef4444",
                        medium: "#f59e0b",
                        low: "#10b981",
                      }
                      return {
                        severity: severity.charAt(0).toUpperCase() + severity.slice(1), 
                        value: count,
                        fill: severityColors[severity] || "#6b7280"
                      }
                    })}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                      <XAxis 
                        dataKey="severity" 
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <YAxis 
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {Object.entries(analyticsData.bySeverity).map(([severity], index) => {
                          const severityColors: Record<string, string> = {
                            high: "#ef4444",
                            medium: "#f59e0b",
                            low: "#10b981",
                          }
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={severityColors[severity] || "#6b7280"}
                            />
                          )
                        })}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>

                {/* Category Performance - spans 2 columns */}
                <div className="md:col-span-2 lg:col-span-2 p-5 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm">
                  <h3 className="text-sm font-semibold mb-4">Category Performance</h3>
                  <div className="space-y-3">
                    {analyticsData.categoryPerformance.slice(0, 4).map((item) => (
                      <div key={item.category} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize font-medium">{item.category}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{item.resolved}/{item.total}</span>
                            <span className="text-xs font-semibold text-green-500">{item.completionRate}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all duration-500"
                            style={{ width: `${item.completionRate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team Performance - spans 4 columns */}
                <div className="md:col-span-4 lg:col-span-4 p-5 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm">
                  <h3 className="text-sm font-semibold mb-4">Team Performance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {analyticsData.teamPerformance.slice(0, 6).map((team) => (
                      <div key={team.name} className="p-3 rounded-lg border border-border/30 bg-muted/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{team.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{team.total} tasks</p>
                          </div>
                          <div className="text-right ml-2">
                            <p className="text-lg font-bold text-green-500">{team.completionRate}%</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            {team.resolved}
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3 text-blue-500" />
                            {team.active}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-500" />
                            {team.pending}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {analyticsData.teamPerformance.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No team performance data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "map" && (
            <div className="h-[calc(100vh-12rem)] flex flex-col gap-4">
              {/* Simplified Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">Incident Map</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {searchQuery.trim() 
                      ? `${filteredMapReports.length} of ${mapReports.length} ${filteredMapReports.length === 1 ? 'incident' : 'incidents'}`
                      : `${filteredMapReports.length} ${filteredMapReports.length === 1 ? 'incident' : 'incidents'} visible`
                    }
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMapFilters(!showMapFilters)}
                    className={cn(showMapFilters && "bg-primary text-primary-foreground")}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setIsLoadingMapReports(true)
                      try {
                        const fetchedReports = await fetchAllReports()
                        setMapReports(fetchedReports)
                      } catch (error) {
                        console.error("Failed to refresh map:", error)
                      } finally {
                        setIsLoadingMapReports(false)
                      }
                    }}
                    disabled={isLoadingMapReports}
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", isLoadingMapReports && "animate-spin")} />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Simplified Filters */}
              {showMapFilters && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <div className="flex gap-1">
                          {(["all", "pending", "in-progress", "resolved"] as const).map((status) => (
                            <Button
                              key={status}
                              variant={mapStatusFilter === status ? "default" : "outline"}
                              size="sm"
                              onClick={() => setMapStatusFilter(status)}
                              className="h-7 text-xs"
                            >
                              {status === "all" ? "All" : status === "in-progress" ? "Active" : status.charAt(0).toUpperCase() + status.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Severity</span>
                        <div className="flex gap-1">
                          {(["all", "high", "medium", "low"] as const).map((severity) => (
                            <Button
                              key={severity}
                              variant={mapSeverityFilter === severity ? "default" : "outline"}
                              size="sm"
                              onClick={() => setMapSeverityFilter(severity)}
                              className="h-7 text-xs capitalize"
                            >
                              {severity === "all" ? "All" : severity}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Category</span>
                        <div className="flex gap-1">
                          {(["all", "sanitation", "roads", "water", "electrical", "other"] as const).map((category) => (
                            <Button
                              key={category}
                              variant={mapCategoryFilter === category ? "default" : "outline"}
                              size="sm"
                              onClick={() => setMapCategoryFilter(category)}
                              className="h-7 text-xs capitalize"
                            >
                              {category === "all" ? "All" : category}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Map Container */}
              <Card className="flex-1 overflow-hidden p-0 relative">
                {isLoadingMapReports ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Loading map...</p>
                    </div>
                  </div>
                ) : isMapReady ? (
                  <div className="relative h-full w-full">
                    {/* Statistics Panel */}
                    {showMapStats && (
                      <div className="absolute top-4 right-4 z-[1000] bg-background/95 backdrop-blur border rounded-lg shadow-lg p-4 min-w-[200px]">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold">Statistics</h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setShowMapStats(false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total</span>
                            <span className="font-semibold">{mapStats.total}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Pending</span>
                            <span className="font-semibold text-warning">{mapStats.pending}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Active</span>
                            <span className="font-semibold text-info">{mapStats.inProgress}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Resolved</span>
                            <span className="font-semibold text-success">{mapStats.resolved}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Map */}
                    <div className="h-full w-full">
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
                        {filteredMapReports.map((report) => {
                          if (!report.latitude || !report.longitude) return null
                          
                          return (
                            <Marker
                              key={report.id}
                              position={[report.latitude, report.longitude] as LatLngExpression}
                              icon={createMarkerIcon(report.severity || "", report.status || "")}
                              eventHandlers={{
                                click: async () => {
                                  trackMapInteraction('marker_clicked', report.id)
                                  try {
                                    const convertedReport = await convertReportFromDBWithActivityLog(report)
                                    setSelectedReport(convertedReport)
                                  } catch (error) {
                                    console.error('Failed to convert report:', error)
                                    toast({
                                      title: "Error",
                                      description: "Failed to load report details",
                                      variant: "destructive",
                                    })
                                  }
                                },
                              }}
                            >
                              <Popup>
                                <div className="space-y-2 min-w-[240px]">
                                  {report.image_url && (
                                    <div className="relative aspect-video rounded-md overflow-hidden bg-muted mb-2">
                                      <Image
                                        src={report.image_url}
                                        alt={report.category || "Report"}
                                        fill
                                        className="object-cover"
                                        sizes="240px"
                                        unoptimized={report.image_url.startsWith('http') && !report.image_url.includes('supabase')}
                                      />
                                    </div>
                                  )}
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline" className="text-xs capitalize">
                                        {report.category || "Report"}
                                      </Badge>
                                      <Badge
                                        variant={
                                          report.severity?.toLowerCase() === "high"
                                            ? "destructive"
                                            : report.severity?.toLowerCase() === "medium"
                                              ? "secondary"
                                              : "outline"
                                        }
                                        className="text-xs"
                                      >
                                        {report.severity || "Unknown"}
                                      </Badge>
                                    </div>
                                    {report.description && (
                                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                        {report.description}
                                      </p>
                                    )}
                                    {(report.latitude && report.longitude) && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                        <MapPin className="h-3 w-3" />
                                        <span className="truncate">
                                          {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                                        </span>
                                      </div>
                                    )}
                                    <Button
                                      size="sm"
                                      className="w-full"
                                      onClick={async () => {
                                        try {
                                          const convertedReport = await convertReportFromDBWithActivityLog(report)
                                          setSelectedReport(convertedReport)
                                        } catch (error) {
                                          console.error('Failed to convert report:', error)
                                          toast({
                                            title: "Error",
                                            description: "Failed to load report details",
                                            variant: "destructive",
                                          })
                                        }
                                      }}
                                    >
                                      <Eye className="mr-2 h-3.5 w-3.5" />
                                      View Details
                                    </Button>
                                  </div>
                                </div>
                              </Popup>
                            </Marker>
                          )
                        })}
                      </MapContainer>
                    </div>

                    {/* Simplified Legend */}
                    <div className="absolute bottom-4 left-4 z-[1000] bg-background/95 backdrop-blur border rounded-lg shadow-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Legend</p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full bg-destructive" />
                          <span className="text-muted-foreground">High</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full bg-warning" />
                          <span className="text-muted-foreground">Medium</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full bg-info" />
                          <span className="text-muted-foreground">Active</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full bg-success" />
                          <span className="text-muted-foreground">Resolved</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats Toggle Button */}
                    {!showMapStats && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-4 right-4 z-[1000]"
                        onClick={() => setShowMapStats(true)}
                      >
                        <BarChart2 className="h-4 w-4 mr-2" />
                        Show Stats
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <Map className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Initializing map...</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6 p-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">Settings</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Manage your preferences and system configuration</p>
                </div>
                <Button onClick={() => {
                  try {
                    saveSettings(settings)
                    toast({
                      title: "Settings Saved",
                      description: "Your preferences have been saved successfully",
                      duration: 2000,
                    })
                  } catch (error) {
                    toast({
                      title: "Error Saving Settings",
                      description: error instanceof Error ? error.message : "Failed to save settings",
                      variant: "destructive",
                      duration: 3000,
                    })
                  }
                }}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* General Settings */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Palette className="h-5 w-5 text-primary" />
                      <CardTitle>General Preferences</CardTitle>
                    </div>
                    <CardDescription>Customize your experience</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="theme">Theme</Label>
                      <Select
                        value={settings.preferences.theme}
                        onValueChange={(value) => {
                          const themeValue = value as Theme
                          setSettings(prev => ({
                            ...prev,
                            preferences: { ...prev.preferences, theme: themeValue }
                          }))
                          // Apply theme immediately using next-themes
                          if (setTheme) {
                            setTheme(themeValue)
                          }
                        }}
                      >
                        <SelectTrigger id="theme">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">
                            <div className="flex items-center gap-2">
                              <Sun className="h-4 w-4" />
                              Light
                            </div>
                          </SelectItem>
                          <SelectItem value="dark">
                            <div className="flex items-center gap-2">
                              <Moon className="h-4 w-4" />
                              Dark
                            </div>
                          </SelectItem>
                          <SelectItem value="system">
                            <div className="flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              System
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select
                        value={settings.preferences.language}
                        onValueChange={(value: Language) => {
                          setSettings(prev => ({
                            ...prev,
                            preferences: { ...prev.preferences, language: value }
                          }))
                          // Update HTML lang attribute
                          if (typeof document !== 'undefined') {
                            document.documentElement.lang = value
                          }
                        }}
                      >
                        <SelectTrigger id="language">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              {LANGUAGE_NAMES.en}
                            </div>
                          </SelectItem>
                          <SelectItem value="fr">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              {LANGUAGE_NAMES.fr}
                            </div>
                          </SelectItem>
                          <SelectItem value="es">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              {LANGUAGE_NAMES.es}
                            </div>
                          </SelectItem>
                          <SelectItem value="krio">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              {LANGUAGE_NAMES.krio}
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Current: {LANGUAGE_NAMES[settings.preferences.language]}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={settings.preferences.timezone}
                        onValueChange={(value) => setSettings(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, timezone: value }
                        }))}
                      >
                        <SelectTrigger id="timezone">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Africa/Freetown">Africa/Freetown (GMT+0)</SelectItem>
                          <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                          <SelectItem value="America/New_York">Eastern Time (GMT-5)</SelectItem>
                          <SelectItem value="Europe/London">London (GMT+0)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="itemsPerPage">Items Per Page</Label>
                      <Select
                        value={settings.preferences.itemsPerPage.toString()}
                        onValueChange={(value) => setSettings(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, itemsPerPage: parseInt(value) }
                        }))}
                      >
                        <SelectTrigger id="itemsPerPage">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Notifications */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <BellIcon className="h-5 w-5 text-primary" />
                      <CardTitle>Notifications</CardTitle>
                    </div>
                    <CardDescription>Control how you receive updates</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="email-notifications">Email Notifications</Label>
                        <p className="text-xs text-muted-foreground">Receive updates via email</p>
                      </div>
                      <Switch
                        id="email-notifications"
                        checked={settings.notifications.emailEnabled}
                        onCheckedChange={(checked) => setSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, emailEnabled: checked }
                        }))}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="push-notifications">Push Notifications</Label>
                        <p className="text-xs text-muted-foreground">Browser push notifications</p>
                      </div>
                      <Switch
                        id="push-notifications"
                        checked={settings.notifications.pushEnabled}
                        onCheckedChange={(checked) => setSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, pushEnabled: checked }
                        }))}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="report-updates">Report Updates</Label>
                        <p className="text-xs text-muted-foreground">Status changes and updates</p>
                      </div>
                      <Switch
                        id="report-updates"
                        checked={settings.notifications.reportUpdates}
                        onCheckedChange={(checked) => setSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, reportUpdates: checked }
                        }))}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="team-assignments">Team Assignments</Label>
                        <p className="text-xs text-muted-foreground">When teams are assigned</p>
                      </div>
                      <Switch
                        id="team-assignments"
                        checked={settings.notifications.teamAssignments}
                        onCheckedChange={(checked) => setSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, teamAssignments: checked }
                        }))}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="weekly-digest">Weekly Digest</Label>
                        <p className="text-xs text-muted-foreground">Summary of weekly activity</p>
                      </div>
                      <Switch
                        id="weekly-digest"
                        checked={settings.notifications.weeklyDigest}
                        onCheckedChange={(checked) => setSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, weeklyDigest: checked }
                        }))}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Data Management */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-primary" />
                      <CardTitle>Data Management</CardTitle>
                    </div>
                    <CardDescription>Backup and data export settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="auto-backup">Automatic Backup</Label>
                        <p className="text-xs text-muted-foreground">Daily automatic backups</p>
                      </div>
                      <Switch
                        id="auto-backup"
                        checked={settings.data.autoBackup}
                        onCheckedChange={(checked) => setSettings(prev => ({
                          ...prev,
                          data: { ...prev.data, autoBackup: checked }
                        }))}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="retention">Data Retention (Days)</Label>
                      <Input
                        id="retention"
                        type="number"
                        value={settings.data.retentionDays}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          data: { ...prev.data, retentionDays: parseInt(e.target.value) || 90 }
                        }))}
                        min={30}
                        max={365}
                      />
                      <p className="text-xs text-muted-foreground">Data older than this will be archived</p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="export-format">Export Format</Label>
                      <Select
                        value={settings.data.exportFormat}
                        onValueChange={(value) => {
                          const formatValue = value as "csv" | "json" | "xlsx"
                          setSettings(prev => ({
                            ...prev,
                            data: { ...prev.data, exportFormat: formatValue }
                          }))
                        }}
                      >
                        <SelectTrigger id="export-format">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1" 
                        onClick={() => {
                          try {
                            // Export all reports (use filtered reports if available, otherwise all reports)
                            const reportsToExport: Report[] | ReportFromDB[] = filteredReports.length > 0 ? filteredReports : reports
                            if (reportsToExport.length === 0) {
                              toast({
                                title: "No Data to Export",
                                description: "There are no reports to export",
                                variant: "default",
                              })
                              return
                            }
                            exportReports(reportsToExport as Report[] | ReportFromDB[], settings.data.exportFormat, 'salonefix_reports')
                            toast({
                              title: "Export Successful",
                              description: `Exported ${reportsToExport.length} report(s) as ${settings.data.exportFormat.toUpperCase()}`,
                              duration: 3000,
                            })
                          } catch (error) {
                            console.error('Export error:', error)
                            toast({
                              title: "Export Failed",
                              description: error instanceof Error ? error.message : "Failed to export data. Please try again.",
                              variant: "destructive",
                              duration: 3000,
                            })
                          }
                        }}
                      >
                        <DownloadIcon className="h-4 w-4 mr-2" />
                        Export Data
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1" 
                        onClick={() => {
                          try {
                            downloadBackup()
                            toast({
                              title: "Backup Created",
                              description: "System backup downloaded successfully",
                              duration: 3000,
                            })
                          } catch (error) {
                            console.error('Backup error:', error)
                            toast({
                              title: "Backup Failed",
                              description: error instanceof Error ? error.message : "Failed to create backup. Please try again.",
                              variant: "destructive",
                              duration: 3000,
                            })
                          }
                        }}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Create Backup
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Auto-Assignment Configuration - Full Width */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle>Auto-Assignment Rules</CardTitle>
                        <CardDescription>Configure automatic team assignment based on rules</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="auto-assignment-toggle" className="text-sm">
                          {autoAssignmentEnabled ? "Enabled" : "Disabled"}
                        </Label>
                        <Switch
                          id="auto-assignment-toggle"
                          checked={autoAssignmentEnabled}
                          onCheckedChange={handleToggleAutoAssignment}
                        />
                      </div>
                      <Button onClick={handleSaveRules} size="sm">
                        <Save className="h-4 w-4 mr-2" />
                        Save Rules
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Auto-assignment automatically assigns reports to teams based on configurable rules. 
                      Rules are evaluated in priority order (lower number = higher priority).
                    </p>
                    
                    <div className="space-y-3">
                      {assignmentRules.map((rule, index) => (
                        <div 
                          key={rule.id} 
                          className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                Priority {rule.priority}
                              </Badge>
                              <span className="text-sm font-medium">{rule.name}</span>
                              {rule.enabled ? (
                                <Badge variant="default" className="text-xs bg-green-500">Active</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Inactive</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <div>
                                <span className="font-medium">Type:</span> {rule.type.replace('-', ' ')}
                              </div>
                              {rule.conditions.category && rule.conditions.category.length > 0 && (
                                <div>
                                  <span className="font-medium">Category:</span> {rule.conditions.category.join(', ')}
                                </div>
                              )}
                              {rule.conditions.priority && rule.conditions.priority.length > 0 && (
                                <div>
                                  <span className="font-medium">Priority:</span> {rule.conditions.priority.join(', ')}
                                </div>
                              )}
                              {rule.assignment.teamName && (
                                <div>
                                  <span className="font-medium">Assigns to:</span> {rule.assignment.teamName}
                                </div>
                              )}
                              {rule.assignment.department && (
                                <div>
                                  <span className="font-medium">Department:</span> {rule.assignment.department}
                                </div>
                              )}
                              {rule.assignment.strategy && (
                                <div>
                                  <span className="font-medium">Strategy:</span> {rule.assignment.strategy.replace('-', ' ')}
                                </div>
                              )}
                            </div>
                          </div>
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={() => handleToggleRule(rule.id)}
                            className="ml-4"
                          />
                        </div>
                      ))}
                    </div>

                    {assignmentRules.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No assignment rules configured</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // Test auto-assignment on a sample report
                        if (reports.length > 0 && !reports[0].assignedTo) {
                          autoAssignReport(reports[0]).then(result => {
                            if (result.success) {
                              toast({
                                title: "Test Successful",
                                description: `Would assign to: ${result.teamName} (${result.reason})`,
                                duration: 3000,
                              })
                            } else {
                              toast({
                                title: "Test Result",
                                description: result.reason,
                                variant: "default",
                                duration: 3000,
                              })
                            }
                          })
                        } else {
                          toast({
                            title: "No Test Report",
                            description: "No unassigned reports available for testing",
                            variant: "default",
                          })
                        }
                      }}
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Test Rules
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // Reset to default rules
                        const defaultRules = getAssignmentRules()
                        setAssignmentRules(defaultRules)
                        toast({
                          title: "Rules Reset",
                          description: "Reset to default assignment rules",
                          duration: 2000,
                        })
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset to Defaults
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Account Settings */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <UserCog className="h-5 w-5 text-primary" />
                      <CardTitle>Account Settings</CardTitle>
                    </div>
                    <CardDescription>Manage your account security and preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* User Info */}
                    <div className="space-y-2">
                      <Label>Account Information</Label>
                      <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Email</span>
                          <span className="text-sm font-medium">{user?.email || 'Not signed in'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">User ID</span>
                          <span className="text-sm font-mono text-xs">{user?.id?.substring(0, 8) || 'N/A'}...</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Two-Factor Authentication */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="2fa-toggle">Two-Factor Authentication</Label>
                          <p className="text-xs text-muted-foreground">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <Switch
                          id="2fa-toggle"
                          checked={twoFAEnabled}
                          onCheckedChange={async (checked) => {
                            if (checked) {
                              // Generate secret and QR code
                              const secret = generateTOTPSecret()
                              setTwoFASecret(secret)
                              const qrCodeURL = generateQRCodeURL(secret, user?.email || 'user', 'SaloneFix')
                              setTwoFAQRCode(getQRCodeImageURL(qrCodeURL))
                              setShow2FASetup(true)
                            } else {
                              // Disable 2FA
                              disable2FA(user?.id)
                              setTwoFAEnabled(false)
                              toast({
                                title: "2FA Disabled",
                                description: "Two-factor authentication has been disabled",
                                duration: 2000,
                              })
                            }
                          }}
                        />
                      </div>

                      {twoFAEnabled && (
                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <ShieldCheck className="h-4 w-4" />
                            <span>2FA is enabled and protecting your account</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Security & System Info */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <CardTitle>Security & System</CardTitle>
                    </div>
                    <CardDescription>System information and security settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Database Status</span>
                        </div>
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          Connected
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Real-time Sync</span>
                        </div>
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          Active
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Active Teams</span>
                        </div>
                        <span className="text-sm font-semibold">{teams.length}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Total Reports</span>
                        </div>
                        <span className="text-sm font-semibold">{totalReports}</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={async () => {
                          try {
                            const result = await testAdminAccess()
                            console.log("🔍 Database Access Test Results:", result)
                            if (result.errors.length > 0) {
                              toast({
                                title: "Database Issues Found",
                                description: result.errors.join("; "),
                                variant: "destructive",
                                duration: 10000,
                              })
                            } else {
                              toast({
                                title: "Database Access OK",
                                description: `Read: ${result.canRead ? '✅' : '❌'}, Update: ${result.canUpdate ? '✅' : '❌'}, Assign: ${result.canAssign ? '✅' : '❌'}`,
                                duration: 5000,
                              })
                            }
                          } catch (error) {
                            toast({
                              title: "Test Failed",
                              description: error instanceof Error ? error.message : "Unknown error",
                              variant: "destructive",
                            })
                          }
                        }}
                      >
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Test Database Access
                      </Button>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>
          )}
        </main>
      </div>

      {/* Report Triage Modal */}
      {selectedReport && (
        <ReportTriageModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onStatusChange={onStatusChange}
          teams={teams}
          onTeamAssigned={onTeamAssigned}
          onReportDeleted={() => {
            // Refresh reports will happen automatically via real-time subscription
            // The subscription will remove the deleted report from the list
            setSelectedReport(null)
          }}
        />
      )}

      {/* Team Tasks Modal */}
      <TeamTasksModal
        team={selectedTeamForTasks}
        reports={reports}
        isOpen={!!selectedTeamForTasks}
        onClose={() => setSelectedTeamForTasks(null)}
        onReportClick={(report) => setSelectedReport(report)}
      />

      {/* Team Contact Modal */}
      <TeamContactModal
        team={selectedTeamForContact}
        isOpen={!!selectedTeamForContact}
        onClose={() => setSelectedTeamForContact(null)}
      />

      {/* Save View Dialog */}
      <Dialog open={showSaveViewDialog} onOpenChange={setShowSaveViewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Current View</DialogTitle>
            <DialogDescription>
              Save your current filter settings as a named view for quick access later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="view-name">View Name</Label>
              <Input
                id="view-name"
                placeholder="e.g., My Critical Reports"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveCurrentView()
                  }
                }}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Current filters: {selectedStatus !== "all" && `${selectedStatus} `}
                {selectedCategory !== "all" && `${selectedCategory} `}
                {selectedPriority !== "all" && `${selectedPriority} `}
                {searchQuery && `"${searchQuery}"`}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowSaveViewDialog(false)
                  setNewViewName("")
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveCurrentView}
                disabled={!newViewName.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                Save View
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FASetup} onOpenChange={setShow2FASetup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app, then enter the verification code to complete setup.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* QR Code */}
            {twoFAQRCode && twoFASecret && (
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-white rounded-lg border-2 border-primary">
                  <img src={twoFAQRCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Scan this QR code with an authenticator app like:
                  </p>
                  <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                    <span>Google Authenticator</span>
                    <span>•</span>
                    <span>Authy</span>
                    <span>•</span>
                    <span>Microsoft Authenticator</span>
                  </div>
                  <div className="mt-3 p-2 bg-muted rounded text-xs font-mono break-all">
                    <p className="text-xs text-muted-foreground mb-1">Or enter this secret manually:</p>
                    <p className="font-semibold">{twoFASecret}</p>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Verification Code Input */}
            <div className="space-y-2">
              <Label htmlFor="2fa-code">Verification Code</Label>
              <InputOTP
                maxLength={6}
                value={twoFACode}
                onChange={(value) => setTwoFACode(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShow2FASetup(false)
                  setTwoFACode("")
                  setTwoFAQRCode(null)
                  setTwoFASecret(null)
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={async () => {
                  if (!twoFACode || twoFACode.length !== 6) {
                    toast({
                      title: "Invalid Code",
                      description: "Please enter a 6-digit verification code",
                      variant: "destructive",
                    })
                    return
                  }

                  if (!twoFASecret) {
                    toast({
                      title: "Setup Error",
                      description: "Secret not found. Please try again.",
                      variant: "destructive",
                    })
                    return
                  }

                  setIsVerifying2FA(true)
                  try {
                    const isValid = await verifyTOTPCodeAsync(twoFASecret, twoFACode)
                    if (isValid) {
                      enable2FA(user?.id, twoFASecret)
                      setTwoFAEnabled(true)
                      setShow2FASetup(false)
                      setTwoFACode("")
                      setTwoFAQRCode(null)
                      setTwoFASecret(null)
                      toast({
                        title: "2FA Enabled",
                        description: "Two-factor authentication has been successfully enabled",
                        duration: 3000,
                      })
                    } else {
                      toast({
                        title: "Invalid Code",
                        description: "The verification code is incorrect. Please try again.",
                        variant: "destructive",
                        duration: 3000,
                      })
                    }
                  } catch (error) {
                    console.error('2FA verification error:', error)
                    toast({
                      title: "Verification Failed",
                      description: error instanceof Error ? error.message : "Failed to verify code. Please try again.",
                      variant: "destructive",
                      duration: 3000,
                    })
                  } finally {
                    setIsVerifying2FA(false)
                  }
                }}
                disabled={isVerifying2FA || twoFACode.length !== 6}
              >
                {isVerifying2FA ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Enable"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
