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
  ShieldIcon,
  BrainCircuitIcon,
  CoinsIcon,
  ActivityIcon,
  MonitorIcon,
  ScrollTextIcon,
  FlagIcon,
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
      { title: "Moderation", url: "/dashboard/content/moderation", icon: ShieldIcon },
      { title: "AI Activity", url: "/dashboard/content/ai-activity", icon: BrainCircuitIcon },
    ],
  },
  {
    label: "Analytics",
    items: [
      { title: "Token Usage", url: "/dashboard/analytics/tokens", icon: CoinsIcon },
      { title: "Feature Usage", url: "/dashboard/analytics/features", icon: BarChart3Icon },
      { title: "PostHog", url: "/dashboard/analytics/posthog", icon: MonitorIcon },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Background Jobs", url: "/dashboard/system/jobs", icon: CogIcon },
      { title: "Prompts", url: "/dashboard/system/prompts", icon: ScrollTextIcon },
      { title: "Feature Flags", url: "/dashboard/system/flags", icon: FlagIcon },
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
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="/dashboard">
                <Image src="/logo.png" alt="ChainLinked" width={20} height={20} className="size-5 rounded-sm object-contain" />
                <span className="text-base font-semibold">ChainLinked Admin</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                    >
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOutIcon className="mr-2 size-4" />
          Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
