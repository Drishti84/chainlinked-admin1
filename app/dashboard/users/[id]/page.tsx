import { notFound } from "next/navigation"
import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/client"
import { MetricCard } from "@/components/metric-card"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { UserActions } from "./user-actions"
import {
  FileTextIcon,
  SendIcon,
  LayoutTemplateIcon,
  CoinsIcon,
  MailIcon,
  CalendarIcon,
  CheckCircleIcon,
  LinkedinIcon,
  MonitorSmartphoneIcon,
  ArrowLeftIcon,
  BarChart3Icon,
  ExternalLinkIcon,
} from "lucide-react"

async function getUserDetail(id: string) {
  const [
    { data: profile },
    { data: generatedPosts },
    { data: scheduledPosts },
    { count: myPostsCount },
    { count: templatesCount },
    { data: usageLogs },
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, created_at, onboarding_completed, linkedin_user_id, extension_last_active_at")
      .eq("id", id)
      .single(),
    supabaseAdmin
      .from("generated_posts")
      .select("id, content, post_type, source, status, word_count, conversation_id, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("scheduled_posts")
      .select("id, content, status, scheduled_for, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabaseAdmin
      .from("my_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", id),
    supabaseAdmin
      .from("templates")
      .select("*", { count: "exact", head: true })
      .eq("user_id", id),
    supabaseAdmin
      .from("prompt_usage_logs")
      .select("total_tokens, estimated_cost, feature, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
  ])

  if (!profile) return null

  const totalTokens = usageLogs?.reduce((sum, r) => sum + (r.total_tokens || 0), 0) ?? 0
  const totalCost = usageLogs?.reduce((sum, r) => sum + Number(r.estimated_cost || 0), 0) ?? 0

  const allUserPosts = generatedPosts ?? []
  const recentPosts = allUserPosts.slice(0, 10)
  const totalGenerated = allUserPosts.length

  // Source breakdown
  const sourceBreakdown: Record<string, number> = {}
  const typeBreakdown: Record<string, number> = {}
  for (const post of allUserPosts) {
    const src = post.source || "direct"
    const type = post.post_type || "general"
    sourceBreakdown[src] = (sourceBreakdown[src] ?? 0) + 1
    typeBreakdown[type] = (typeBreakdown[type] ?? 0) + 1
  }
  const sourceEntries = Object.entries(sourceBreakdown).sort((a, b) => b[1] - a[1])
  const typeEntries = Object.entries(typeBreakdown).sort((a, b) => b[1] - a[1])

  return {
    profile,
    allUserPosts,
    recentPosts,
    scheduledPosts: scheduledPosts ?? [],
    myPostsCount: myPostsCount ?? 0,
    templatesCount: templatesCount ?? 0,
    totalGenerated,
    sourceEntries,
    typeEntries,
    totalTokens,
    totalCost,
  }
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getUserDetail(id)

  if (!data) {
    notFound()
  }

  const { profile, allUserPosts, recentPosts, scheduledPosts, myPostsCount, templatesCount, totalGenerated, sourceEntries, typeEntries, totalTokens, totalCost } = data

  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"

  const memberSince = formatTimeAgo(profile.created_at)

  return (
    <div className="flex flex-col gap-5 px-4 lg:px-6">
      {/* Back link */}
      <Link
        href="/dashboard/users"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeftIcon className="size-3.5" />
        Back to Users
      </Link>

      {/* Profile Header */}
      <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/5">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/3 pointer-events-none" />
        <CardContent className="relative flex flex-col gap-4 pt-6 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/15 text-xl font-bold text-primary sm:size-18">
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold">
              {profile.full_name || "No name"}
            </h1>

            {/* Details grid */}
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MailIcon className="size-3.5 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarIcon className="size-3.5 shrink-0" />
                <span>Joined {memberSince} ({new Date(profile.created_at).toLocaleDateString()})</span>
              </div>
              {profile.extension_last_active_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MonitorSmartphoneIcon className="size-3.5 shrink-0" />
                  <span>Extension: {new Date(profile.extension_last_active_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Status badges */}
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge
                variant={profile.onboarding_completed ? "default" : "secondary"}
                className="gap-1"
              >
                <CheckCircleIcon className="size-3" />
                {profile.onboarding_completed ? "Onboarding complete" : "Onboarding incomplete"}
              </Badge>
              <Badge
                variant={profile.linkedin_user_id ? "default" : "outline"}
                className="gap-1"
              >
                <LinkedinIcon className="size-3" />
                {profile.linkedin_user_id ? "LinkedIn connected" : "LinkedIn not connected"}
              </Badge>
            </div>

            {/* External analytics */}
            {process.env.POSTHOG_DASHBOARD_URL && (
              <div className="mt-3">
                <a
                  href={process.env.POSTHOG_DASHBOARD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <BarChart3Icon className="size-3" />
                  View analytics in PostHog
                  <ExternalLinkIcon className="size-3" />
                </a>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="shrink-0">
            <UserActions userId={profile.id} userName={profile.full_name || profile.email} />
          </div>
        </CardContent>
      </Card>

      {/* Activity Stats */}
      <div className="grid grid-cols-2 gap-3 @xl/main:grid-cols-4">
        <MetricCard
          title="Posts Generated"
          value={totalGenerated}
          icon={FileTextIcon}
          accent="blue"
        />
        <MetricCard
          title="Posts Published"
          value={myPostsCount}
          icon={SendIcon}
          accent="emerald"
        />
        <MetricCard
          title="Templates"
          value={templatesCount}
          icon={LayoutTemplateIcon}
          accent="amber"
        />
        <MetricCard
          title="Token Usage"
          value={totalTokens.toLocaleString("en-US")}
          subtitle={`Est. cost: $${totalCost.toFixed(2)}`}
          icon={CoinsIcon}
          accent="primary"
        />
      </div>

      {/* Feature Usage Breakdown */}
      {allUserPosts.length > 0 && (
        <Card className="border-border/50 bg-gradient-to-br from-card via-card to-blue-500/3 overflow-hidden">
          <CardHeader>
            <CardTitle>Feature Usage</CardTitle>
            <CardDescription>{totalGenerated} posts across {sourceEntries.length} features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              {/* By Source */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">By Source</p>
                <div className="space-y-2.5">
                  {sourceEntries.map(([source, count]) => {
                    const pct = totalGenerated > 0 ? (count / totalGenerated) * 100 : 0
                    return (
                      <div key={source}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="capitalize font-medium">{source}</span>
                          <span className="text-muted-foreground tabular-nums text-xs">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {/* By Type */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">By Post Type</p>
                <div className="space-y-2.5">
                  {typeEntries.map(([type, count]) => {
                    const pct = totalGenerated > 0 ? (count / totalGenerated) * 100 : 0
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="capitalize font-medium">{type}</span>
                          <span className="text-muted-foreground tabular-nums text-xs">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Generated Posts */}
      <Card className="border-border/50 bg-gradient-to-br from-card via-card to-primary/3 overflow-hidden">
        <CardHeader>
          <CardTitle>Recent Generated Posts</CardTitle>
          <CardDescription>
            {totalGenerated > 10
              ? `Showing latest 10 of ${totalGenerated} posts`
              : `${recentPosts.length} posts`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No generated posts yet.</p>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Content</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Words</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPosts.map((post) => (
                    <TableRow key={post.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="max-w-[300px]">
                        <div className="flex items-center gap-1.5">
                          <Link href={`/dashboard/content/generated?post=${post.id}`} className="block truncate text-sm text-foreground hover:text-primary transition-colors flex-1">
                            {post.content?.slice(0, 80) ?? "-"}
                          </Link>
                          {post.conversation_id && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">chat</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] capitalize">{post.source || "direct"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{post.post_type ?? "-"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={post.status === "posted" ? "default" : "secondary"}>
                          {post.status ?? "draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">{post.word_count ?? "-"}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Scheduled Posts */}
      {scheduledPosts.length > 0 && (
        <Card className="border-border/50 bg-gradient-to-br from-card via-card to-amber-500/3 overflow-hidden">
          <CardHeader>
            <CardTitle>Recent Scheduled Posts</CardTitle>
            <CardDescription>{scheduledPosts.length} scheduled posts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Content</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scheduled For</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledPosts.map((post) => (
                    <TableRow key={post.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="max-w-[300px]">
                        <p className="truncate text-sm">{post.content?.slice(0, 80) ?? "-"}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={post.status === "posted" ? "default" : "outline"}>{post.status}</Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {new Date(post.scheduled_for).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
