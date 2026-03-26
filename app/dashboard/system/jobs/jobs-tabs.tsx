"use client"

import { useState } from "react"
import { BuildingIcon, SearchIcon, LightbulbIcon } from "lucide-react"

interface JobsTabsProps {
  tabs: { company: number; companyC: number; companyR: number; companyF: number; research: number; researchC: number; researchR: number; researchF: number; suggest: number; suggestC: number; suggestR: number; suggestF: number }
  companyContent: React.ReactNode
  researchContent: React.ReactNode
  suggestContent: React.ReactNode
}

export function JobsTabs({ tabs, companyContent, researchContent, suggestContent }: JobsTabsProps) {
  const [active, setActive] = useState("company")

  const tabDefs = [
    { id: "company", label: "Company Analysis", count: tabs.company, icon: BuildingIcon },
    { id: "research", label: "Research Sessions", count: tabs.research, icon: SearchIcon },
    { id: "suggest", label: "Suggestions", count: tabs.suggest, icon: LightbulbIcon },
  ]

  return (
    <div>
      {/* Segmented control */}
      <div className="flex rounded-lg border bg-muted/30 p-1 gap-1">
        {tabDefs.map((tab) => {
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
        <div className={active === "company" ? "" : "hidden"}>{companyContent}</div>
        <div className={active === "research" ? "" : "hidden"}>{researchContent}</div>
        <div className={active === "suggest" ? "" : "hidden"}>{suggestContent}</div>
      </div>
    </div>
  )
}
