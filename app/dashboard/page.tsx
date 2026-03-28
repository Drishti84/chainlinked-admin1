import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/client"
import { getOpenRouterBalance } from "@/lib/openrouter"
import { MetricCard } from "@/components/metric-card"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  UsersIcon,
  ActivityIcon,
  FileTextIcon,
  SendIcon,
  CoinsIcon,
  BuildingIcon,
  UserPlusIcon,
  BrainCircuitIcon,
  DollarSignIcon,
  BarChart3Icon,
  ArrowRightIcon,
  SparklesIcon,
  CalendarIcon,
  CrownIcon,
  RepeatIcon,
} from "lucide-react"

async function getOverviewMetrics() {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const weekAgoISO = weekAgo.toISOString()
  const twoWeeksAgoISO = twoWeeksAgo.toISOString()

  const [
    { count: totalUsers },
    { count: usersLastWeek },
    { count: usersPrevWeek },
    { count: postsGenerated },
    { count: postsGeneratedThisWeek },
    { count: postsPublished },
    { count: myPostsCount },
    { count: teams },
    { count: companies },
    tokenData,
    activeUsersData,
    { count: totalSuggestions },
    { count: savedSuggestions },
    { data: prevWeekActiveData },
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgoISO),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", twoWeeksAgoISO).lt("created_at", weekAgoISO),
    supabaseAdmin.from("generated_posts").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("generated_posts").select("*", { count: "exact", head: true }).gte("created_at", weekAgoISO),
    supabaseAdmin.from("scheduled_posts").select("*", { count: "exact", head: true }).eq("status", "posted"),
    supabaseAdmin.from("my_posts").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("teams").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("companies").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("prompt_usage_logs").select("input_tokens, output_tokens, total_tokens, model, estimated_cost"),
    supabaseAdmin.from("generated_posts").select("user_id").gte("created_at", weekAgoISO),
    supabaseAdmin.from("generated_suggestions").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("swipe_wishlist").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("generated_posts").select("user_id").gte("created_at", twoWeeksAgoISO).lt("created_at", weekAgoISO),
  ])

  const totalTokens = tokenData.data?.reduce((sum, r) => sum + (r.total_tokens || 0), 0) ?? 0
  const localCost = tokenData.data?.reduce((sum, r) => sum + (r.estimated_cost || 0), 0) ?? 0
  const activeUsers = new Set(activeUsersData.data?.map((r) => r.user_id)).size

  // Get real cost from OpenRouter
  const openRouterBalance = await getOpenRouterBalance()
  const totalCost = openRouterBalance?.usage ?? localCost

  const userGrowth = usersPrevWeek
    ? (((usersLastWeek ?? 0) - (usersPrevWeek ?? 0)) / (usersPrevWeek ?? 1)) * 100
    : 0

  // Suggestion save rate
  const suggestionsTotal = totalSuggestions ?? 0
  const suggestionsSaved = savedSuggestions ?? 0
  const suggestionSaveRate = suggestionsTotal > 0 ? Math.round((suggestionsSaved / suggestionsTotal) * 100) : 0

  // User retention
  const prevWeekUsers = new Set(prevWeekActiveData?.map((r: { user_id: string }) => r.user_id))
  const thisWeekUsers = new Set(activeUsersData.data?.map((r) => r.user_id))
  const retainedUsers = [...prevWeekUsers].filter((id) => thisWeekUsers.has(id)).length
  const retentionRate = prevWeekUsers.size > 0 ? Math.round((retainedUsers / prevWeekUsers.size) * 100) : 0

  return {
    totalUsers: totalUsers ?? 0,
    userGrowth,
    activeUsers,
    postsGenerated: postsGenerated ?? 0,
    postsGeneratedThisWeek: postsGeneratedThisWeek ?? 0,
    postsPublished: (postsPublished ?? 0) + (myPostsCount ?? 0),
    totalTokens,
    totalCost,
    teams: (teams ?? 0) + (companies ?? 0),
    suggestionSaveRate,
    retentionRate,
    retainedUsers,
    prevWeekUserCount: prevWeekUsers.size,
    totalSuggestions: suggestionsTotal,
    savedSuggestions: suggestionsSaved,
  }
}

