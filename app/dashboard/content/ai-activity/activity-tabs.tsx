"use client"

import { useState } from "react"
import { ZapIcon, MessageSquareIcon, FileTextIcon } from "lucide-react"

interface ActivityTabsProps {
  counts: { requests: number; conversations: number; output: number }
  requestsContent: React.ReactNode
  conversationsContent: React.ReactNode
  outputContent: React.ReactNode
}

export function ActivityTabs({ counts, requestsContent, conversationsContent, outputContent }: ActivityTabsProps) {
  const [active, setActive] = useState("requests")

  const tabs = [
    { id: "requests", label: "Requests", count: counts.requests, icon: ZapIcon },
    { id: "conversations", label: "Conversations", count: counts.conversations, icon: MessageSquareIcon },
    { id: "output", label: "Output", count: counts.output, icon: FileTextIcon },
  ]

  return (
    <div>
      {/* Segmented control */}
      <div className="flex rounded-lg border bg-muted/30 p-1 gap-1">
        {tabs.map((tab) => {
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200
                ${isActive
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              <tab.icon className="size-3.5" />
              <span>{tab.label}</span>
              <span className={`
                text-[10px] tabular-nums px-1.5 py-0 rounded-full font-semibold
                ${isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}
              `}>
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Content — show/hide */}
      <div className="mt-4">
        <div className={active === "requests" ? "" : "hidden"}>{requestsContent}</div>
        <div className={active === "conversations" ? "" : "hidden"}>{conversationsContent}</div>
        <div className={active === "output" ? "" : "hidden"}>{outputContent}</div>
      </div>
    </div>
  )
}
