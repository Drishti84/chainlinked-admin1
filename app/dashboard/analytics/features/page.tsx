import { supabaseAdmin } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { FeatureAdoptionChart, FeatureHeatmapGrid } from "@/components/charts/feature-charts"
import {
  ZapIcon,
  DatabaseIcon,
  UsersIcon,
} from "lucide-react"

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
    <div className="px-4 lg:px-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Feature Usage</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Analyze feature adoption and usage patterns across users.</p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="flex items-center gap-3 rounded-xl border bg-card p-3 hover-lift">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8">
            <ZapIcon className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold tabular-nums leading-tight">{FEATURES.length}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">Features</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-3 hover-lift">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8">
            <DatabaseIcon className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold tabular-nums leading-tight">{totalRecords.toLocaleString("en-US")}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">Total Records</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-3 hover-lift">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8">
            <UsersIcon className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold tabular-nums leading-tight">{totalUniqueUsers}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">Unique Users</p>
          </div>
        </div>
      </div>

      {/* ── Bubble Map ── */}
      <div className="rounded-xl border bg-card p-6 mb-5">
        <h3 className="text-sm font-semibold mb-5">Feature Landscape</h3>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {rankedFeatures.map((f, i) => {
            const size = bubbleSize(f.count)
            const colors = BUBBLE_COLORS[i % BUBBLE_COLORS.length]
            const adoptPct = totalUniqueUsers > 0 ? Math.round((f.users.size / totalUniqueUsers) * 100) : 0
            return (
              <div
                key={f.key}
                className={`group relative flex flex-col items-center justify-center rounded-full ${colors.bg} ring-2 ${colors.ring} transition-all duration-300 hover:scale-110 hover:shadow-lg cursor-default animate-scale-in`}
                style={{ width: size, height: size, animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
                title={`${f.label}: ${f.count.toLocaleString("en-US")} records, ${f.users.size} users, ${adoptPct}% adoption`}
              >
                <span className={`text-lg font-bold tabular-nums ${colors.text}`}>
                  {f.count >= 1000 ? `${(f.count / 1000).toFixed(1)}k` : f.count}
                </span>
                <span className="text-[9px] text-muted-foreground leading-tight text-center px-2 truncate max-w-full">
                  {f.label.split(" ")[0]}
                </span>
                {/* Hover tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="rounded-lg bg-popover border shadow-md px-3 py-2 text-center whitespace-nowrap">
                    <p className="text-xs font-semibold">{f.label}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {f.count.toLocaleString("en-US")} records · {f.users.size} users · {adoptPct}%
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Feature Detail Cards — no slide bars ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        {rankedFeatures.map((f, i) => {
          const colors = BUBBLE_COLORS[i % BUBBLE_COLORS.length]
          const adoptPct = totalUniqueUsers > 0 ? Math.round((f.users.size / totalUniqueUsers) * 100) : 0
          return (
            <div key={f.key} className="rounded-xl border bg-card p-4 hover:border-primary/20 transition-colors animate-slide-up" style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`size-3 rounded-full ${colors.bg} ring-1 ${colors.ring}`} />
                <span className="text-sm font-semibold truncate">{f.label}</span>
              </div>
              {/* SVG ring showing adoption % */}
              <div className="flex items-center gap-4">
                <div className="relative shrink-0" style={{ width: 48, height: 48 }}>
                  <svg width={48} height={48} className="-rotate-90">
                    <circle cx={24} cy={24} r={20} fill="none" className="stroke-muted" strokeWidth={3} />
                    <circle cx={24} cy={24} r={20} fill="none" className="stroke-primary" strokeWidth={3}
                      strokeLinecap="round"
                      strokeDasharray={125.6}
                      strokeDashoffset={125.6 * (1 - adoptPct / 100)}
                      style={{ transition: "stroke-dashoffset 0.8s ease-out" }} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold tabular-nums">{adoptPct}%</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Records</span>
                    <span className="font-semibold tabular-nums">{f.count.toLocaleString("en-US")}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Users</span>
                    <span className="font-semibold tabular-nums">{f.users.size}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Rank</span>
                    <Badge variant={i === 0 ? "default" : "outline"} className="text-[9px] h-4 px-1 tabular-nums">#{i + 1}</Badge>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Charts ── */}
      <div className="space-y-5">
        <div className="rounded-xl border bg-card overflow-hidden">
          <FeatureAdoptionChart data={adoptionChartData} />
        </div>

        {heatmapUsers.length > 0 && (
          <div className="rounded-xl border bg-card overflow-hidden">
            <FeatureHeatmapGrid
              users={heatmapUsers}
              features={FEATURES.map((f) => ({ key: f.key, label: f.label }))}
              matrix={matrixMap}
              maxFeatures={maxUserFeatures}
            />
          </div>
        )}
      </div>
    </div>
  )
}
