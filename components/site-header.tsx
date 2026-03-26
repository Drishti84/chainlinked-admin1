"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

const PAGE_TITLES: Record<string, string> = {
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
  "/dashboard/analytics/linkedin": "LinkedIn Engagement",
  "/dashboard/analytics/posthog": "PostHog Analytics",
  "/dashboard/analytics/costs": "Cost Dashboard",
  "/dashboard/system/jobs": "Background Jobs",
  "/dashboard/system/flags": "Sidebar Control",
  "/dashboard/system/errors": "Platform Errors",
  "/dashboard/settings": "Settings",
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith("/dashboard/users/") && pathname !== "/dashboard/users/onboarding") {
    return "User Details"
  }
  return "Dashboard"
}

export function SiteHeader() {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
