import { supabaseAdmin } from "@/lib/supabase/client"
import { scoreContent } from "@/lib/quality-score"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DailyCostChart,
  CostByModelChart,
  DailyTokenChart,
  UsageByFeatureChart,
  UserFeatureHeatmap,
} from "@/components/charts/ai-performance-charts"

function formatTime(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}

function getTimeColor(avgTimeStr: string): string {
  if (avgTimeStr === "-") return "text-muted-foreground"
  const seconds = parseFloat(avgTimeStr)
  if (seconds <= 2) return "text-emerald-500"
  if (seconds <= 5) return "text-amber-500"
  return "text-red-500"
}

interface PromptCategory {
  label: string
  prompts: PromptStat[]
}

interface PromptStat {
  name: string
  type: string
  description: string | null
  isActive: boolean
  calls: number
  avgInputTokens: number
  avgOutputTokens: number
  avgResponseTime: string
  avgCostPerCall: string
  successRate: string
}

export default async function AIPerformancePage() {
  const [
    { data: systemPrompts },
    { data: usageLogs },
    { data: generatedPosts },
    { data: profiles },
  ] = await Promise.all([
    supabaseAdmin
      .from("system_prompts")
      .select("id, type, name, description, is_active"),
    supabaseAdmin
      .from("prompt_usage_logs")
      .select("*"),
    supabaseAdmin
      .from("generated_posts")
      .select("content"),
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, email"),
  ])

  const allPrompts = systemPrompts ?? []
  const allLogs = usageLogs ?? []
  const allPosts = generatedPosts ?? []

  // Build prompt type -> logs map
  const logsByPromptType: Record<string, typeof allLogs> = {}
  for (const log of allLogs) {
    const pt = log.prompt_type ?? "unknown"
    if (!logsByPromptType[pt]) logsByPromptType[pt] = []
    logsByPromptType[pt].push(log)
  }

  // Build prompt stats — use actual estimated_cost
  const promptStats: PromptStat[] = allPrompts.map((prompt) => {
    const logs = logsByPromptType[prompt.type] ?? []
    const calls = logs.length

    if (calls === 0) {
      return {
        name: prompt.name,
        type: prompt.type,
        description: prompt.description,
        isActive: prompt.is_active,
        calls: 0,
        avgInputTokens: 0,
        avgOutputTokens: 0,
        avgResponseTime: "-",
        avgCostPerCall: "-",
        successRate: "-",
      }
    }

    const totalInput = logs.reduce((s, l) => s + (l.input_tokens || 0), 0)
    const totalOutput = logs.reduce((s, l) => s + (l.output_tokens || 0), 0)
    const totalTime = logs.reduce((s, l) => s + (l.response_time_ms || 0), 0)
    const totalCost = logs.reduce((s, l) => s + (l.estimated_cost || 0), 0)
    const successCount = logs.filter((l) => l.success === true).length

    return {
      name: prompt.name,
      type: prompt.type,
      description: prompt.description,
      isActive: prompt.is_active,
      calls,
      avgInputTokens: Math.round(totalInput / calls),
      avgOutputTokens: Math.round(totalOutput / calls),
      avgResponseTime: formatTime(totalTime / calls),
      avgCostPerCall: `$${(totalCost / calls).toFixed(6)}`,
      successRate: `${((successCount / calls) * 100).toFixed(1)}%`,
    }
  })

  // Group by category
  const categories: PromptCategory[] = [
    {
      label: "Remix Prompts",
      prompts: promptStats.filter((p) => p.type.startsWith("remix_")),
    },
    {
      label: "Post Type Prompts",
      prompts: promptStats.filter((p) => p.type.startsWith("post_")),
    },
    {
      label: "Carousel Prompts",
      prompts: promptStats.filter((p) => p.type.startsWith("carousel_")),
    },
    {
      label: "Foundation",
      prompts: promptStats.filter((p) => p.type === "base_rules"),
    },
  ]

  const categorizedTypes = new Set(categories.flatMap((c) => c.prompts.map((p) => p.type)))
  const uncategorized = promptStats.filter((p) => !categorizedTypes.has(p.type))
  if (uncategorized.length > 0) {
    categories.push({ label: "Other", prompts: uncategorized })
  }

  // ---- Model Comparison (use actual estimated_cost) ----
  const modelMap: Record<
    string,
    {
      calls: number
      totalTime: number
      totalTokens: number
      totalCost: number
      features: Set<string>
    }
  > = {}
  for (const log of allLogs) {
    const model = log.model ?? "unknown"
    if (!modelMap[model]) {
      modelMap[model] = { calls: 0, totalTime: 0, totalTokens: 0, totalCost: 0, features: new Set() }
    }
    modelMap[model].calls += 1
    modelMap[model].totalTime += log.response_time_ms || 0
    modelMap[model].totalTokens += (log.input_tokens || 0) + (log.output_tokens || 0)
    modelMap[model].totalCost += log.estimated_cost || 0
    if (log.feature) modelMap[model].features.add(log.feature)
  }
  const modelEntries = Object.entries(modelMap).sort((a, b) => b[1].calls - a[1].calls)
  const maxModelCalls = modelEntries.length > 0 ? modelEntries[0][1].calls : 1

  // ---- Cost Summary (use actual estimated_cost) ----
  const totalSpend = allLogs.reduce((s, l) => s + (l.estimated_cost || 0), 0)
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekLogs = allLogs.filter((l) => new Date(l.created_at) >= weekAgo)
  const costThisWeek = weekLogs.reduce((s, l) => s + (l.estimated_cost || 0), 0)
  const avgCostPerRequest = allLogs.length > 0 ? totalSpend / allLogs.length : 0

  // ---- Output Quality ----
  const scores = allPosts.map((post) => scoreContent(post.content || ""))
  const lowCount = scores.filter((s) => s.total <= 40).length
  const medCount = scores.filter((s) => s.total > 40 && s.total <= 70).length
  const highCount = scores.filter((s) => s.total > 70).length
  const totalPosts = scores.length
  const lowPct = totalPosts > 0 ? ((lowCount / totalPosts) * 100).toFixed(1) : "0"
  const medPct = totalPosts > 0 ? ((medCount / totalPosts) * 100).toFixed(1) : "0"
  const highPct = totalPosts > 0 ? ((highCount / totalPosts) * 100).toFixed(1) : "0"

  const featureSet = new Set(allLogs.map((l) => l.feature).filter(Boolean))
  const avgQuality = totalPosts > 0 ? scores.reduce((s, sc) => s + sc.total, 0) / totalPosts : 0

  // ---- Chart Data: Daily cost (last 30 days) ----
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const dailyCostMap: Record<string, number> = {}
  const dailyTokenMap: Record<string, { input: number; output: number }> = {}

  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().split("T")[0]
    dailyCostMap[key] = 0
    dailyTokenMap[key] = { input: 0, output: 0 }
  }

  for (const log of allLogs) {
    const dateKey = new Date(log.created_at).toISOString().split("T")[0]
    if (dailyCostMap[dateKey] !== undefined) {
      dailyCostMap[dateKey] += log.estimated_cost || 0
    }
    if (dailyTokenMap[dateKey]) {
      dailyTokenMap[dateKey].input += log.input_tokens || 0
      dailyTokenMap[dateKey].output += log.output_tokens || 0
    }
  }

  const dailyCostData = Object.entries(dailyCostMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cost]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      cost,
    }))

  const dailyTokenData = Object.entries(dailyTokenMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, tokens]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      input: tokens.input,
      output: tokens.output,
    }))

  // ---- Chart Data: Cost by model ----
  const costByModelData = modelEntries.map(([model, stats]) => ({
    model: model.split("/").pop() || model,
    cost: stats.totalCost,
  }))

  // ---- Chart Data: Usage by feature ----
  const featureCountMap: Record<string, number> = {}
  for (const log of allLogs) {
    const f = log.feature ?? "unknown"
    featureCountMap[f] = (featureCountMap[f] ?? 0) + 1
  }
  const usageByFeatureData = Object.entries(featureCountMap)
    .sort((a, b) => b[1] - a[1])
    .map(([feature, count]) => ({ feature, count }))

  // ---- Heatmap Data: Per-user feature matrix ----
  const profileMap = new Map<string, string>()
  for (const p of profiles ?? []) {
    profileMap.set(p.id, p.full_name || p.email || p.id.slice(0, 8))
  }

  const userFeatureMatrix: Record<string, Record<string, number>> = {}
  const allFeatures = Array.from(featureSet).sort()
  const userIdsWithUsage = new Set<string>()

  for (const log of allLogs) {
    const uid = log.user_id
    const feature = log.feature
    if (!uid || !feature) continue
    userIdsWithUsage.add(uid)
    if (!userFeatureMatrix[uid]) userFeatureMatrix[uid] = {}
    userFeatureMatrix[uid][feature] = (userFeatureMatrix[uid][feature] ?? 0) + 1
  }

  let heatmapMaxCount = 0
  for (const uid of userIdsWithUsage) {
    for (const f of allFeatures) {
      const c = userFeatureMatrix[uid]?.[f] ?? 0
      if (c > heatmapMaxCount) heatmapMaxCount = c
    }
  }

  const heatmapUsers = Array.from(userIdsWithUsage)
    .map((uid) => ({ id: uid, name: profileMap.get(uid) || uid.slice(0, 8) }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-8 px-4 lg:px-6">
      {/* Page Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">AI Performance</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Analyze prompt costs, model performance, and output quality.
        </p>
      </div>

      {/* Cost Summary Hero Banner */}
      <Card className="rounded-xl">
        <CardContent className="py-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
            <div className="flex flex-col items-center justify-center py-4 sm:py-0 sm:px-6">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Total Spent</span>
              <span className="text-3xl font-bold tabular-nums mt-1">${totalSpend.toFixed(4)}</span>
              <span className="text-xs text-muted-foreground mt-1">
                {allLogs.length.toLocaleString("en-US")} requests all time
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-4 sm:py-0 sm:px-6">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">This Week</span>
              <span className="text-3xl font-bold tabular-nums mt-1">${costThisWeek.toFixed(4)}</span>
              <span className="text-xs text-muted-foreground mt-1">
                {weekLogs.length.toLocaleString("en-US")} requests last 7 days
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-4 sm:py-0 sm:px-6">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Per Request</span>
              <span className="text-3xl font-bold tabular-nums mt-1">${avgCostPerRequest.toFixed(6)}</span>
              <span className="text-xs text-muted-foreground mt-1">average cost per call</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Cost &amp; Usage Charts</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <DailyCostChart data={dailyCostData} />
          </div>
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <CostByModelChart data={costByModelData} />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <DailyTokenChart data={dailyTokenData} />
          </div>
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <UsageByFeatureChart data={usageByFeatureData} />
          </div>
        </div>
      </div>

      {/* Per-User Feature Heatmap */}
      {allFeatures.length > 0 && heatmapUsers.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">User Heatmap</h2>
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <UserFeatureHeatmap
              users={heatmapUsers}
              features={allFeatures}
              matrix={userFeatureMatrix}
              maxCount={heatmapMaxCount}
            />
          </div>
        </div>
      )}

      {/* Section: Prompt Performance — Category-Colored Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Prompt Performance</h2>
        {(() => {
          const categoryColors: Record<string, { header: string; dot: string }> = {
            "Compose & Remix": { header: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800", dot: "bg-blue-500" },
            "Post Types": { header: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800", dot: "bg-green-500" },
            "Carousel": { header: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800", dot: "bg-purple-500" },
            "Research & Suggestions": { header: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800", dot: "bg-orange-500" },
            "Other": { header: "bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800", dot: "bg-gray-500" },
          }
          return categories.filter((cat) => cat.prompts.length > 0).map((cat) => {
            const colors = categoryColors[cat.label] || categoryColors["Other"]
            const totalCalls = cat.prompts.reduce((s, p) => s + p.calls, 0)
            return (
              <div key={cat.label} className="rounded-xl border bg-card overflow-hidden">
                {/* Category header band */}
                <div className={`px-4 py-2.5 border-b ${colors.header}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`size-2.5 rounded-full ${colors.dot}`} />
                      <span className="text-sm font-semibold">{cat.label}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">({cat.prompts.length} prompts)</span>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">{totalCalls.toLocaleString("en-US")} total calls</span>
                  </div>
                </div>
                {/* Prompt rows */}
                <div className="divide-y">
                  {cat.prompts.map((p) => (
                    <div key={p.type} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                      {/* Name + badges */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={`text-sm font-medium truncate ${p.calls === 0 ? "text-muted-foreground" : ""}`}>
                          {p.name}
                        </span>
                        <Badge variant="outline" className="text-[9px] h-4 px-1 font-mono shrink-0">{p.type}</Badge>
                        {p.isActive && (
                          <span className="size-1.5 rounded-full bg-green-500 shrink-0" title="Active" />
                        )}
                      </div>
                      {/* Stats */}
                      <div className="flex items-center gap-3 text-[11px] tabular-nums text-muted-foreground shrink-0">
                        <span className="w-14 text-right"><span className="font-semibold text-foreground">{p.calls.toLocaleString("en-US")}</span> calls</span>
                        <span className={`w-12 text-right font-medium ${getTimeColor(p.avgResponseTime)}`}>{p.avgResponseTime}</span>
                        <span className="w-20 text-right">{p.calls === 0 ? "-" : `${p.avgInputTokens.toLocaleString("en-US")}/${p.avgOutputTokens.toLocaleString("en-US")}`}</span>
                        <span className="w-16 text-right font-semibold text-primary">{p.avgCostPerCall}</span>
                        <span className="w-10 text-right">{p.successRate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        })()}
      </div>

      {/* Section: Model Comparison — Ranked List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Model Comparison</h2>
        <Card className="rounded-xl">
          <CardContent className="py-2">
            {modelEntries.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No model data yet</p>
            )}
            <div className="divide-y divide-border">
              {modelEntries.map(([model, stats], index) => {
                const shortModelName = model.split("/").pop() || model
                const avgMs = formatTime(stats.calls > 0 ? stats.totalTime / stats.calls : 0)
                const avgTokens = stats.calls > 0 ? Math.round(stats.totalTokens / stats.calls) : 0
                const costPerCall = stats.calls > 0 ? stats.totalCost / stats.calls : 0
                const usagePct = (stats.calls / maxModelCalls) * 100

                return (
                  <div key={model} className="py-3 space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      {/* Left: rank + name */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-bold text-muted-foreground w-5 text-right shrink-0">
                          {index + 1}
                        </span>
                        <span className="font-mono text-sm font-medium truncate">{shortModelName}</span>
                        {Array.from(stats.features).map((f) => (
                          <Badge key={f} variant="secondary" className="text-xs shrink-0">
                            {f}
                          </Badge>
                        ))}
                      </div>

                      {/* Right: stats row */}
                      <div className="flex items-center gap-4 text-sm tabular-nums flex-wrap pl-8 sm:pl-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground text-xs">Calls</span>
                          <span className="font-medium">{stats.calls.toLocaleString("en-US")}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground text-xs">Avg Time</span>
                          <span className="font-medium">{avgMs}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground text-xs">Avg Tokens</span>
                          <span className="font-medium">{avgTokens.toLocaleString("en-US")}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground text-xs">Total Cost</span>
                          <span className="font-medium">${stats.totalCost.toFixed(4)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground text-xs">Cost/Call</span>
                          <span className="font-medium">${costPerCall.toFixed(6)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Usage proportion bar */}
                    <div className="pl-8">
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${usagePct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section: Quality Distribution */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Output Quality Distribution</h2>
        <Card className="rounded-xl">
          <CardContent className="py-5">
            <div className="flex flex-col gap-4">
              {/* Quality badge pills */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5">
                  <span className="text-xs font-medium text-red-500">Low (0-40)</span>
                  <span className="text-sm font-bold tabular-nums">{lowCount.toLocaleString("en-US")}</span>
                  <span className="text-xs text-muted-foreground">{lowPct}%</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
                  <span className="text-xs font-medium text-amber-500">Medium (41-70)</span>
                  <span className="text-sm font-bold tabular-nums">{medCount.toLocaleString("en-US")}</span>
                  <span className="text-xs text-muted-foreground">{medPct}%</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
                  <span className="text-xs font-medium text-emerald-500">High (71-100)</span>
                  <span className="text-sm font-bold tabular-nums">{highCount.toLocaleString("en-US")}</span>
                  <span className="text-xs text-muted-foreground">{highPct}%</span>
                </div>
              </div>

              {/* Average quality summary */}
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">
                  Overall average score across {totalPosts.toLocaleString("en-US")} posts
                </span>
                <span className="text-lg font-bold tabular-nums">{avgQuality.toFixed(1)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
