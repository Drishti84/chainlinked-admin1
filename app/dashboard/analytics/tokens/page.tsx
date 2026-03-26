import { supabaseAdmin } from "@/lib/supabase/client"
import { getOpenRouterBalance } from "@/lib/openrouter"
import { Badge } from "@/components/ui/badge"
import { DailyCostTrend } from "@/components/charts/token-charts"

const DONUT_COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(262, 83%, 58%)",
  "hsl(330, 81%, 60%)",
  "hsl(24, 95%, 53%)",
  "hsl(142, 71%, 45%)",
  "hsl(198, 93%, 60%)",
  "hsl(47, 96%, 53%)",
  "hsl(0, 72%, 51%)",
]

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString("en-US")
}

export default async function TokensAnalyticsPage() {
  const [{ data: logs }, openRouterBalance] = await Promise.all([
    supabaseAdmin
      .from("prompt_usage_logs")
      .select("user_id, input_tokens, output_tokens, total_tokens, estimated_cost, model, feature, response_time_ms, created_at"),
    getOpenRouterBalance(),
  ])

  const allLogs = logs ?? []

  // Use actual estimated_cost from the database
  const totalTokens = allLogs.reduce((sum, l) => sum + (l.total_tokens ?? 0), 0)
  const totalCost = allLogs.reduce((sum, l) => sum + (l.estimated_cost || 0), 0)

  const uniqueUsers = new Set(allLogs.map((l) => l.user_id)).size

  // This week
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekLogs = allLogs.filter((l) => new Date(l.created_at) >= weekAgo)
  const tokensThisWeek = weekLogs.reduce((sum, l) => sum + (l.total_tokens ?? 0), 0)

  // Cost by model (using estimated_cost)
  const costByModel: Record<string, number> = {}
  for (const l of allLogs) {
    const model = l.model ?? "unknown"
    costByModel[model] = (costByModel[model] ?? 0) + (l.estimated_cost || 0)
  }
  const modelEntries = Object.entries(costByModel).sort((a, b) => b[1] - a[1])

  // Cost by feature (using estimated_cost)
  const costByFeature: Record<string, number> = {}
  for (const l of allLogs) {
    const feature = l.feature ?? "unknown"
    costByFeature[feature] = (costByFeature[feature] ?? 0) + (l.estimated_cost || 0)
  }
  const featureEntries = Object.entries(costByFeature).sort((a, b) => b[1] - a[1])

  // Per-user breakdown (using estimated_cost)
  const userMap: Record<
    string,
    { tokens: number; cost: number; requests: number; lastUsed: string }
  > = {}
  for (const l of allLogs) {
    const uid = l.user_id
    if (!userMap[uid]) {
      userMap[uid] = { tokens: 0, cost: 0, requests: 0, lastUsed: l.created_at }
    }
    userMap[uid].tokens += l.total_tokens ?? 0
    userMap[uid].cost += l.estimated_cost || 0
    userMap[uid].requests += 1
    if (l.created_at > userMap[uid].lastUsed) {
      userMap[uid].lastUsed = l.created_at
    }
  }

  const userIds = Object.keys(userMap)
  const { data: profiles } = userIds.length > 0
    ? await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds)
    : { data: [] }

  const profileMap = new Map<string, string>()
  for (const p of profiles ?? []) {
    profileMap.set(p.id, p.full_name || p.email || p.id.slice(0, 8))
  }

  const userRows = userIds
    .map((uid) => ({
      userId: uid,
      userName: profileMap.get(uid) || uid.slice(0, 8),
      ...userMap[uid],
    }))
    .sort((a, b) => b.tokens - a.tokens)

  const maxTokens = userRows.length > 0 ? userRows[0].tokens : 1

  // Daily cost trend chart data (last 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const dailyCostMap: Record<string, number> = {}
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().split("T")[0]
    dailyCostMap[key] = 0
  }
  for (const l of allLogs) {
    const dateKey = new Date(l.created_at).toISOString().split("T")[0]
    if (dailyCostMap[dateKey] !== undefined) {
      dailyCostMap[dateKey] += l.estimated_cost || 0
    }
  }
  const dailyCostData = Object.entries(dailyCostMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cost]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      cost,
    }))

  // Token ring calculation
  const TOKEN_CAP = Math.max(totalTokens, 1)
  const ringRadius = 35
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringPct = Math.min(totalTokens / TOKEN_CAP, 1)

  // Donut calculations for model/feature
  const totalModelCost = modelEntries.reduce((s, [, c]) => s + c, 0)
  const totalFeatureCost = featureEntries.reduce((s, [, c]) => s + c, 0)

  function buildDonutSegments(entries: [string, number][], total: number) {
    const segments: { offset: number; length: number; color: string }[] = []
    const circumference = 2 * Math.PI * 25
    let accumulated = 0
    entries.forEach(([, cost], i) => {
      const pct = total > 0 ? cost / total : 0
      const length = pct * circumference
      segments.push({
        offset: circumference - accumulated,
        length,
        color: DONUT_COLORS[i % DONUT_COLORS.length],
      })
      accumulated += length
    })
    return { segments, circumference }
  }

  const modelDonut = buildDonutSegments(modelEntries, totalModelCost)
  const featureDonut = buildDonutSegments(featureEntries, totalFeatureCost)

  return (
    <div className="space-y-5 px-4 lg:px-6">
      {/* Page Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Token Usage</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Monitor API token consumption and costs across users and models.
        </p>
      </div>

      {/* Consumption Meter */}
      <div className="rounded-xl border bg-card p-5 mb-5">
        <div className="flex items-center gap-6">
          {/* Token ring */}
          <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
            <svg width={80} height={80} className="-rotate-90">
              <circle cx={40} cy={40} r={ringRadius} fill="none" className="stroke-muted" strokeWidth={5} />
              <circle
                cx={40}
                cy={40}
                r={ringRadius}
                fill="none"
                className="stroke-primary"
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringCircumference * (1 - ringPct)}
                style={{ transition: "stroke-dashoffset 1s ease-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold tabular-nums">{formatTokens(totalTokens)}</span>
              <span className="text-[9px] text-muted-foreground">tokens</span>
            </div>
          </div>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 flex-1">
            <div>
              <p className="text-lg font-semibold tabular-nums">${totalCost.toFixed(4)}</p>
              <p className="text-[11px] text-muted-foreground">total cost</p>
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums">{allLogs.length.toLocaleString("en-US")}</p>
              <p className="text-[11px] text-muted-foreground">requests</p>
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums">{uniqueUsers.toLocaleString("en-US")}</p>
              <p className="text-[11px] text-muted-foreground">unique users</p>
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums">{formatTokens(tokensThisWeek)}</p>
              <p className="text-[11px] text-muted-foreground">this week</p>
            </div>
          </div>
        </div>
        {/* OpenRouter balance row */}
        {openRouterBalance && (
          <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
            <Badge variant={openRouterBalance.is_free_tier ? "secondary" : "default"}>
              OpenRouter {openRouterBalance.is_free_tier ? "Free" : "Paid"}
            </Badge>
            <span>Credits: ${openRouterBalance.usage.toFixed(4)}</span>
            <span>Limit: {openRouterBalance.limit ? `$${openRouterBalance.limit.toFixed(2)}` : "Unlimited"}</span>
            <span>Rate: {openRouterBalance.rate_limit.requests}/{openRouterBalance.rate_limit.interval}</span>
          </div>
        )}
      </div>

      {/* Cost by Model + Cost by Feature — Side by side with donut rings */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Cost by Model */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Cost by Model</h3>
          {modelEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data</p>
          ) : (
            <div className="flex items-start gap-5">
              <div className="shrink-0" style={{ width: 60, height: 60 }}>
                <svg width={60} height={60} className="-rotate-90">
                  <circle cx={30} cy={30} r={25} fill="none" className="stroke-muted" strokeWidth={4} />
                  {modelDonut.segments.map((seg, i) => (
                    <circle
                      key={i}
                      cx={30}
                      cy={30}
                      r={25}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={4}
                      strokeDasharray={`${seg.length} ${modelDonut.circumference - seg.length}`}
                      strokeDashoffset={seg.offset}
                      strokeLinecap="round"
                    />
                  ))}
                </svg>
              </div>
              <ul className="flex-1 space-y-2 min-w-0">
                {modelEntries.map(([model, cost], i) => (
                  <li key={model} className="flex items-center gap-2 text-sm">
                    <span
                      className="inline-block size-2 rounded-full shrink-0"
                      style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                    />
                    <span className="truncate flex-1 text-muted-foreground">{model}</span>
                    <span className="tabular-nums font-semibold shrink-0">${cost.toFixed(4)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Cost by Feature */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Cost by Feature</h3>
          {featureEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data</p>
          ) : (
            <div className="flex items-start gap-5">
              <div className="shrink-0" style={{ width: 60, height: 60 }}>
                <svg width={60} height={60} className="-rotate-90">
                  <circle cx={30} cy={30} r={25} fill="none" className="stroke-muted" strokeWidth={4} />
                  {featureDonut.segments.map((seg, i) => (
                    <circle
                      key={i}
                      cx={30}
                      cy={30}
                      r={25}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={4}
                      strokeDasharray={`${seg.length} ${featureDonut.circumference - seg.length}`}
                      strokeDashoffset={seg.offset}
                      strokeLinecap="round"
                    />
                  ))}
                </svg>
              </div>
              <ul className="flex-1 space-y-2 min-w-0">
                {featureEntries.map(([feature, cost], i) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <span
                      className="inline-block size-2 rounded-full shrink-0"
                      style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                    />
                    <span className="truncate flex-1 text-muted-foreground">{feature}</span>
                    <span className="tabular-nums font-semibold shrink-0">${cost.toFixed(4)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Daily Cost Trend */}
      <DailyCostTrend data={dailyCostData} />

      {/* User Leaderboard */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">User Leaderboard</h3>
        {userRows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No usage data</p>
        ) : (
          <div className="space-y-0.5">
            {userRows.map((row, i) => {
              const barPct = maxTokens > 0 ? (row.tokens / maxTokens) * 100 : 0
              const rankColor =
                i === 0
                  ? "text-yellow-600"
                  : i === 1
                    ? "text-gray-400"
                    : i === 2
                      ? "text-orange-600"
                      : "text-muted-foreground"
              return (
                <div
                  key={row.userId}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <span className={`text-sm font-bold tabular-nums w-6 text-center ${rankColor}`}>
                    {i + 1}
                  </span>
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                    {row.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{row.userName}</p>
                    <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-700"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold tabular-nums">
                      {row.tokens.toLocaleString("en-US")} tok
                    </p>
                    <p className="text-[11px] text-primary font-semibold tabular-nums">
                      ${row.cost.toFixed(4)}
                    </p>
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
