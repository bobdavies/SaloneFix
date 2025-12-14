"use client"

import { useState } from "react"
import { Trash2, Droplets, Construction, Zap, HelpCircle, MapPin, Clock, ChevronRight, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TimeAgo } from "@/components/time-ago"
import { cn } from "@/lib/utils"
import type { Report, ReportCategory, ReportStatus } from "@/lib/types"

interface ReportCardProps {
  report: Report
  index?: number
}

const categoryConfig: Record<ReportCategory, { icon: typeof Trash2; color: string; bgColor: string }> = {
  sanitation: { icon: Trash2, color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-950" },
  water: { icon: Droplets, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-950" },
  roads: { icon: Construction, color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-950" },
  electrical: { icon: Zap, color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-950" },
  other: { icon: HelpCircle, color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-800" },
}

const statusConfig: Record<ReportStatus, { bg: string; text: string; label: string; dot: string }> = {
  pending: { bg: "bg-muted", text: "text-muted-foreground", label: "Pending", dot: "bg-muted-foreground" },
  "in-progress": { bg: "bg-info/10", text: "text-info", label: "In Progress", dot: "bg-info" },
  resolved: { bg: "bg-success/10", text: "text-success", label: "Resolved", dot: "bg-success" },
}

export function ReportCard({ report, index = 0 }: ReportCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { icon: Icon, color, bgColor } = categoryConfig[report.category]
  const status = statusConfig[report.status]
  const isUrgent = report.severity === "high" && report.status === "pending"

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300 cursor-pointer group border-border/50",
        "hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5",
        isUrgent && "border-destructive/30 glow-pulse",
      )}
      style={{ animationDelay: `${index * 0.05}s` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="flex items-start gap-4 p-4">
        <div
          className={cn(
            "relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-300",
            bgColor,
            isHovered && "scale-110",
          )}
        >
          <Icon className={cn("h-6 w-6 transition-transform duration-300", color)} />
          {isUrgent && (
            <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75 animate-ping" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-semibold text-card-foreground truncate">{report.title}</h3>
              {report.severity === "high" && <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
            </div>
            <Badge
              variant="secondary"
              className={cn("flex-shrink-0 gap-1.5 font-medium transition-all duration-200", status.bg, status.text)}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
              {status.label}
            </Badge>
          </div>

          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{report.location}</span>
          </div>

          <p className="mt-2 text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed">{report.description}</p>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <TimeAgo date={report.timestamp} />
            </div>

            <div
              className={cn(
                "flex items-center gap-1 text-xs text-primary font-medium transition-all duration-300",
                isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2",
              )}
            >
              <span>View details</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
