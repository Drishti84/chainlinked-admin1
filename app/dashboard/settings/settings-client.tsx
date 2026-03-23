"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface SettingsClientProps {
  envStatus: {
    supabase: boolean
    posthogDashboard: boolean
    posthogApi: boolean
    openrouter: boolean
  }
}

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
    <div className="space-y-6 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Account</CardTitle>
          <CardDescription>Manage your admin credentials</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="max-w-sm space-y-4">
            <div className="space-y-1">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Status</CardTitle>
          <CardDescription>Configuration status of external services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Supabase", configured: envStatus.supabase },
              { label: "PostHog Dashboard", configured: envStatus.posthogDashboard },
              { label: "PostHog API", configured: envStatus.posthogApi },
              { label: "OpenRouter", configured: envStatus.openrouter },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm">{item.label}</span>
                <Badge variant={item.configured ? "default" : "secondary"}>
                  {item.configured ? "Connected" : "Not configured"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