async function getRecentActivity() {
  const [signups, generated, scheduled] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("generated_posts")
      .select("id, user_id, post_type, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("scheduled_posts")
      .select("id, user_id, status, scheduled_for, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  type ActivityItem = {
    type: "signup" | "generated" | "scheduled"
    id: string
    description: string
    timestamp: string
  }

  const items: ActivityItem[] = []

  signups.data?.forEach((u) =>
    items.push({
      type: "signup",
      id: u.id,
      description: `${u.full_name || u.email} signed up`,
      timestamp: u.created_at,
    })
  )
  generated.data?.forEach((p) =>
    items.push({
      type: "generated",
      id: p.id,
      description: `Post generated (${p.post_type || "unknown"})`,
      timestamp: p.created_at,
    })
  )
  scheduled.data?.forEach((s) =>
    items.push({
      type: "scheduled",
      id: s.id,
      description: `Post ${s.status} for ${new Date(s.scheduled_for).toLocaleDateString("en-US")}`,
      timestamp: s.created_at,
    })
  )

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)
}

async function getSystemHealth() {
  const [companyJobs, researchJobs, suggestionJobs] = await Promise.all([
    supabaseAdmin.from("company_context").select("status"),
    supabaseAdmin.from("research_sessions").select("status"),
    supabaseAdmin.from("suggestion_generation_runs").select("status"),
  ])

  const allJobs = [
    ...(companyJobs.data || []),
    ...(researchJobs.data || []),
    ...(suggestionJobs.data || []),
  ]

  return {
    running: allJobs.filter((j) => ["pending", "scraping", "researching", "analyzing"].includes(j.status)).length,
    completed: allJobs.filter((j) => j.status === "completed").length,
    failed: allJobs.filter((j) => j.status === "failed").length,
    total: allJobs.length,
  }
}

async function getOnboardingSnapshot() {
  const [
    { count: signedUp },
    { count: onboardingComplete },
    linkedInData,
    firstPostData,
    firstScheduledData,
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("onboarding_completed", true),
    supabaseAdmin.from("linkedin_tokens").select("user_id"),
    supabaseAdmin.from("generated_posts").select("user_id"),
    supabaseAdmin.from("scheduled_posts").select("user_id"),
  ])

  const total = signedUp ?? 1
  return [
    { label: "Signed Up", count: signedUp ?? 0, pct: 100 },
    { label: "Onboarded", count: onboardingComplete ?? 0, pct: Math.round(((onboardingComplete ?? 0) / total) * 100) },
    { label: "LinkedIn", count: new Set(linkedInData.data?.map((r) => r.user_id)).size, pct: Math.round((new Set(linkedInData.data?.map((r) => r.user_id)).size / total) * 100) },
    { label: "Generated", count: new Set(firstPostData.data?.map((r) => r.user_id)).size, pct: Math.round((new Set(firstPostData.data?.map((r) => r.user_id)).size / total) * 100) },
    { label: "Scheduled", count: new Set(firstScheduledData.data?.map((r) => r.user_id)).size, pct: Math.round((new Set(firstScheduledData.data?.map((r) => r.user_id)).size / total) * 100) },
  ]
}

async function getTopUsers() {
  const { data: posts } = await supabaseAdmin
    .from("generated_posts")
    .select("user_id")

  const userCounts: Record<string, number> = {}
  posts?.forEach((p) => {
    userCounts[p.user_id] = (userCounts[p.user_id] ?? 0) + 1
  })

  const topUserIds = Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  if (topUserIds.length === 0) return []

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", topUserIds.map(([id]) => id))

  const profileMap = new Map<string, string>()
  profiles?.forEach((p) => {
    profileMap.set(p.id, p.full_name || p.email || p.id.slice(0, 8))
  })

  return topUserIds.map(([id, count]) => ({
    id,
    name: profileMap.get(id) || id.slice(0, 8),
    posts: count,
  }))
}

const ACTIVITY_STYLES = {
  signup: { dot: "bg-emerald-500", icon: UserPlusIcon },
  generated: { dot: "bg-primary", icon: SparklesIcon },
  scheduled: { dot: "bg-amber-500", icon: CalendarIcon },
}

