"use client"

import { useEffect, useState, useCallback } from "react"
import { Camera, MapPin, Sparkles, Upload, ImageIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ReportCategory } from "@/lib/types"

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (result: {
    category: ReportCategory
    severity: "low" | "medium" | "high"
    description: string
  }) => void
}

type AnalysisStep = "camera" | "uploading" | "analyzing" | "complete"

const mockAnalysisResults = [
  {
    category: "sanitation" as ReportCategory,
    severity: "high" as const,
    description: "Large accumulation of uncollected garbage near residential area, potential health hazard.",
  },
  {
    category: "roads" as ReportCategory,
    severity: "medium" as const,
    description: "Significant pothole approximately 30cm deep, traffic hazard for vehicles and pedestrians.",
  },
  {
    category: "water" as ReportCategory,
    severity: "high" as const,
    description: "Blocked storm drain with debris overflow, causing street flooding.",
  },
]

const analysisSteps = [
  "Detecting hazard type...",
  "Analyzing severity level...",
  "Generating description...",
  "Finalizing report...",
]

export function ReportModal({ isOpen, onClose, onComplete }: ReportModalProps) {
  const [step, setStep] = useState<AnalysisStep>("camera")
  const [progress, setProgress] = useState(0)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setStep("camera")
      setProgress(0)
      setAnalysisStep(0)
      return
    }
  }, [isOpen])

  const handleCapture = useCallback(() => {
    setStep("uploading")
    setProgress(0)

    // Simulate upload progress with easing
    let currentProgress = 0
    const uploadInterval = setInterval(() => {
      currentProgress += Math.random() * 15 + 5
      if (currentProgress >= 100) {
        currentProgress = 100
        clearInterval(uploadInterval)
        setTimeout(() => setStep("analyzing"), 200)
      }
      setProgress(Math.min(currentProgress, 100))
    }, 150)
  }, [])

  useEffect(() => {
    if (step === "analyzing") {
      // Cycle through analysis steps
      const stepInterval = setInterval(() => {
        setAnalysisStep((prev) => (prev + 1) % analysisSteps.length)
      }, 600)

      // Complete analysis after all steps
      const timer = setTimeout(() => {
        clearInterval(stepInterval)
        const randomResult = mockAnalysisResults[Math.floor(Math.random() * mockAnalysisResults.length)]
        onComplete(randomResult)
      }, 2500)

      return () => {
        clearTimeout(timer)
        clearInterval(stepInterval)
      }
    }
  }, [step, onComplete])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <DialogHeader className="relative">
          <DialogTitle className="text-center text-foreground flex items-center justify-center gap-2">
            {step === "camera" && (
              <>
                <Camera className="h-5 w-5 text-primary" />
                Capture Hazard
              </>
            )}
            {step === "uploading" && (
              <>
                <Upload className="h-5 w-5 text-primary animate-bounce" />
                Uploading...
              </>
            )}
            {step === "analyzing" && (
              <>
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                AI Analyzing...
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-6">
          {step === "camera" && (
            <div className="w-full space-y-4 animate-fade-up">
              <div
                className={cn(
                  "relative flex h-52 w-full items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer group",
                  isDragging
                    ? "border-primary bg-primary/5 scale-[1.02]"
                    : "border-border bg-muted/50 hover:border-primary/50 hover:bg-muted",
                )}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={() => {
                  setIsDragging(false)
                  handleCapture()
                }}
                onClick={handleCapture}
              >
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4 transition-transform duration-300 group-hover:scale-110">
                    <Camera className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Click to capture or drag image</p>
                  <p className="mt-1 text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
                </div>

                {/* Decorative corners */}
                <div className="absolute top-3 left-3 h-6 w-6 border-l-2 border-t-2 border-primary/30 rounded-tl-lg" />
                <div className="absolute top-3 right-3 h-6 w-6 border-r-2 border-t-2 border-primary/30 rounded-tr-lg" />
                <div className="absolute bottom-3 left-3 h-6 w-6 border-l-2 border-b-2 border-primary/30 rounded-bl-lg" />
                <div className="absolute bottom-3 right-3 h-6 w-6 border-r-2 border-b-2 border-primary/30 rounded-br-lg" />
              </div>

              <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground bg-muted/50 rounded-full px-4 py-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Freetown, Sierra Leone</span>
                <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">GPS Active</span>
              </div>

              <Button
                onClick={handleCapture}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40"
                size="lg"
              >
                <Camera className="mr-2 h-5 w-5" />
                Take Photo
              </Button>
            </div>
          )}

          {step === "uploading" && (
            <div className="w-full space-y-6 animate-fade-up">
              <div className="relative flex h-32 items-center justify-center">
                {/* Circular progress */}
                <svg className="h-28 w-28 -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={301.59}
                    strokeDashoffset={301.59 - (301.59 * progress) / 100}
                    className="text-primary transition-all duration-300"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <ImageIcon className="h-8 w-8 text-primary mb-1" />
                  <span className="text-lg font-bold text-foreground">{Math.round(progress)}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground font-medium">Uploading image...</span>
                  <span className="text-muted-foreground tabular-nums">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full transition-all duration-300 relative overflow-hidden"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-0 shimmer" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "analyzing" && (
            <div className="w-full space-y-6 text-center animate-fade-up">
              {/* AI animation */}
              <div className="relative flex items-center justify-center h-32">
                {/* Outer rings */}
                <div
                  className="absolute h-28 w-28 rounded-full border-2 border-primary/20 animate-ping"
                  style={{ animationDuration: "2s" }}
                />
                <div
                  className="absolute h-24 w-24 rounded-full border-2 border-primary/30 animate-ping"
                  style={{ animationDuration: "2s", animationDelay: "0.3s" }}
                />

                {/* Scanner effect */}
                <div className="absolute h-20 w-20 rounded-full bg-gradient-to-b from-primary/20 to-transparent overflow-hidden">
                  <div className="absolute left-0 right-0 h-1 bg-primary/50 animate-scan" />
                </div>

                {/* Core */}
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                  <Sparkles className="h-10 w-10 text-primary animate-pulse" />
                </div>
              </div>

              <div className="space-y-3">
                <p className="font-semibold text-foreground text-lg">AI Processing</p>

                {/* Current analysis step */}
                <div className="h-6 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground animate-fade-up" key={analysisStep}>
                    {analysisSteps[analysisStep]}
                  </p>
                </div>

                {/* Step indicators */}
                <div className="flex justify-center gap-2 pt-2">
                  {analysisSteps.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        i <= analysisStep ? "w-6 bg-primary" : "w-1.5 bg-muted",
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
