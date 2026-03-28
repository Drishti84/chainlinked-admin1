import { supabaseAdmin } from "@/lib/supabase/client"
import { EmptyState } from "@/components/empty-state"
import { scoreContent } from "@/lib/quality-score"
import { MetricCard } from "@/components/metric-card"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  FileTextIcon,
  BarChart3Icon,
  PieChartIcon,
  UsersIcon,
  TrendingUpIcon,
  LayersIcon,
} from "lucide-react"
import { PostList } from "./post-list"

export default async function GeneratedPostsPage() {
  const [postsRes, profilesRes] = await Promise.all([
    supabaseAdmin
      .from("generated_posts")
      .select(
        "id, user_id, content, post_type, source, status, word_count, hook, cta, created_at, conversation_id, prompt_snapshot, prompt_tokens, completion_tokens, total_tokens, model, estimated_cost",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabaseAdmin.from("profiles").select("id, full_name, email"),
  ])

  const posts = postsRes.data ?? []
  const count = postsRes.count

  const names = new Map<string, string>()
  profilesRes.data?.forEach((p) => {
    names.set(p.id, p.full_name || p.email || p.id.slice(0, 8))
  })

  if (!posts.length) {
    return (
      <div className="px-4 lg:px-6">
        <EmptyState
          title="No generated posts"
          description="Generated posts will appear here."
          icon={<FileTextIcon className="size-12" />}
        />
      </div>
    )
  }

  // Normalize unicode to NFC to prevent hydration mismatches
  // (fancy unicode chars like 𝘀𝘁𝗮 can encode differently in Node vs browser)
  const norm = (s: string | null) => s ? s.normalize("NFC") : s

  const enrichedPosts = posts.map((post) => {
    const content = norm(post.content)
    const score = scoreContent(content || "")
    return {
      ...post,
      content,
      hook: norm(post.hook),
      cta: norm(post.cta),
      userName: names.get(post.user_id) ?? "Unknown",
      qualityScore: score.total,
      qualityGrade: score.grade,
      qualityBreakdown: score.breakdown,
    }
  })

  // Analytics computations
  const sourceDistribution: Record<string, number> = {}
  const typeDistribution: Record<string, number> = {}
  const statusDistribution: Record<string, number> = {}
  const userFeatureMap: Record<string, { name: string; total: number; compose: number; carousel: number; swipe: number; series: number; scheduled: number }> = {}

  for (const post of enrichedPosts) {
    const src = post.source || "direct"
    const type = post.post_type || "general"
    const status = post.status || "draft"

    sourceDistribution[src] = (sourceDistribution[src] ?? 0) + 1
    typeDistribution[type] = (typeDistribution[type] ?? 0) + 1
    statusDistribution[status] = (statusDistribution[status] ?? 0) + 1

    const uid = post.user_id
    if (!userFeatureMap[uid]) {
      userFeatureMap[uid] = { name: post.userName, total: 0, compose: 0, carousel: 0, swipe: 0, series: 0, scheduled: 0 }
    }
    userFeatureMap[uid].total += 1
    if (src === "compose") userFeatureMap[uid].compose += 1
    else if (src === "carousel") userFeatureMap[uid].carousel += 1
    else if (src === "swipe") userFeatureMap[uid].swipe += 1
    else if (src === "series") userFeatureMap[uid].series += 1
    else if (src === "scheduled") userFeatureMap[uid].scheduled += 1
  }

  const avgQuality = enrichedPosts.length > 0
    ? Math.round(enrichedPosts.reduce((s, p) => s + p.qualityScore, 0) / enrichedPosts.length)
    : 0

  const conversionCount = enrichedPosts.filter(p => p.status === "posted" || p.status === "archived").length
  const conversionRate = enrichedPosts.length > 0 ? Math.round((conversionCount / enrichedPosts.length) * 100) : 0

  const sourceEntries = Object.entries(sourceDistribution).sort((a, b) => b[1] - a[1])
  const typeEntries = Object.entries(typeDistribution).sort((a, b) => b[1] - a[1])
  const statusEntries = Object.entries(statusDistribution).sort((a, b) => b[1] - a[1])
  const userFeatureRows = Object.values(userFeatureMap).sort((a, b) => b.total - a.total)
  const uniqueSources = Object.keys(sourceDistribution).length

  return (
    <div className="px-4 lg:px-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Generated Posts</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          <span className="tabular-nums">{count ?? posts.length}</span>
          {" "}total posts{" · "}Showing latest 100
        </p>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Posts"
          value={enrichedPosts.length}
          icon={FileTextIcon}
          accent="primary"
          subtitle="Latest 100 shown"
        />
        <MetricCard
          title="Post Sources"
          value={uniqueSources}
          icon={LayersIcon}
          accent="blue"
          subtitle="Unique creation sources"
        />
        <MetricCard
          title="Avg Quality Score"
          value={avgQuality}
          icon={BarChart3Icon}
          accent="emerald"
          subtitle="Across all posts"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={TrendingUpIcon}
          accent="amber"
          subtitle={`${conversionCount} posted or archived`}
        />
      </div>

      {/* Distribution Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Source Distribution */}
        <Card className="border-border/50 overflow-hidden bg-gradient-to-br from-card via-card to-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex shrink-0 items-center justify-center rounded-lg size-8 bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
                <PieChartIcon className="size-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Source Distribution</CardTitle>
                <CardDescription>Where posts originate</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {sourceEntries.map(([label, count]) => {
                const pct = enrichedPosts.length > 0 ? (count / enrichedPosts.length) * 100 : 0
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="capitalize font-medium">{label}</span>
                      <span className="text-muted-foreground tabular-nums">{count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Post Type Distribution */}
        <Card className="border-border/50 overflow-hidden bg-gradient-to-br from-card via-card to-blue-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex shrink-0 items-center justify-center rounded-lg size-8 bg-gradient-to-br from-blue-500/15 to-blue-500/5 ring-1 ring-blue-500/10">
                <BarChart3Icon className="size-4 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base">Post Type Distribution</CardTitle>
                <CardDescription>Content categories</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {typeEntries.map(([label, count]) => {
                const pct = enrichedPosts.length > 0 ? (count / enrichedPosts.length) * 100 : 0
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="capitalize font-medium">{label.replace(/-/g, " ")}</span>
                      <span className="text-muted-foreground tabular-nums">{count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card className="border-border/50 overflow-hidden bg-gradient-to-br from-card via-card to-amber-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex shrink-0 items-center justify-center rounded-lg size-8 bg-gradient-to-br from-amber-500/15 to-amber-500/5 ring-1 ring-amber-500/10">
                <BarChart3Icon className="size-4 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-base">Status Breakdown</CardTitle>
                <CardDescription>Post lifecycle stages</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {statusEntries.map(([label, count]) => {
                const pct = enrichedPosts.length > 0 ? (count / enrichedPosts.length) * 100 : 0
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="capitalize font-medium">{label}</span>
                      <span className="text-muted-foreground tabular-nums">{count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Stacked bar overview */}
            <div className="mt-4 pt-3 border-t border-border/50">
              <div className="text-xs text-muted-foreground mb-1.5">Stacked overview</div>
              <div className="h-3 w-full rounded-full bg-muted/50 overflow-hidden flex">
                {statusEntries.map(([label, count], i) => {
                  const pct = enrichedPosts.length > 0 ? (count / enrichedPosts.length) * 100 : 0
                  const colors = ["bg-amber-500", "bg-amber-400", "bg-amber-300", "bg-amber-200"]
                  return (
                    <div
                      key={label}
                      className={`h-full ${colors[i % colors.length]} transition-all`}
                      style={{ width: `${pct}%` }}
                      title={`${label}: ${count} (${pct.toFixed(0)}%)`}
                    />
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-User Feature Usage Table */}
      <Card className="border-border/50 mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex shrink-0 items-center justify-center rounded-lg size-8 bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
              <UsersIcon className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Per-User Feature Usage</CardTitle>
              <CardDescription>Post creation sources by user</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="text-right tabular-nums">Total</TableHead>
                <TableHead className="text-right tabular-nums">Compose</TableHead>
                <TableHead className="text-right tabular-nums">Carousel</TableHead>
                <TableHead className="text-right tabular-nums">Swipe</TableHead>
                <TableHead className="text-right tabular-nums">Series</TableHead>
                <TableHead className="text-right tabular-nums">Scheduled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userFeatureRows.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{row.total}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.compose || <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.carousel || <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.swipe || <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.series || <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.scheduled || <span className="text-muted-foreground">-</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PostList posts={enrichedPosts} />
    </div>
  )
}
