import { SettingsClient } from "./settings-client"

export default function SettingsPage() {
  const envStatus = {
    supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    posthogDashboard: !!process.env.POSTHOG_DASHBOARD_URL,
    posthogApi: !!process.env.POSTHOG_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Admin account and environment configuration</p>
      </div>
      <SettingsClient envStatus={envStatus} />
    </div>
  )
}
