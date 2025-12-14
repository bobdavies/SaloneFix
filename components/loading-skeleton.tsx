import { cn } from "@/lib/utils"

export function ReportCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
      <div className="flex gap-4">
        <div className="h-20 w-20 rounded-lg bg-muted flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
          <div className="h-3 bg-muted rounded w-2/3" />
          <div className="flex gap-2 mt-2">
            <div className="h-5 w-16 bg-muted rounded-full" />
            <div className="h-5 w-20 bg-muted rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ReportListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ReportCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function MapSkeleton() {
  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden border border-border bg-muted animate-pulse">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 bg-background/50 rounded-full mx-auto" />
          <div className="h-4 bg-background/50 rounded w-32 mx-auto" />
        </div>
      </div>
    </div>
  )
}

export function DashboardCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
      <div className="space-y-4">
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="h-8 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <DashboardCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="h-5 bg-muted rounded w-1/4 animate-pulse" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex gap-4 animate-pulse">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="flex-1 h-4 bg-muted rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ImageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-muted animate-pulse rounded", className)}>
      <div className="w-full h-full flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-background/50 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )
}





