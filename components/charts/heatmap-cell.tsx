"use client"

import { useState, useRef, useCallback } from "react"
import { createPortal } from "react-dom"

interface HeatmapCellProps {
  tooltip: string
  color?: string
  children: React.ReactNode
  className?: string
}

export function HeatmapCell({ tooltip, color, children, className = "" }: HeatmapCellProps) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLDivElement>(null)

  const handleEnter = useCallback(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setPos({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 4,
    })
    setShow(true)
  }, [])

  const handleLeave = useCallback(() => {
    setShow(false)
  }, [])

  return (
    <div
      ref={ref}
      className={`px-2 py-2.5 text-xs text-center relative cursor-default hover:brightness-95 transition-colors ${className}`}
      style={{ backgroundColor: color }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      {show && typeof document !== "undefined" && createPortal(
        <div
          className="fixed -translate-x-1/2 bg-popover text-popover-foreground border border-border rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg pointer-events-none"
          style={{
            left: pos.x,
            top: pos.y,
            zIndex: 9999,
          }}
        >
          {tooltip}
        </div>,
        document.body
      )}
    </div>
  )
}
