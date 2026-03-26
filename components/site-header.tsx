"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

const pageLabelMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/users": "All Users",
  "/dashboard/users/onboarding": "Onboarding Funnel",
  "/dashboard/content/generated": "Generated Posts",
  "/dashboard/content/scheduled": "Scheduled Posts",
  "/dashboard/content/templates": "Templates",
  "/dashboard/content/ai-activity": "AI Activity",
  "/dashboard/analytics/ai-performance": "AI Performance",
  "/dashboard/analytics/tokens": "Token Usage",
  "/dashboard/analytics/features": "Feature Usage",
  "/dashboard/analytics/posthog": "PostHog",
  "/dashboard/analytics/costs": "Costs",
  "/dashboard/system/jobs": "Background Jobs",
  "/dashboard/system/flags": "Sidebar Control",
  "/dashboard/system/errors": "Errors",
  "/dashboard/settings": "Settings",
}

const sectionLabelMap: Record<string, string> = {
  users: "Users",
  content: "Content",
  analytics: "Analytics",
  system: "System",
  settings: "Settings",
}

function getBreadcrumb(pathname: string): string {
  const label = pageLabelMap[pathname]
  if (!label) return "Dashboard"

  // For top-level routes like /dashboard or /dashboard/settings, no section prefix
  const segments = pathname.replace(/^\/dashboard\/?/, "").split("/")
  if (segments.length <= 1) return label

  const sectionKey = segments[0]
  const sectionLabel = sectionLabelMap[sectionKey]
  if (sectionLabel) {
    return `${sectionLabel} / ${label}`
  }

  return label
}

export function SiteHeader() {
  const pathname = usePathname()
  const breadcrumb = getBreadcrumb(pathname)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium flex-1">{breadcrumb}</h1>
        <ThemeToggle />
      </div>
    </header>
  )
}
