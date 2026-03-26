import { supabaseAdmin } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FeatureAdoptionChart, FeatureHeatmapGrid } from "@/components/charts/feature-charts"
import { MetricCard } from "@/components/metric-card"
import { BarChart3Icon, TrendingUpIcon, UsersIcon } from "lucide-react"

const FEATURES = [
  { key: "generated_posts", label: "Generated Posts" },
  { key: "scheduled_posts", label: "Scheduled Posts" },
  { key: "templates", label: "Templates" },
  { key: "carousel_templates", label: "Carousel Templates" },
  { key: "swipe_preferences", label: "Swipe Preferences" },
  { key: "research_sessions", label: "Research Sessions" },
  { key: "compose_conversations", label: "Compose Conversations" },
  { key: "writing_style_profiles", label: "Writing Style Profiles" },
] as const

// Distinct colors for each feature bubble
const BUBBLE_COLORS = [
  { bg: "bg-primary/15", ring: "ring-primary/30", text: "text-primary" },
  { bg: "bg-[var(--chart-2)]/15", ring: "ring-[var(--chart-2)]/30", text: "text-[var(--chart-2)]" },
  { bg: "bg-[var(--chart-3)]/15", ring: "ring-[var(--chart-3)]/30", text: "text-[var(--chart-3)]" },
  { bg: "bg-[var(--chart-4)]/15", ring: "ring-[var(--chart-4)]/30", text: "text-[var(--chart-4)]" },
  { bg: "bg-[var(--chart-5)]/15", ring: "ring-[var(--chart-5)]/30", text: "text-[var(--chart-5)]" },
  { bg: "bg-purple-500/15", ring: "ring-purple-500/30", text: "text-purple-600 dark:text-purple-400" },
  { bg: "bg-pink-500/15", ring: "ring-pink-500/30", text: "text-pink-600 dark:text-pink-400" },
  { bg: "bg-cyan-500/15", ring: "ring-cyan-500/30", text: "text-cyan-600 dark:text-cyan-400" },
]

async function getFeatureCount(table: string): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from(table)
      .select("*", { count: "exact", head: true })
    return count ?? 0
  } catch {
    return 0
  }
}

async function getFeatureUsers(table: string): Promise<Set<string>> {
  try {
    const { data } = await supabaseAdmin.from(table).select("user_id")
    return new Set((data ?? []).map((r) => r.user_id))
  } catch {
    return new Set()
  }
}

export default async function FeaturesAnalyticsPage() {
  const [counts, userSets] = await Promise.all([
    Promise.all(FEATURES.map((f) => getFeatureCount(f.key))),
    Promise.all(FEATURES.map((f) => getFeatureUsers(f.key))),
  ])

  const featureData = FEATURES.map((f, i) => ({
    ...f,
    count: counts[i],
    users: userSets[i],
  }))

  const maxCount = Math.max(...featureData.map((f) => f.count), 1)

  const allUserIds = new Set<string>()
  for (const f of featureData) {
    for (const uid of f.users) allUserIds.add(uid)
  }

  const userIds = Array.from(allUserIds)
  const { data: profiles } = userIds.length > 0
    ? await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] }

  const profileMap: Record<string, string> = {}
  for (const p of profiles ?? []) {
    profileMap[p.id] = p.full_name || p.email || p.id.slice(0, 8)
  }

  const sortedUserIds = userIds.sort((a, b) => (profileMap[a] ?? a).localeCompare(profileMap[b] ?? b))

  const adoptionChartData = featureData.map((f) => ({ label: f.label, count: f.count, users: f.users.size }))

  const matrixMap: Record<string, string[]> = {}
  for (const f of featureData) matrixMap[f.key] = Array.from(f.users)

  const maxUserFeatures = sortedUserIds.reduce((max, uid) => {
    let count = 0
    for (const f of featureData) { if (f.users.has(uid)) count++ }
    return Math.max(max, count)
  }, 1)

  const heatmapUsers = sortedUserIds.map((uid) => ({ id: uid, name: profileMap[uid] ?? uid.slice(0, 8) }))

  const totalRecords = featureData.reduce((sum, f) => sum + f.count, 0)
  const totalUniqueUsers = allUserIds.size
  const rankedFeatures = [...featureData].sort((a, b) => b.count - a.count)

  // Bubble sizing: min 80px, max 160px based on count proportion
  const bubbleSize = (count: number) => {
    const pct = maxCount > 0 ? count / maxCount : 0
    return Math.round(80 + pct * 80)
  }

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold">Feature Usage Analytics</h1>
        <p className="text-sm text-muted-foreground">Track feature adoption across users</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          title="Features Tracked"
          value={FEATURES.length}
          icon={BarChart3Icon}
          accent="primary"
        />
        <MetricCard
          title="Most Used Feature"
          value={`${[...featureData].sort((a, b) => b.count - a.count)[0]?.count.toLocaleString() ?? 0}`}
          subtitle={[...featureData].sort((a, b) => b.count - a.count)[0]?.label ?? "N/A"}
          icon={TrendingUpIcon}
          accent="emerald"
        />
        <MetricCard
          title="Users Engaged"
          value={allUserIds.size}
          icon={UsersIcon}
          accent="blue"
        />
      </div>

      <FeatureAdoptionChart data={adoptionChartData} />

      <Card className="border-border/50 bg-gradient-to-br from-card via-card to-primary/3">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BarChart3Icon className="size-4" />
            </div>
            <div>
              <CardTitle>Feature Adoption</CardTitle>
              <CardDescription>{featureData.filter(f => f.count > 0).length} features with activity</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {featureData.map((f, i) => {
              const colors = [
                { badge: "bg-primary/10 text-primary", bar: "bg-primary" },
                { badge: "bg-blue-500/10 text-blue-500", bar: "bg-blue-500" },
                { badge: "bg-emerald-500/10 text-emerald-500", bar: "bg-emerald-500" },
                { badge: "bg-amber-500/10 text-amber-500", bar: "bg-amber-500" },
                { badge: "bg-destructive/10 text-destructive", bar: "bg-destructive" },
                { badge: "bg-purple-500/10 text-purple-500", bar: "bg-purple-500" },
              ]
              const color = colors[i % colors.length]
              return (
                <div
                  key={f.key}
                  className={`hover:bg-muted/20 rounded-lg px-2 py-2 transition-colors space-y-1.5${f.count === 0 ? " opacity-40" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`flex size-6 shrink-0 items-center justify-center rounded-md ${color.badge}`}>
                      <BarChart3Icon className="size-3" />
                    </div>
                    <span className="font-medium text-sm">{f.label}</span>
                    <div className="ml-auto flex items-center gap-1.5">
                      <span className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                        {f.count.toLocaleString()} records
                      </span>
                      <span className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                        {f.users.size} user{f.users.size !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div
                      className={`h-1.5 rounded-full ${color.bar} transition-all`}
                      style={{
                        width: `${Math.max((f.count / maxCount) * 100, 0)}%`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
