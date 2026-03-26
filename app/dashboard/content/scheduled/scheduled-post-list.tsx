"use client"

import { useState, useEffect, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  GlobeIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  CopyIcon,
  ClipboardIcon,
  SendIcon,
  MessageSquareIcon,
} from "lucide-react"

interface ScheduledPost {
  id: string
  user_id: string
  content: string | null
  scheduled_for: string | null
  timezone: string | null
  status: string | null
  error_message: string | null
  posted_at: string | null
  created_at: string
  userName: string
}

function statusConfig(status: string | null) {
  switch (status) {
    case "posted":
      return { label: "Posted", color: "bg-green-500", textClass: "text-green-700 dark:text-green-400", bgClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800" }
    case "failed":
      return { label: "Failed", color: "bg-red-500", textClass: "text-red-700 dark:text-red-400", bgClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800" }
    default:
      return { label: "Pending", color: "bg-yellow-500", textClass: "text-yellow-700 dark:text-yellow-400", bgClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800" }
  }
}

function formatTimeRelative(dateStr: string | null): string {
  if (!dateStr) return "Not set"
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const absDiff = Math.abs(diffMs)
  const isFuture = diffMs > 0

  const mins = Math.floor(absDiff / 60000)
  const hours = Math.floor(absDiff / 3600000)
  const days = Math.floor(absDiff / 86400000)

  if (mins < 60) return isFuture ? `In ${mins}m` : `${mins}m ago`
  if (hours < 24) return isFuture ? `In ${hours}h` : `${hours}h ago`
  if (days < 7) return isFuture ? `In ${days}d` : `${days}d ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatFullSchedule(dateStr: string | null): string {
  if (!dateStr) return "Not set"
  return new Date(dateStr).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

// Safe unicode slice
function safeSlice(str: string, max: number): string {
  const chars = Array.from(str)
  if (chars.length <= max) return str
  return chars.slice(0, max).join("")
}

// Client-only text
function ClientText({ children, className }: { children: string; className?: string }) {
  const [m, setM] = useState(false)
  useEffect(() => { setM(true) }, [])
  if (!m) return <span className={className}>&nbsp;</span>
  return <span className={className}>{children}</span>
}

/* ── Status Breakdown Strip ── */
function StatusStrip({ posts }: { posts: ScheduledPost[] }) {
  const pending = posts.filter((p) => p.status !== "posted" && p.status !== "failed").length
  const posted = posts.filter((p) => p.status === "posted").length
  const failed = posts.filter((p) => p.status === "failed").length
  const total = posts.length

  const pendingPct = total > 0 ? (pending / total) * 100 : 0
  const postedPct = total > 0 ? (posted / total) * 100 : 0
  const failedPct = total > 0 ? (failed / total) * 100 : 0

  // Find next upcoming post
  const now = new Date()
  const upcoming = posts
    .filter((p) => p.status !== "posted" && p.status !== "failed" && p.scheduled_for)
    .sort((a, b) => new Date(a.scheduled_for!).getTime() - new Date(b.scheduled_for!).getTime())
    .find((p) => new Date(p.scheduled_for!).getTime() > now.getTime())

  return (
    <div className="rounded-xl border bg-card p-4 mb-5">
      {/* Segmented bar */}
      <div className="flex rounded-full h-3 overflow-hidden bg-muted gap-px">
        {pendingPct > 0 && (
          <div className="bg-yellow-500 rounded-l-full transition-all duration-700" style={{ width: `${pendingPct}%` }} />
        )}
        {postedPct > 0 && (
          <div className="bg-green-500 transition-all duration-700" style={{ width: `${postedPct}%` }} />
        )}
        {failedPct > 0 && (
          <div className="bg-red-500 rounded-r-full transition-all duration-700" style={{ width: `${failedPct}%` }} />
        )}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-yellow-500" />
          <span className="font-semibold tabular-nums">{pending}</span>
          <span className="text-muted-foreground">pending</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-green-500" />
          <span className="font-semibold tabular-nums">{posted}</span>
          <span className="text-muted-foreground">posted</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red-500" />
          <span className="font-semibold tabular-nums">{failed}</span>
          <span className="text-muted-foreground">failed</span>
        </span>
        {upcoming && (
          <span className="ml-auto text-muted-foreground">
            Next: <span className="font-medium text-foreground">{formatTimeRelative(upcoming.scheduled_for)}</span> · {upcoming.userName}
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Main Component ── */
export function ScheduledPostList({ posts }: { posts: ScheduledPost[] }) {
  const [selected, setSelected] = useState<ScheduledPost | null>(null)

  // Group posts by time bucket
  const grouped = useMemo(() => {
    const now = new Date()
    const groups: { label: string; posts: ScheduledPost[] }[] = []
    const buckets = new Map<string, ScheduledPost[]>()

    const sorted = [...posts].sort((a, b) => {
      const aTime = a.scheduled_for ? new Date(a.scheduled_for).getTime() : 0
      const bTime = b.scheduled_for ? new Date(b.scheduled_for).getTime() : 0
      return bTime - aTime // newest first
    })

    for (const post of sorted) {
      const schedDate = post.scheduled_for ? new Date(post.scheduled_for) : null
      let bucket: string

      if (!schedDate) {
        bucket = "Unscheduled"
      } else {
        const diffMs = schedDate.getTime() - now.getTime()
        const diffHours = diffMs / 3600000
        const diffDays = diffMs / 86400000

        if (diffHours > 0 && diffHours <= 6) bucket = "Next 6 hours"
        else if (diffHours > 6 && diffDays <= 1) bucket = "Today"
        else if (diffDays > 1 && diffDays <= 3) bucket = "Next 3 days"
        else if (diffDays > 3) bucket = "Later"
        else if (diffHours > -24 && diffHours <= 0) bucket = "Last 24 hours"
        else if (diffDays >= -7 && diffDays <= -1) bucket = "This week"
        else bucket = "Earlier"
      }

      if (!buckets.has(bucket)) buckets.set(bucket, [])
      buckets.get(bucket)!.push(post)
    }

    // Ordered display
    const order = ["Next 6 hours", "Today", "Next 3 days", "Later", "Last 24 hours", "This week", "Earlier", "Unscheduled"]
    for (const label of order) {
      const items = buckets.get(label)
      if (items && items.length > 0) groups.push({ label, posts: items })
    }

    return groups
  }, [posts])

  return (
    <div className="space-y-0">
      <StatusStrip posts={posts} />

      {/* Timeline */}
      <div className="relative ml-4">
        {/* Vertical line */}
        <div className="absolute left-[5px] top-0 bottom-0 w-px bg-border" />

        {grouped.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? "mt-2" : ""}>
            {/* Time bucket header */}
            <div className="relative flex items-center gap-3 py-2">
              <div className="relative z-10 size-[11px] rounded-full bg-muted border-2 border-background" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</span>
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground tabular-nums">{group.posts.length}</span>
            </div>

            {/* Posts in this bucket */}
            {group.posts.map((post, pi) => {
              const config = statusConfig(post.status)
              return (
                <div key={post.id} className="relative pl-8 pb-3">
                  {/* Status dot on timeline */}
                  <div className={`absolute left-0 top-3 size-[11px] rounded-full border-2 border-background ${config.color}`} />

                  {/* Card */}
                  <div
                    className="rounded-xl border bg-card p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20 animate-slide-up"
                    style={{ animationDelay: `${Math.min((gi * 3 + pi) * 40, 400)}ms`, animationFillMode: "both" }}
                    onClick={() => setSelected(post)}
                  >
                    {/* Top: status + schedule time + timezone */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <Badge className={config.bgClass} variant="outline">
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatFullSchedule(post.scheduled_for)}
                      </span>
                      {post.timezone && (
                        <span className="text-[10px] text-muted-foreground/60 ml-auto flex items-center gap-1">
                          <GlobeIcon className="size-2.5" />
                          {post.timezone.split("/").pop()?.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>

                    {/* Content preview */}
                    <p className="text-sm leading-relaxed line-clamp-3 mb-3">
                      <ClientText>{safeSlice(post.content || "No content", 180)}</ClientText>
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t">
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="size-3" />
                        <span className="font-medium">{post.userName}</span>
                      </div>
                      <span className="tabular-nums font-medium">{formatTimeRelative(post.scheduled_for)}</span>
                    </div>

                    {/* Error callout */}
                    {post.error_message && (
                      <div className="mt-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2 flex items-start gap-2">
                        <AlertCircleIcon className="size-3.5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-red-700 dark:text-red-300 line-clamp-1">{post.error_message}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* ── Detail Sheet — 40% ── */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="!w-full sm:!w-[40vw] sm:!max-w-[40vw] overflow-y-auto p-0">
          {selected && (() => {
            const config = statusConfig(selected.status)
            return (
              <>
                {/* Status banner header */}
                <SheetHeader className="px-5 pt-5 pb-3 border-b">
                  <SheetTitle className="flex items-center gap-2.5">
                    {selected.status === "posted" ? (
                      <CheckCircle2Icon className="size-5 text-green-600" />
                    ) : selected.status === "failed" ? (
                      <AlertCircleIcon className="size-5 text-red-600" />
                    ) : (
                      <ClockIcon className="size-5 text-yellow-600" />
                    )}
                    <Badge className={config.bgClass} variant="outline">{config.label}</Badge>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {formatTimeRelative(selected.scheduled_for)}
                    </span>
                  </SheetTitle>
                  <SheetDescription className="text-xs">
                    {formatFullSchedule(selected.scheduled_for)}
                    {selected.timezone && ` · ${selected.timezone}`}
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-4 px-5 py-4">
                  {/* LinkedIn-style preview card */}
                  <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                    <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                        {selected.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold leading-tight truncate">{selected.userName}</p>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-px">
                          {formatFullSchedule(selected.scheduled_for)}
                        </p>
                      </div>
                    </div>
                    <div className="px-4 py-3" suppressHydrationWarning>
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed" suppressHydrationWarning>
                        <ClientText>{selected.content || "No content available"}</ClientText>
                      </p>
                    </div>
                    {/* Meta line */}
                    <div className="px-4 pb-2">
                      <p className="text-[11px] text-muted-foreground text-right tabular-nums">
                        {(selected.content || "").split(/\s+/).filter(Boolean).length} words · {(selected.content || "").length.toLocaleString("en-US")} chars
                      </p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center border-t divide-x">
                      <button
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(selected.content || ""); toast.success("Post copied") }}
                      >
                        <CopyIcon className="size-3" /> Copy
                      </button>
                      <button
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          const text = `Scheduled: ${formatFullSchedule(selected.scheduled_for)}\nUser: ${selected.userName}\nTimezone: ${selected.timezone || "N/A"}\nStatus: ${config.label}\n\n${selected.content || ""}`
                          navigator.clipboard.writeText(text); toast.success("Copied with details")
                        }}
                      >
                        <ClipboardIcon className="size-3" /> Copy All
                      </button>
                      <button
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          const blob = new Blob([selected.content || ""], { type: "text/plain" })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement("a"); a.href = url
                          a.download = `scheduled-${selected.id.slice(0, 8)}.txt`; a.click()
                          URL.revokeObjectURL(url); toast.success("Exported")
                        }}
                      >
                        <SendIcon className="size-3" /> Export
                      </button>
                    </div>
                  </div>

                  {/* Scheduling details */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">User</p>
                      <p className="text-xs font-medium mt-0.5 truncate">{selected.userName}</p>
                    </div>
                    <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Timezone</p>
                      <p className="text-xs font-medium mt-0.5">{selected.timezone || "N/A"}</p>
                    </div>
                    <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Created</p>
                      <p className="text-xs font-medium mt-0.5 tabular-nums">
                        {new Date(selected.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    {selected.posted_at && (
                      <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Posted At</p>
                        <p className="text-xs font-medium mt-0.5 tabular-nums">
                          {new Date(selected.posted_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Error details */}
                  {selected.error_message && (
                    <>
                      <Separator />
                      <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <AlertCircleIcon className="size-3.5 text-red-500" />
                          <span className="text-xs font-semibold text-red-700 dark:text-red-400">Error Details</span>
                        </div>
                        <p className="text-xs text-red-600 dark:text-red-300 leading-relaxed break-words whitespace-pre-wrap">
                          {selected.error_message}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>
    </div>
  )
}
