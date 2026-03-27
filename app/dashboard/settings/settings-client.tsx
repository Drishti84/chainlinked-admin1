"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

interface SettingsClientProps {
  envStatus: {
    supabase: boolean
    posthogDashboard: boolean
    posthogApi: boolean
    openrouter: boolean
  }
}

const services = [
  { key: "supabase" as const, label: "Supabase", description: "Database & Auth" },
  { key: "posthogDashboard" as const, label: "PostHog Dashboard", description: "Analytics dashboard" },
  { key: "posthogApi" as const, label: "PostHog API", description: "Event tracking" },
  { key: "openrouter" as const, label: "OpenRouter", description: "AI model routing" },
]

export function SettingsClient({ envStatus }: SettingsClientProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [loading, setLoading] = useState(false)

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
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Left: Profile + Password */}
      <div className="space-y-5">
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
              A
            </div>
            <div>
              <h2 className="text-lg font-semibold">Administrator</h2>
              <p className="text-sm text-muted-foreground">Admin account</p>
            </div>
            <Badge variant="default" className="ml-auto">
              Admin
            </Badge>
          </div>
          <Separator />
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-4">Change Password</h3>
            <form onSubmit={handlePasswordChange} className="max-w-sm space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Change Password"}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Right: Environment + System Info */}
      <div className="space-y-5">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Environment Status</h3>
          <div className="space-y-3">
            {services.map((service) => {
              const configured = envStatus[service.key]
              return (
                <div key={service.key} className="flex items-center gap-3">
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      configured ? "bg-green-500" : "bg-muted-foreground/40"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none">{service.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{service.description}</p>
                  </div>
                  <Badge
                    variant={configured ? "default" : "secondary"}
                    className="shrink-0 text-xs"
                  >
                    {configured ? "Connected" : "Not configured"}
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">System Info</h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Environment</span>
              <span className="text-sm font-medium">
                {process.env.NODE_ENV ?? "development"}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Next.js</span>
              <span className="text-sm font-medium">15.x</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Platform</span>
              <span className="text-sm font-medium">Vercel</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
