import { SettingsClient } from "./settings-client"

export default function SettingsPage() {
  const envStatus = {
    supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    posthogDashboard: !!process.env.POSTHOG_DASHBOARD_URL,
    posthogApi: !!process.env.POSTHOG_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Manage your admin account and environment configuration.
        </p>
      </div>
      <SettingsClient envStatus={envStatus} />
    </div>
  )
}
