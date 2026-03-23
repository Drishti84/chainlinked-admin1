import { SettingsClient } from "./settings-client"

export default function SettingsPage() {
  const envStatus = {
    supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    posthogDashboard: !!process.env.POSTHOG_DASHBOARD_URL,
    posthogApi: !!process.env.POSTHOG_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
  }

  return <SettingsClient envStatus={envStatus} />
}
