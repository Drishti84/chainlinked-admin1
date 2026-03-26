"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { MetricCard } from "@/components/metric-card"
import {
  AlertTriangleIcon,
  BugIcon,
  ExternalLinkIcon,
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

  return date.toLocaleDateString()
}

function getLevelBadgeVariant(level: string) {
  switch (level) {
    case "error":
    case "fatal":
      return "destructive" as const
    case "warning":
      return "secondary" as const
    default:
      return "outline" as const
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

    try {
      const res = await fetch(
        "/api/admin/sentry/issues?query=is:unresolved&sort=date&limit=50"
      )

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Failed to fetch issues")
        return
      }

      const data = await res.json()
      setIssues(data.issues || [])
    } catch {
      setError("Failed to connect to Sentry API")
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
