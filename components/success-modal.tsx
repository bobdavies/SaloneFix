"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, MapPin, Tag, Gauge, Share2, Sparkles } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ReportCategory } from "@/lib/types"

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  result: {
    category: ReportCategory
    severity: "low" | "medium" | "high"
    description: string
  } | null
}

const categoryLabels: Record<ReportCategory, { label: string; color: string }> = {
  sanitation: { label: "Sanitation", color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  water: { label: "Water/Drainage", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  roads: { label: "Roads/Infrastructure", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  electrical: { label: "Electrical", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" },
  other: { label: "Other", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
}

export function SuccessModal({ isOpen, onClose, result }: SuccessModalProps) {
  const [showContent, setShowContent] = useState(false)
  const [showCheckmark, setShowCheckmark] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Stagger animations
      setShowCheckmark(true)
      const timer = setTimeout(() => setShowContent(true), 400)
      return () => clearTimeout(timer)
    } else {
      setShowContent(false)
      setShowCheckmark(false)
    }
  }, [isOpen])

  if (!result) return null

  const category = categoryLabels[result.category]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-foreground">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Report Submitted!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex justify-center">
            <div className="relative">
              {/* Success rings */}
              <div
                className={cn(
                  "absolute inset-0 rounded-full bg-success/20 transition-transform duration-700",
                  showCheckmark ? "scale-100 opacity-100" : "scale-50 opacity-0",
                )}
              />
              <div
                className={cn(
                  "absolute inset-0 rounded-full bg-success/10 transition-all duration-1000 delay-200",
                  showCheckmark ? "scale-[1.4] opacity-0" : "scale-100 opacity-100",
                )}
              />

              {/* Main circle with checkmark */}
              <div
                className={cn(
                  "relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-success to-emerald-600 shadow-2xl shadow-success/30 transition-all duration-500",
                  showCheckmark ? "scale-100" : "scale-0",
                )}
              >
                <svg
                  className="h-12 w-12 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" className={cn(showCheckmark && "draw-check")} />
                </svg>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "rounded-2xl border border-border bg-gradient-to-b from-muted/50 to-transparent p-5 space-y-4 transition-all duration-500",
              showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            )}
          >
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              AI Analysis Results
            </h3>

            <div className="grid gap-3">
              {/* Category */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  Category
                </div>
                <Badge className={cn("font-medium", category.color)}>{category.label}</Badge>
              </div>

              {/* Severity */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Gauge className="h-4 w-4" />
                  Severity
                </div>
                <Badge
                  className={cn(
                    "font-medium",
                    result.severity === "high" && "bg-destructive/10 text-destructive",
                    result.severity === "medium" && "bg-warning/10 text-warning",
                    result.severity === "low" && "bg-muted text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "mr-1.5 h-1.5 w-1.5 rounded-full inline-block",
                      result.severity === "high" && "bg-destructive",
                      result.severity === "medium" && "bg-warning",
                      result.severity === "low" && "bg-muted-foreground",
                    )}
                  />
                  {result.severity.charAt(0).toUpperCase() + result.severity.slice(1)}
                </Badge>
              </div>

              {/* Location */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Location
                </div>
                <span className="text-sm text-foreground font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Auto-detected
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
                AI-Generated Description
              </p>
              <p className="text-sm text-foreground leading-relaxed bg-background rounded-xl p-3 border border-border/50">
                {result.description}
              </p>
            </div>
          </div>

          <div
            className={cn(
              "flex gap-3 transition-all duration-500 delay-200",
              showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            )}
          >
            <Button variant="outline" className="flex-1 bg-transparent" onClick={onClose}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button
              onClick={onClose}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
