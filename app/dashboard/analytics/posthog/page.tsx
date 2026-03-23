import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
            <>
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
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session Replays</CardTitle>
          <CardDescription>Watch user sessions on the ChainLinked platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="default">Enabled</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Session replays are available directly in your PostHog project. To view recordings:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Open your PostHog project dashboard</li>
            <li>Navigate to <strong>Session Replay</strong> in the left sidebar</li>
            <li>Browse or filter recordings by user, date, or events</li>
            <li>Click any session to watch the full replay</li>
          </ol>
          <p className="text-sm text-muted-foreground">
            Recordings capture DOM replay, network requests, console logs, and canvas elements
            for a complete picture of user behavior.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Heatmaps &amp; Toolbar</CardTitle>
          <CardDescription>See where users click on any page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use the PostHog toolbar to visualize click heatmaps on any page of the live site:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Go to your PostHog project and click <strong>Toolbar</strong> in the left sidebar</li>
            <li>Click <strong>Launch Toolbar</strong> and select your site URL</li>
            <li>The toolbar overlay will load on your site with heatmap controls</li>
            <li>Toggle the heatmap to see click density across the page</li>
            <li>Use the toolbar to inspect elements, create actions, and view feature flags</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
