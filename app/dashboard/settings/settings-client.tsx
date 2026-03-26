"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import {
  KeyIcon,
  ShieldCheckIcon,
  DatabaseIcon,
  BarChart3Icon,
  ActivityIcon,
  ZapIcon,
  CheckCircleIcon,
  CircleSlashIcon,
  LockIcon,
} from "lucide-react"

interface SettingsClientProps {
  envStatus: {
    supabase: boolean
    posthogDashboard: boolean
    posthogApi: boolean
    openrouter: boolean
  }
}

const SERVICE_CONFIG = [
  {
    key: "supabase" as const,
    label: "Supabase",
    description: "Database & authentication",
    icon: DatabaseIcon,
    accent: "primary",
  },
  {
    key: "posthogDashboard" as const,
    label: "PostHog Dashboard",
    description: "Analytics dashboard embeds",
    icon: BarChart3Icon,
    accent: "amber",
  },
  {
    key: "posthogApi" as const,
    label: "PostHog API",
    description: "Session recordings & events",
    icon: ActivityIcon,
    accent: "amber",
  },
  {
    key: "openrouter" as const,
    label: "OpenRouter",
    description: "AI model routing & balance",
    icon: ZapIcon,
    accent: "emerald",
  },
]

const ACCENT_STYLES = {
  primary: {
    icon: "from-primary/15 to-primary/5 ring-primary/10",
    iconColor: "text-primary",
  },
  amber: {
    icon: "from-amber-500/15 to-amber-500/5 ring-amber-500/10",
    iconColor: "text-amber-500",
  },
  emerald: {
    icon: "from-emerald-500/15 to-emerald-500/5 ring-emerald-500/10",
    iconColor: "text-emerald-500",
  },
}

export function SettingsClient({ envStatus }: SettingsClientProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const connectedCount = Object.values(envStatus).filter(Boolean).length
  const totalServices = Object.values(envStatus).length

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPassword || !newPassword) return
    setLoading(true)
    toast.info("Password change via admin panel coming soon. Use the seed script for now.")
    setLoading(false)
    setCurrentPassword("")
    setNewPassword("")
  }

  return (
    <div className="space-y-6">
      {/* Admin Account Card */}
      <Card className="group/card relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/5 transition-all duration-300 hover:shadow-lg card-glow">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/3 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 pointer-events-none" />
        <CardHeader className="relative">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
              <ShieldCheckIcon className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle>Admin Account</CardTitle>
              <CardDescription>Manage your admin credentials</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <form onSubmit={handlePasswordChange} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="current-password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Current Password
                </Label>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                  <Input
                    id="current-password"
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-10 bg-muted/30 border-border/50 focus:bg-card transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  New Password
                </Label>
                <div className="relative">
                  <KeyIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 bg-muted/30 border-border/50 focus:bg-card transition-colors"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" disabled={loading} className="px-6">
                {loading ? "Updating..." : "Update Password"}
              </Button>
              <span className="text-xs text-muted-foreground">
                Password must be set via seed script for now
              </span>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Environment Status Card */}
      <Card className="group/card relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-emerald-500/3 transition-all duration-300 hover:shadow-lg card-glow">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/3 via-transparent to-primary/3 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 pointer-events-none" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 ring-1 ring-emerald-500/10">
                <DatabaseIcon className="size-5 text-emerald-500" />
              </div>
              <div>
                <CardTitle>Environment Status</CardTitle>
                <CardDescription>External service connections</CardDescription>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold tabular-nums">{connectedCount}/{totalServices}</p>
              <p className="text-xs text-muted-foreground">connected</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          {/* Status progress bar */}
          <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden mb-5">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${(connectedCount / totalServices) * 100}%` }}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {SERVICE_CONFIG.map((service) => {
              const isConnected = envStatus[service.key]
              const accent = ACCENT_STYLES[service.accent as keyof typeof ACCENT_STYLES]
              const Icon = service.icon

              return (
                <div
                  key={service.key}
                  className={`group/service flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all duration-200 ${
                    isConnected
                      ? "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/30 hover:bg-emerald-500/8"
                      : "border-border/40 bg-muted/20 hover:border-border/60 hover:bg-muted/30"
                  }`}
                >
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ring-1 ${accent.icon}`}>
                    <Icon className={`size-4 ${isConnected ? accent.iconColor : "text-muted-foreground/60"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isConnected ? "" : "text-muted-foreground"}`}>
                      {service.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{service.description}</p>
                  </div>
                  <div className="shrink-0">
                    {isConnected ? (
                      <CheckCircleIcon className="size-5 text-emerald-500" />
                    ) : (
                      <CircleSlashIcon className="size-5 text-muted-foreground/30" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
