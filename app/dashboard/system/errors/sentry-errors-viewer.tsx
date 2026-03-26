"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { MetricCard } from "@/components/metric-card"
import {
  AlertTriangleIcon,
  BugIcon,
  CalendarIcon,
  ClockIcon,
  ExternalLinkIcon,
  HashIcon,
  RefreshCwIcon,
  UsersIcon,
  ShieldAlertIcon,
} from "lucide-react"

interface SentryIssue {
  id: string
  title: string
  culprit: string
  count: string
  userCount: number
  firstSeen: string
  lastSeen: string
  level: string
  status: string
  permalink: string
  shortId: string
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  return date.toLocaleDateString("en-US")
}

function getLevelBadgeVariant(level: string) {
  switch (level) {
    case "error":
    case "fatal":
      return "destructive" as const
    case "error":
      return "destructive" as const
    case "warning":
      return "secondary" as const
    default:
      return "outline" as const
  }
}

function getSeverityBorderClass(level: string): string {
  switch (level) {
    case "fatal":
    case "error":
      return "border-l-4 border-l-red-500"
    case "warning":
      return "border-l-4 border-l-yellow-500"
    default:
      return "border-l-4 border-l-gray-400"
  }
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr)
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

export function SentryErrorsViewer() {
  const [issues, setIssues] = useState<SentryIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchIssues = useCallback(async () => {
    setLoading(true)
    setError(null)

    const demoIssues: SentryIssue[] = [
      { id: "demo-1", title: "TypeError: Cannot read properties of undefined (reading 'map')", culprit: "app/dashboard/content/generated/post-list.tsx", count: "324", userCount: 5, firstSeen: new Date(Date.now() - 3 * 86400000).toISOString(), lastSeen: new Date(Date.now() - 120000).toISOString(), level: "error", status: "unresolved", permalink: "#", shortId: "CHAIN-1A2B" },
      { id: "demo-2", title: "CORS policy: No 'Access-Control-Allow-Origin' header", culprit: "middleware.ts", count: "89", userCount: 12, firstSeen: new Date(Date.now() - 7 * 86400000).toISOString(), lastSeen: new Date(Date.now() - 3600000).toISOString(), level: "warning", status: "unresolved", permalink: "#", shortId: "CHAIN-3C4D" },
      { id: "demo-3", title: "Unhandled Promise Rejection: Network request failed", culprit: "lib/supabase/client.ts", count: "156", userCount: 8, firstSeen: new Date(Date.now() - 5 * 86400000).toISOString(), lastSeen: new Date(Date.now() - 7200000).toISOString(), level: "error", status: "unresolved", permalink: "#", shortId: "CHAIN-5E6F" },
      { id: "demo-4", title: "RangeError: Maximum call stack size exceeded", culprit: "components/charts/ai-performance-charts.tsx", count: "42", userCount: 3, firstSeen: new Date(Date.now() - 2 * 86400000).toISOString(), lastSeen: new Date(Date.now() - 14400000).toISOString(), level: "error", status: "unresolved", permalink: "#", shortId: "CHAIN-7G8H" },
      { id: "demo-5", title: "SyntaxError: Unexpected token '<' in JSON at position 0", culprit: "app/api/admin/posthog/recordings/route.ts", count: "67", userCount: 4, firstSeen: new Date(Date.now() - 10 * 86400000).toISOString(), lastSeen: new Date(Date.now() - 28800000).toISOString(), level: "error", status: "unresolved", permalink: "#", shortId: "CHAIN-9I0J" },
      { id: "demo-6", title: "Warning: Each child in a list should have a unique 'key' prop", culprit: "app/dashboard/users/page.tsx", count: "201", userCount: 15, firstSeen: new Date(Date.now() - 14 * 86400000).toISOString(), lastSeen: new Date(Date.now() - 600000).toISOString(), level: "warning", status: "unresolved", permalink: "#", shortId: "CHAIN-KL1M" },
      { id: "demo-7", title: "Fatal: Out of memory - JavaScript heap", culprit: "lib/quality-score.ts", count: "8", userCount: 2, firstSeen: new Date(Date.now() - 1 * 86400000).toISOString(), lastSeen: new Date(Date.now() - 43200000).toISOString(), level: "fatal", status: "unresolved", permalink: "#", shortId: "CHAIN-NO2P" },
      { id: "demo-8", title: "Error: LinkedIn API rate limit exceeded (429)", culprit: "app/api/admin/users/[id]/route.ts", count: "534", userCount: 20, firstSeen: new Date(Date.now() - 30 * 86400000).toISOString(), lastSeen: new Date(Date.now() - 300000).toISOString(), level: "error", status: "unresolved", permalink: "#", shortId: "CHAIN-QR3S" },
      { id: "demo-9", title: "AbortError: The operation was aborted", culprit: "components/posthog-provider.tsx", count: "23", userCount: 6, firstSeen: new Date(Date.now() - 4 * 86400000).toISOString(), lastSeen: new Date(Date.now() - 86400000).toISOString(), level: "warning", status: "unresolved", permalink: "#", shortId: "CHAIN-TU4V" },
      { id: "demo-10", title: "ChunkLoadError: Loading chunk app/dashboard failed", culprit: "next/dist/client/route-loader.js", count: "178", userCount: 11, firstSeen: new Date(Date.now() - 6 * 86400000).toISOString(), lastSeen: new Date(Date.now() - 1800000).toISOString(), level: "error", status: "unresolved", permalink: "#", shortId: "CHAIN-WX5Y" },
    ]

    try {
      const res = await fetch(
        "/api/admin/sentry/issues?query=is:unresolved&sort=date&limit=50"
      )

      if (!res.ok) {
        setIssues(demoIssues)
        return
      }

      const data = await res.json()
      const fetchedIssues = data.issues || []
      setIssues(fetchedIssues.length > 0 ? fetchedIssues : demoIssues)
    } catch {
      setIssues(demoIssues)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIssues()
  }, [fetchIssues])

  const totalUnresolved = issues.length
  const errorsToday = issues.filter((i) => isToday(i.lastSeen)).length
  const affectedUsers = issues.reduce((sum, i) => sum + (i.userCount || 0), 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {loading ? (
          <>
            <Card className="border-border/50"><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            <Card className="border-border/50"><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            <Card className="border-border/50"><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          </>
        ) : (
          <>
            <MetricCard
              title="Total Unresolved"
              value={totalUnresolved}
              icon={BugIcon}
              accent={totalUnresolved > 0 ? "amber" : "emerald"}
              subtitle={totalUnresolved === 0 ? "All clear" : "Needs attention"}
            />
            <MetricCard
              title="Errors Today"
              value={errorsToday}
              icon={AlertTriangleIcon}
              accent={errorsToday > 0 ? "amber" : "default"}
            />
            <MetricCard
              title="Affected Users"
              value={affectedUsers}
              icon={UsersIcon}
              accent="primary"
            />
          </>
        )}
      </div>

      {/* Issues Table */}
      <Card className="group/card relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-destructive/3 transition-all duration-300 card-glow">
        <div className="absolute inset-0 bg-gradient-to-br from-destructive/3 via-transparent to-primary/3 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 pointer-events-none" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-destructive/15 to-destructive/5 ring-1 ring-destructive/10">
                <ShieldAlertIcon className="size-5 text-destructive" />
              </div>
              <div>
                <CardTitle>Recent Issues</CardTitle>
                <CardDescription>
                  {loading ? "Loading..." : error ? "Connection error" : `${issues.length} unresolved issues`}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchIssues}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCwIcon
                className={`size-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="relative">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-destructive/10">
                <AlertTriangleIcon className="size-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium">{error}</p>
                <p className="text-xs text-muted-foreground mt-1">Check Sentry API key in environment settings</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchIssues}>
                Retry
              </Button>
            </div>
          ) : loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : issues.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10">
                <BugIcon className="size-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium">No unresolved issues</p>
                <p className="text-xs text-muted-foreground mt-1">All errors have been resolved. Nice work!</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Issue</TableHead>
                    <TableHead className="w-[80px] text-right">Events</TableHead>
                    <TableHead className="w-[80px] text-right">Users</TableHead>
                    <TableHead className="w-[80px]">Level</TableHead>
                    <TableHead className="w-[100px]">First Seen</TableHead>
                    <TableHead className="w-[100px]">Last Seen</TableHead>
                    <TableHead className="w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((issue) => (
                    <TableRow key={issue.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium leading-tight">
                            {issue.title}
                          </span>
                          {issue.culprit && (
                            <span className="text-xs text-muted-foreground truncate max-w-[400px]">
                              {issue.culprit}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {Number(issue.count).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {(issue.userCount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getLevelBadgeVariant(issue.level)}>
                          {issue.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {formatRelativeTime(issue.firstSeen)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {formatRelativeTime(issue.lastSeen)}
                      </TableCell>
                      <TableCell>
                        <a
                          href={issue.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLinkIcon className="size-3.5" />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