const QUICK_LINKS = [
  { label: "Users", href: "/dashboard/users", icon: UsersIcon, description: "Manage users", accent: "from-primary/10 to-primary/3 hover:border-primary/30" },
  { label: "AI Activity", href: "/dashboard/content/ai-activity", icon: BrainCircuitIcon, description: "Monitor AI requests", accent: "from-blue-500/10 to-blue-500/3 hover:border-blue-500/30" },
  { label: "Costs", href: "/dashboard/analytics/costs", icon: DollarSignIcon, description: "AI spend analysis", accent: "from-amber-500/10 to-amber-500/3 hover:border-amber-500/30" },
  { label: "Onboarding", href: "/dashboard/users/onboarding", icon: BarChart3Icon, description: "Funnel analytics", accent: "from-emerald-500/10 to-emerald-500/3 hover:border-emerald-500/30" },
]

export default async function DashboardPage() {
  const [metrics, activity, health, funnelSteps, topUsers] = await Promise.all([
    getOverviewMetrics(),
    getRecentActivity(),
    getSystemHealth(),
    getOnboardingSnapshot(),
    getTopUsers(),
  ])

  const healthTotal = health.total || 1
  const completedPct = Math.round((health.completed / healthTotal) * 100)
  const runningPct = Math.round((health.running / healthTotal) * 100)
  const failedPct = Math.round((health.failed / healthTotal) * 100)

  return (
    <>
      {/* Metric Cards — compact 4-column grid */}
      <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-4">
        <Link href="/dashboard/users">
          <MetricCard
            title="Total Users"
            value={metrics.totalUsers}
            change={metrics.userGrowth !== 0 ? metrics.userGrowth : undefined}
            subtitle="All registered"
            icon={UsersIcon}
            accent="primary"
            compact
          />
        </Link>
        <Link href="/dashboard/users">
          <MetricCard
            title="Active (7d)"
            value={metrics.activeUsers}
            subtitle="Content this week"
            icon={ActivityIcon}
            accent="emerald"
            compact
          />
        </Link>
        <Link href="/dashboard/content/generated">
          <MetricCard
            title="Posts Generated"
            value={metrics.postsGenerated}
            subtitle={`${metrics.postsGeneratedThisWeek} this week`}
            icon={FileTextIcon}
            accent="blue"
            compact
          />
        </Link>
        <Link href="/dashboard/content/generated">
          <MetricCard
            title="Posts Published"
            value={metrics.postsPublished}
            subtitle="Posted to LinkedIn"
            icon={SendIcon}
            accent="emerald"
            compact
          />
        </Link>
        <Link href="/dashboard/analytics/tokens">
          <MetricCard
            title="Token Usage"
            value={metrics.totalTokens.toLocaleString()}
            subtitle={`$${metrics.totalCost.toFixed(2)} app cost`}
            icon={CoinsIcon}
            accent="amber"
            compact
          />
        </Link>
        <Link href="/dashboard/users">
          <MetricCard
            title="Teams"
            value={metrics.teams}
            subtitle="Organizations"
            icon={BuildingIcon}
            accent="primary"
            compact
          />
        </Link>
        <MetricCard
          title="Save Rate"
          value={`${metrics.suggestionSaveRate}%`}
          subtitle={`${metrics.savedSuggestions}/${metrics.totalSuggestions} suggestions`}
          icon={SparklesIcon}
          accent="amber"
          compact
        />
        <MetricCard
          title="Retention"
          value={`${metrics.retentionRate}%`}
          subtitle={`${metrics.retainedUsers}/${metrics.prevWeekUserCount} returned`}
          icon={RepeatIcon}
          accent="emerald"
          compact
        />
      </div>

      {/* Quick Navigation Links */}
      <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-4">
        {QUICK_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className={`group/link relative overflow-hidden border-border/50 bg-gradient-to-br ${link.accent} transition-all duration-300 hover:shadow-md cursor-pointer`}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/link:opacity-100 pointer-events-none" />
              <CardContent className="relative flex items-center gap-3 py-3 px-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background/80 ring-1 ring-border/50">
                  <link.icon className="size-4 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{link.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{link.description}</p>
                </div>
                <ArrowRightIcon className="size-4 text-muted-foreground/40 transition-transform duration-200 group-hover/link:translate-x-0.5 group-hover/link:text-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Middle Row: Onboarding Funnel Snapshot + Top Users */}
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
        {/* Mini Onboarding Funnel */}
        <Link href="/dashboard/users/onboarding">
          <Card className="group/funnel relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/3 transition-all duration-300 hover:shadow-lg hover:border-primary/20 card-glow cursor-pointer h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/funnel:opacity-100 pointer-events-none" />
            <CardHeader className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Onboarding Funnel</CardTitle>
                  <CardDescription>User activation snapshot</CardDescription>
                </div>
                <ArrowRightIcon className="size-4 text-muted-foreground/40 transition-transform duration-200 group-hover/funnel:translate-x-0.5 group-hover/funnel:text-foreground" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="flex items-end gap-1.5">
                {funnelSteps.map((step) => (
                  <div key={step.label} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-xs font-bold tabular-nums">{step.count}</span>
                    <div
                      className={`w-full rounded-t-sm transition-all ${
                        step.pct >= 70
                          ? "bg-primary"
                          : step.pct >= 30
                          ? "bg-primary/60"
                          : "bg-destructive/60"
                      }`}
                      style={{ height: `${Math.max(8, step.pct * 0.8)}px` }}
                    />
                    <span className="text-[10px] text-muted-foreground text-center leading-tight">{step.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Top Users */}
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-amber-500/3 transition-all duration-300 hover:shadow-lg card-glow">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100 pointer-events-none" />
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top Users</CardTitle>
                <CardDescription>Most active content creators</CardDescription>
              </div>
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/15 to-amber-500/5 ring-1 ring-amber-500/10">
                <CrownIcon className="size-4 text-amber-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            {topUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No user activity yet</p>
            ) : (
              <div className="space-y-3">
                {topUsers.map((user, i) => {
                  const maxPosts = topUsers[0].posts
                  const pct = Math.round((user.posts / maxPosts) * 100)
                  return (
                    <div key={user.id} className="flex items-center gap-3">
                      <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        i === 0
                          ? "bg-amber-500/15 text-amber-600"
                          : i === 1
                          ? "bg-muted text-muted-foreground"
                          : "bg-muted/50 text-muted-foreground"
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-medium truncate">{user.name}</span>
                          <span className="text-xs text-muted-foreground tabular-nums shrink-0">{user.posts} posts</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              i === 0 ? "bg-amber-500" : "bg-primary/50"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Recent Activity + System Health */}
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-[1fr_auto]">
        {/* Recent Activity */}
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/3 transition-all duration-300 card-glow">
          <CardHeader className="relative">
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest events across the platform</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-1">
              {activity.map((item) => {
                const style = ACTIVITY_STYLES[item.type]
                const ItemIcon = style.icon
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/30"
                  >
                    <div className={`flex size-7 shrink-0 items-center justify-center rounded-full ${style.dot}/15`}>
                      <ItemIcon className={`size-3.5 ${style.dot.replace("bg-", "text-")}`} />
                    </div>
                    <span className="flex-1 text-sm truncate">{item.description}</span>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                )
              })}
              {activity.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-emerald-500/3 transition-all duration-300 card-glow @xl/main:w-[280px]">
          <CardHeader className="relative">
            <CardTitle>System Health</CardTitle>
            <CardDescription>Background jobs</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            {/* Stacked progress bar */}
            <div className="h-3 w-full rounded-full bg-muted/50 overflow-hidden flex mb-4">
              {completedPct > 0 && (
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${completedPct}%` }} />
              )}
              {runningPct > 0 && (
                <div className="h-full bg-amber-500 transition-all" style={{ width: `${runningPct}%` }} />
              )}
              {failedPct > 0 && (
                <div className="h-full bg-destructive transition-all" style={{ width: `${failedPct}%` }} />
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full bg-emerald-500" />
                  <span className="text-sm">Completed</span>
                </div>
                <span className="text-sm font-bold tabular-nums">{health.completed}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full bg-amber-500" />
                  <span className="text-sm">Running</span>
                </div>
                <span className="text-sm font-bold tabular-nums">{health.running}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full bg-destructive" />
                  <span className="text-sm">Failed</span>
                </div>
                <span className="text-sm font-bold tabular-nums">{health.failed}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border/50 pt-3">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-sm font-bold tabular-nums">{health.total}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
