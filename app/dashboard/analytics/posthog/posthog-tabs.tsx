"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCwIcon, ExternalLinkIcon, PlayIcon, MousePointerClickIcon, BarChartIcon } from "lucide-react"

interface Recording {
  id: string
  distinct_id: string
  viewed: boolean
  start_time: string
  end_time: string
  recording_duration: number
  active_seconds: number
  click_count: number
  keypress_count: number
  console_error_count: number
  start_url: string
}

interface PostHogTabsProps {
  dashboardUrl: string | null
  posthogHost: string
  projectId: string
  apiKey: string
}

export function PostHogTabs({ dashboardUrl, posthogHost, projectId, apiKey }: PostHogTabsProps) {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loadingRecordings, setLoadingRecordings] = useState(true)
  const [recordingsError, setRecordingsError] = useState<string | null>(null)

  async function fetchRecordings() {
    setLoadingRecordings(true)
    setRecordingsError(null)
    try {
      const res = await fetch(`/api/admin/posthog/recordings`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setRecordings(data.results || [])
    } catch (err) {
      setRecordingsError(err instanceof Error ? err.message : "Failed to fetch")
    } finally {
      setLoadingRecordings(false)
    }
  }

  useEffect(() => {
    fetchRecordings()
  }, [])

  function formatDuration(seconds: number) {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}m ${secs}s`
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Tabs defaultValue="dashboard">
      <TabsList>
        <TabsTrigger value="dashboard">
          <BarChartIcon className="mr-1.5 size-3.5" />
          Dashboard
        </TabsTrigger>
        <TabsTrigger value="recordings">
          <PlayIcon className="mr-1.5 size-3.5" />
          Session Replays
        </TabsTrigger>
        <TabsTrigger value="heatmaps">
          <MousePointerClickIcon className="mr-1.5 size-3.5" />
          Heatmaps
        </TabsTrigger>
      </TabsList>

      {/* Dashboard Tab */}
      <TabsContent value="dashboard">
        <Card>
          <CardHeader>
            <CardTitle>PostHog Dashboard</CardTitle>
            <CardDescription>Embedded analytics dashboard</CardDescription>
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
              <div className="text-center py-12 text-muted-foreground">
                <p className="mb-2">No shared dashboard URL configured.</p>
                <p className="text-sm">
                  Set <code className="bg-muted px-1 rounded">POSTHOG_DASHBOARD_URL</code> in .env.local
                  with a shared dashboard link from PostHog.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Session Replays Tab */}
      <TabsContent value="recordings" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Session Replays</CardTitle>
                <CardDescription>Recent user sessions from ChainLinked</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={fetchRecordings} disabled={loadingRecordings}>
                  <RefreshCwIcon className={`mr-1.5 size-3.5 ${loadingRecordings ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <a
                  href={`${posthogHost}/project/${projectId}/replay/recent`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLinkIcon className="mr-1.5 size-3.5" />
                    Open in PostHog
                  </Button>
                </a>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingRecordings ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recordingsError ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-1">Failed to load recordings</p>
                <p className="text-sm text-destructive">{recordingsError}</p>
              </div>
            ) : recordings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No session recordings found. Make sure session replay is enabled in ChainLinked&apos;s PostHog config.
              </div>
            ) : (
              <div className="space-y-2">
                {recordings.map((rec) => (
                  <a
                    key={rec.id}
                    href={`${posthogHost}/project/${projectId}/replay/${rec.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
                        <PlayIcon className="size-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {rec.distinct_id?.slice(0, 12) || "Anonymous"}
                          </span>
                          {!rec.viewed && <Badge variant="default" className="text-[10px] px-1.5 py-0">New</Badge>}
                          {rec.console_error_count > 0 && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              {rec.console_error_count} error{rec.console_error_count > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate max-w-md">
                          {rec.start_url?.replace(/^https?:\/\//, "") || "Unknown page"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{formatDuration(rec.recording_duration)}</span>
                      <span>{rec.click_count} clicks</span>
                      <span>{formatDate(rec.start_time)}</span>
                      <ExternalLinkIcon className="size-3.5" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Heatmaps Tab */}
      <TabsContent value="heatmaps">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Heatmaps</CardTitle>
                <CardDescription>See where users click on ChainLinked</CardDescription>
              </div>
              <a
                href={`${posthogHost}/project/${projectId}/heatmaps`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <ExternalLinkIcon className="mr-1.5 size-3.5" />
                  Open Heatmaps in PostHog
                </Button>
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <MousePointerClickIcon className="size-10 mb-4 opacity-40" />
              <p className="mb-2 text-sm font-medium">Heatmaps cannot be embedded</p>
              <p className="text-xs max-w-md">
                PostHog heatmaps require authentication and block iframe embedding.
                Use the button above to view heatmaps directly in PostHog.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
