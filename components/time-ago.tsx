"use client"

import { useState, useEffect } from "react"

interface TimeAgoProps {
  date: Date
  className?: string
}

export function TimeAgo({ date, className }: TimeAgoProps) {
  const [timeAgo, setTimeAgo] = useState<string>("Just now")

  useEffect(() => {
    const updateTimeAgo = () => {
      const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
      if (seconds < 60) {
        setTimeAgo("Just now")
      } else {
        const minutes = Math.floor(seconds / 60)
        if (minutes < 60) {
          setTimeAgo(`${minutes}m ago`)
        } else {
          const hours = Math.floor(minutes / 60)
          if (hours < 24) {
            setTimeAgo(`${hours}h ago`)
          } else {
            const days = Math.floor(hours / 24)
            setTimeAgo(`${days}d ago`)
          }
        }
      }
    }

    updateTimeAgo()
    // Update every minute for better UX
    const interval = setInterval(updateTimeAgo, 60000)
    return () => clearInterval(interval)
  }, [date])

  return <span className={className}>{timeAgo}</span>
}











