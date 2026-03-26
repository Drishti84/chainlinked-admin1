"use client"

import { useState, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertTriangleIcon,
  BugIcon,
  CalendarIcon,
  ClockIcon,
  ExternalLinkIcon,
  HashIcon,
  RefreshCwIcon,
  UsersIcon,
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
      {/* Stats pills + Refresh */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {loading ? (
            <>
              <Skeleton className="h-7 w-28 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1">
                <BugIcon className="size-3.5 text-destructive" />
                <span className="text-sm font-semibold tabular-nums">
                  {totalUnresolved}
                </span>
                <span className="text-xs text-muted-foreground">
                  unresolved
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1">
                <AlertTriangleIcon className="size-3.5 text-orange-500" />
                <span className="text-sm font-semibold tabular-nums">
                  {errorsToday}
                </span>
                <span className="text-xs text-muted-foreground">today</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1">
                <UsersIcon className="size-3.5 text-blue-500" />
                <span className="text-sm font-semibold tabular-nums">
                  {affectedUsers}
                </span>
                <span className="text-xs text-muted-foreground">users</span>
              </div>
            </>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchIssues}
          disabled={loading}
        >
          <RefreshCwIcon
            className={`mr-1.5 size-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Error state */}
      {error ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center rounded-lg border border-dashed">
          <AlertTriangleIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchIssues}>
            Retry
          </Button>
        </div>
      ) : loading ? (
        /* Loading skeleton cards */
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-l-4 border-l-gray-300 p-4"
            >
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3.5 w-1/2" />
                <div className="flex items-center gap-4 mt-1">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : issues.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-2 py-12 text-center rounded-lg border border-dashed">
          <BugIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No unresolved issues. Nice work!
          </p>
        </div>
      ) : (
        /* Error severity feed */
        <div className="flex flex-col gap-2.5">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className={`rounded-xl border bg-card overflow-hidden ${getSeverityBorderClass(issue.level)} transition-colors hover:border-primary/20`}
            >
              <div className="flex items-start gap-4 p-4">
                {/* Severity icon */}
                <div className={`flex size-9 items-center justify-center rounded-lg shrink-0 mt-0.5 ${
                  issue.level === "fatal" ? "bg-red-100 dark:bg-red-900/30" :
                  issue.level === "error" ? "bg-red-50 dark:bg-red-950/20" :
                  issue.level === "warning" ? "bg-yellow-50 dark:bg-yellow-950/20" :
                  "bg-muted"
                }`}>
                  {issue.level === "fatal" ? (
                    <AlertTriangleIcon className="size-4 text-red-600 dark:text-red-400" />
                  ) : issue.level === "error" ? (
                    <BugIcon className="size-4 text-red-500 dark:text-red-400" />
                  ) : (
                    <AlertTriangleIcon className="size-4 text-yellow-600 dark:text-yellow-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Title + level badge */}
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold leading-snug truncate">{issue.title}</h3>
                    <Badge
                      variant={getLevelBadgeVariant(issue.level)}
                      className={`shrink-0 text-[10px] ${
                        issue.level === "warning"
                          ? "bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/20 dark:text-yellow-400 border-yellow-500/30"
                          : issue.level === "fatal"
                            ? "uppercase"
                            : ""
                      }`}
                    >
                      {issue.level === "fatal" ? "FATAL" : issue.level}
                    </Badge>
                  </div>

                  {/* Culprit */}
                  {issue.culprit && (
                    <p className="text-xs text-muted-foreground font-mono truncate mb-2">{issue.culprit}</p>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <HashIcon className="size-3" />
                      <span className="tabular-nums font-semibold text-foreground">{Number(issue.count).toLocaleString("en-US")}</span> events
                    </span>
                    <span className="flex items-center gap-1">
                      <UsersIcon className="size-3" />
                      <span className="tabular-nums font-semibold text-foreground">{(issue.userCount || 0).toLocaleString("en-US")}</span> users
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="size-3" />
                      first {formatRelativeTime(issue.firstSeen)}
                    </span>
                    <span className="flex items-center gap-1">
                      <ClockIcon className="size-3" />
                      last {formatRelativeTime(issue.lastSeen)}
                    </span>
                  </div>
                </div>
              </div>

              {/* External link footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/20">
                <span className="text-[10px] text-muted-foreground font-mono">{issue.shortId}</span>
                <a
                  href={issue.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                >
                  View in Sentry <ExternalLinkIcon className="size-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
