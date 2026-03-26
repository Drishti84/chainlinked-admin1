"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboardIcon,
  UsersIcon,
  FileTextIcon,
  BarChart3Icon,
  CogIcon,
  CalendarIcon,
  LayoutTemplateIcon,
  BrainCircuitIcon,
  CoinsIcon,
  ActivityIcon,
  MonitorIcon,
  ZapIcon,
  LayoutPanelLeftIcon,
  AlertTriangleIcon,
  DollarSignIcon,
  SettingsIcon,
  LogOutIcon,
} from "lucide-react"
import Image from "next/image"

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
    ],
  },
  {
    label: "Users",
    items: [
      { title: "All Users", url: "/dashboard/users", icon: UsersIcon },
      { title: "Onboarding Funnel", url: "/dashboard/users/onboarding", icon: ActivityIcon },
    ],
  },
  {
    label: "Content",
    items: [
      { title: "Generated Posts", url: "/dashboard/content/generated", icon: FileTextIcon },
      { title: "Scheduled Posts", url: "/dashboard/content/scheduled", icon: CalendarIcon },
      { title: "Templates", url: "/dashboard/content/templates", icon: LayoutTemplateIcon },
      { title: "AI Activity", url: "/dashboard/content/ai-activity", icon: BrainCircuitIcon },
    ],
  },
  {
    label: "Analytics",
    items: [
      { title: "AI Performance", url: "/dashboard/analytics/ai-performance", icon: ZapIcon },
      { title: "Token Usage", url: "/dashboard/analytics/tokens", icon: CoinsIcon },
      { title: "Feature Usage", url: "/dashboard/analytics/features", icon: BarChart3Icon },
      { title: "PostHog", url: "/dashboard/analytics/posthog", icon: MonitorIcon },
      { title: "Costs", url: "/dashboard/analytics/costs", icon: DollarSignIcon },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Background Jobs", url: "/dashboard/system/jobs", icon: CogIcon },
      { title: "Sidebar Control", url: "/dashboard/system/flags", icon: LayoutPanelLeftIcon },
      { title: "Errors", url: "/dashboard/system/errors", icon: AlertTriangleIcon },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Admin Account", url: "/dashboard/settings", icon: SettingsIcon },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="bg-gradient-to-b from-primary/5 to-transparent pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <a href="/dashboard" className="flex items-center gap-2">
                <Image src="/logo.png" alt="ChainLinked" width={24} height={24} className="size-6 rounded-md object-contain" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold leading-tight">ChainLinked</span>
                    <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] font-medium text-primary leading-none">v1.0</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground leading-tight">Admin Panel</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="mb-1 mt-2 text-[11px] uppercase tracking-wider">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = pathname === item.url
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={active ? "border-l-2 border-primary bg-primary/5 font-medium" : ""}
                      >
                        <a href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className="border-t pt-3 space-y-2">
          <div className="flex items-center gap-2 px-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">A</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">Administrator</p>
              <p className="text-[10px] text-muted-foreground">Admin Account</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 dark:hover:text-red-400"
            onClick={handleLogout}
          >
            <LogOutIcon className="mr-2 size-4" />
            Sign out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
