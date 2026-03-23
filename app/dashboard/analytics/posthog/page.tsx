import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { EmptyState } from "@/components/empty-state"
import { BarChartIcon } from "lucide-react"

export default async function PostHogAnalyticsPage() {
  const dashboardUrl = process.env.POSTHOG_DASHBOARD_URL

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <h1 className="text-2xl font-bold">PostHog Analytics</h1>

      <Card>
        <CardHeader>
          <CardTitle>PostHog Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboardUrl ? (
            <iframe
              src={dashboardUrl}
              className="h-[800px] w-full rounded-lg border-0"
              title="PostHog Dashboard"
              allow="fullscreen"
            />
          ) : (
            <EmptyState
              title="PostHog Dashboard Not Configured"
              description="To embed your PostHog dashboard:"
              icon={<BarChartIcon className="size-12" />}
            />
            <div className="space-y-2 text-sm text-muted-foreground px-4">
              <p>1. Go to your PostHog project &rarr; Dashboards</p>
              <p>2. Click &quot;Share&quot; on a dashboard &rarr; Enable sharing</p>
              <p>3. Copy the shared URL</p>
              <p>4. Set <code className="bg-muted px-1 rounded">POSTHOG_DASHBOARD_URL</code> in your .env.local</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
