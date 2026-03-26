import { supabaseAdmin } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MetricCard } from "@/components/metric-card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  EyeIcon,
  HeartIcon,
  TrendingUpIcon,
  UsersIcon,
  LinkedinIcon,
  BarChart3Icon,
} from "lucide-react"

export default async function LinkedInEngagementPage() {
  const [
    { data: postAnalytics },
    { data: accumulativeAnalytics },
    { data: profileAnalytics },
    { data: profiles },
  ] = await Promise.all([
    supabaseAdmin
      .from("post_analytics")
      .select("id, user_id, impressions, reactions, comments, reposts, saves, sends, engagement_rate, followers_gained, unique_views, post_type, posted_at")
      .order("captured_at", { ascending: false })
      .limit(200),
    supabaseAdmin
      .from("post_analytics_accumulative")
      .select("id, user_id, post_id, impressions_total, reactions_total, comments_total, reposts_total, saves_total, sends_total, engagements_total, engagements_rate, post_type, post_created_at, analysis_date")
      .order("analysis_date", { ascending: false })
      .limit(200),
    supabaseAdmin
      .from("profile_analytics_accumulative")
      .select("id, user_id, followers_total, profile_views_total, search_appearances_total, connections_total, analysis_date")
      .order("analysis_date", { ascending: false }),
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, email"),
  ])

  const rawPosts = postAnalytics ?? []
  const accumulative = accumulativeAnalytics ?? []
  const profileStats = profileAnalytics ?? []
  const profileMap = new Map<string, string>()
  for (const p of profiles ?? []) profileMap.set(p.id, p.full_name || p.email || p.id.slice(0, 8))

  // Post engagement metrics
  const totalImpressions = rawPosts.reduce((s, a) => s + (a.impressions || 0), 0)
  const totalReactions = rawPosts.reduce((s, a) => s + (a.reactions || 0), 0)
  const totalComments = rawPosts.reduce((s, a) => s + (a.comments || 0), 0)
  const totalReposts = rawPosts.reduce((s, a) => s + (a.reposts || 0), 0)
  const totalEngagement = totalReactions + totalComments + totalReposts
  const avgEngagement = rawPosts.length > 0 ? Math.round(totalEngagement / rawPosts.length) : 0
  const engagementRate = totalImpressions > 0 ? ((totalEngagement / totalImpressions) * 100).toFixed(2) : "0"

  // Per-user growth from profile_analytics_accumulative
  // Group by user, find earliest and latest snapshot to compute growth
  const userSnapshots: Record<string, { earliest: typeof profileStats[0]; latest: typeof profileStats[0] }> = {}
  for (const snap of profileStats) {
    const uid = snap.user_id
    if (!userSnapshots[uid]) {
      userSnapshots[uid] = { earliest: snap, latest: snap }
    } else {
      if (snap.analysis_date < userSnapshots[uid].earliest.analysis_date) userSnapshots[uid].earliest = snap
      if (snap.analysis_date > userSnapshots[uid].latest.analysis_date) userSnapshots[uid].latest = snap
    }
  }

  const userGrowthRows = Object.entries(userSnapshots)
    .map(([uid, { earliest, latest }]) => ({
      id: uid,
      name: profileMap.get(uid) || uid.slice(0, 8),
      followersNow: latest.followers_total || 0,
      followersBefore: earliest.followers_total || 0,
      followersGrowth: (latest.followers_total || 0) - (earliest.followers_total || 0),
      profileViews: latest.profile_views_total || 0,
      connections: latest.connections_total || 0,
      searchAppearances: latest.search_appearances_total || 0,
    }))
    .filter((u) => u.followersNow > 0)
    .sort((a, b) => b.followersGrowth - a.followersGrowth)

  const totalFollowersAcrossUsers = userGrowthRows.reduce((s, u) => s + u.followersNow, 0)
  const totalGrowth = userGrowthRows.reduce((s, u) => s + u.followersGrowth, 0)
  const hasAnyData = rawPosts.length > 0 || accumulative.length > 0 || profileStats.length > 0

  // Top posts — prefer accumulative for lifetime view
  const topPosts = accumulative.length > 0
    ? [...accumulative]
        .sort((a, b) => (b.impressions_total || 0) - (a.impressions_total || 0))
        .slice(0, 10)
        .map((p) => ({
          id: p.post_id || p.id,
          type: p.post_type || "-",
          impressions: p.impressions_total || 0,
          reactions: p.reactions_total || 0,
          comments: p.comments_total || 0,
          reposts: p.reposts_total || 0,
          rate: p.engagements_rate ? `${Math.min(p.engagements_rate > 1 ? p.engagements_rate : p.engagements_rate * 100, 100).toFixed(1)}%` : "-",
        }))
    : [...rawPosts]
        .sort((a, b) => (b.impressions || 0) - (a.impressions || 0))
        .slice(0, 10)
        .map((p) => ({
          id: p.id,
          type: p.post_type || "-",
          impressions: p.impressions || 0,
          reactions: p.reactions || 0,
          comments: p.comments || 0,
          reposts: p.reposts || 0,
          rate: p.engagement_rate ? `${Math.min(p.engagement_rate > 1 ? p.engagement_rate : p.engagement_rate * 100, 100).toFixed(1)}%` : "-",
        }))

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold">LinkedIn Engagement</h1>
        <p className="text-sm text-muted-foreground">
          Post performance and audience growth
        </p>
      </div>

      {/* Primary Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 *:h-full">
        <MetricCard
          title="Total Impressions"
          value={totalImpressions.toLocaleString()}
          subtitle={`${rawPosts.length} posts tracked`}
          icon={EyeIcon}
          accent="primary"
        />
        <MetricCard
          title="Total Engagement"
          value={totalEngagement.toLocaleString()}
          subtitle={`${totalReactions} reacts · ${totalComments} comments`}
          icon={HeartIcon}
          accent="emerald"
        />
        <MetricCard
          title="Engagement Rate"
          value={`${engagementRate}%`}
          subtitle={`${avgEngagement} avg per post`}
          icon={TrendingUpIcon}
          accent="amber"
        />
        <MetricCard
          title="Total Followers"
          value={totalFollowersAcrossUsers.toLocaleString()}
          subtitle={totalGrowth > 0 ? `+${totalGrowth} growth` : `${userGrowthRows.length} users`}
          icon={UsersIcon}
          accent="blue"
        />
      </div>

      {/* Empty State */}
      {!hasAnyData && (
        <Card className="group/card relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/5 transition-all duration-300 card-glow">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/3 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 pointer-events-none" />
          <CardContent className="relative flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10 mb-4">
              <LinkedinIcon className="size-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No LinkedIn analytics data yet</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Analytics will appear once users start posting to LinkedIn and the analytics pipeline runs.
            </p>
          </CardContent>
        </Card>
      )}

      {/* User Growth Table */}
      {userGrowthRows.length > 0 && (
        <Card className="group/card relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-emerald-500/3 transition-all duration-300 card-glow">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/3 via-transparent to-primary/3 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 pointer-events-none" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 ring-1 ring-emerald-500/10">
                <UsersIcon className="size-5 text-emerald-500" />
              </div>
              <div>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>Follower & profile growth per user since joining the platform</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Followers</TableHead>
                    <TableHead className="text-right">Growth</TableHead>
                    <TableHead className="text-right">Profile Views</TableHead>
                    <TableHead className="text-right">Connections</TableHead>
                    <TableHead className="text-right">Search Appearances</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userGrowthRows.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{user.followersNow.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {user.followersGrowth > 0 ? (
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[10px]">
                            +{user.followersGrowth}
                          </Badge>
                        ) : user.followersGrowth < 0 ? (
                          <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive text-[10px]">
                            {user.followersGrowth}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{user.profileViews.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{user.connections.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{user.searchAppearances.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Performing Posts */}
      {topPosts.length > 0 && (
        <Card className="group/card relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/3 transition-all duration-300 card-glow">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/3 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 pointer-events-none" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
                <BarChart3Icon className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle>Top Performing Posts</CardTitle>
                <CardDescription>Ranked by impressions · {topPosts.length} shown</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead>Post</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">Reactions</TableHead>
                    <TableHead className="text-right">Comments</TableHead>
                    <TableHead className="text-right">Reposts</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPosts.map((post, i) => (
                    <TableRow key={post.id ?? i} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="tabular-nums text-muted-foreground font-medium">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[140px] truncate">
                        {post.id?.toString().slice(0, 12) ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{post.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{post.impressions.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{post.reactions.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{post.comments.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{post.reposts.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{post.rate}</TableCell>
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
