import { supabaseAdmin } from "@/lib/supabase/client"
import { MetricCard } from "@/components/metric-card"
import { scoreContent } from "@/lib/quality-score"
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
import {
  DailyCostChart,
  CostByModelChart,
  DailyTokenChart,
  UsageByFeatureChart,
  UserFeatureHeatmap,
} from "@/components/charts/ai-performance-charts"
import { PromptTable } from "./prompt-table"
import {
  DollarSignIcon,
  CalendarIcon,
  CalculatorIcon,
  CpuIcon,
  StarIcon,
} from "lucide-react"

function formatTime(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}

interface PromptStat {
  name: string
  type: string
  category: string
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
      .select("content, source"),
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

  // Determine category for a prompt type
  function getCategory(type: string): string {
    if (type.startsWith("remix_")) return "Remix"
    if (type.startsWith("post_")) return "Post Type"
    if (type.startsWith("carousel_")) return "Carousel"
    if (type === "base_rules") return "Foundation"
    return "Other"
  }

  const CATEGORY_COLORS: Record<string, string> = {
    Remix: "bg-primary/10 text-primary border-primary/20",
    "Post Type": "bg-blue-500/10 text-blue-600 border-blue-500/20",
    Carousel: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    Foundation: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    Other: "bg-muted text-muted-foreground",
  }

  // Build prompt stats
  const promptStats: PromptStat[] = allPrompts.map((prompt) => {
    const logs = logsByPromptType[prompt.type] ?? []
    const calls = logs.length
    const category = getCategory(prompt.type)

    if (calls === 0) {
      return {
        name: prompt.name, type: prompt.type, category, description: prompt.description,
        isActive: prompt.is_active, calls: 0, avgInputTokens: 0, avgOutputTokens: 0,
        avgResponseTime: "-", avgCostPerCall: "-", successRate: "-",
      }
    }

    const totalInput = logs.reduce((s, l) => s + (l.input_tokens || 0), 0)
    const totalOutput = logs.reduce((s, l) => s + (l.output_tokens || 0), 0)
    const totalTime = logs.reduce((s, l) => s + (l.response_time_ms || 0), 0)
    const totalCost = logs.reduce((s, l) => s + (l.estimated_cost || 0), 0)
    const successCount = logs.filter((l) => l.success === true).length

    return {
      name: prompt.name, type: prompt.type, category, description: prompt.description,
      isActive: prompt.is_active, calls,
      avgInputTokens: Math.round(totalInput / calls),
      avgOutputTokens: Math.round(totalOutput / calls),
      avgResponseTime: formatTime(totalTime / calls),
      avgCostPerCall: `$${(totalCost / calls).toFixed(6)}`,
      successRate: `${((successCount / calls) * 100).toFixed(1)}%`,
    }
  })

  // Sort: prompts with calls first, then by calls desc
  const sortedPrompts = [...promptStats].sort((a, b) => b.calls - a.calls)

  // ---- Model Comparison ----
  const modelMap: Record<string, { calls: number; totalTime: number; totalTokens: number; totalCost: number; features: Set<string> }> = {}
  for (const log of allLogs) {
    const model = log.model ?? "unknown"
    if (!modelMap[model]) modelMap[model] = { calls: 0, totalTime: 0, totalTokens: 0, totalCost: 0, features: new Set() }
    modelMap[model].calls += 1
    modelMap[model].totalTime += log.response_time_ms || 0
    modelMap[model].totalTokens += (log.input_tokens || 0) + (log.output_tokens || 0)
    modelMap[model].totalCost += log.estimated_cost || 0
    if (log.feature) modelMap[model].features.add(log.feature)
  }
  const modelEntries = Object.entries(modelMap).sort((a, b) => b[1].totalCost - a[1].totalCost)

  // ---- Cost Summary ----
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

  // Per-feature quality scores
  const featureQualityMap: Record<string, { total: number; count: number }> = {}
  for (let i = 0; i < allPosts.length; i++) {
    const source = (allPosts[i] as { source?: string }).source
    if (source) {
      if (!featureQualityMap[source]) featureQualityMap[source] = { total: 0, count: 0 }
      featureQualityMap[source].total += scores[i].total
      featureQualityMap[source].count += 1
    }
  }

  // ---- Chart Data ----
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
    if (dailyCostMap[dateKey] !== undefined) dailyCostMap[dateKey] += log.estimated_cost || 0
    if (dailyTokenMap[dateKey]) {
      dailyTokenMap[dateKey].input += log.input_tokens || 0
      dailyTokenMap[dateKey].output += log.output_tokens || 0
    }
  }
  const dailyCostData = Object.entries(dailyCostMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, cost]) => ({ date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }), cost }))
  const dailyTokenData = Object.entries(dailyTokenMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, tokens]) => ({ date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }), input: tokens.input, output: tokens.output }))
  const costByModelData = modelEntries.map(([model, stats]) => ({ model: model.split("/").pop() || model, cost: stats.totalCost }))
  const featureCountMap: Record<string, number> = {}
  for (const log of allLogs) { const f = log.feature ?? "unknown"; featureCountMap[f] = (featureCountMap[f] ?? 0) + 1 }
  const usageByFeatureData = Object.entries(featureCountMap).sort((a, b) => b[1] - a[1]).map(([feature, count]) => ({ feature, count }))

  // ---- Heatmap Data ----
  const profileMap = new Map<string, string>()
  for (const p of profiles ?? []) profileMap.set(p.id, p.full_name || p.email || p.id.slice(0, 8))
  const userFeatureMatrix: Record<string, Record<string, number>> = {}
  const allFeatures = Array.from(featureSet).sort()
  const userIdsWithUsage = new Set<string>()
  for (const log of allLogs) {
    const uid = log.user_id; const feature = log.feature
    if (!uid || !feature) continue
    userIdsWithUsage.add(uid)
    if (!userFeatureMatrix[uid]) userFeatureMatrix[uid] = {}
    userFeatureMatrix[uid][feature] = (userFeatureMatrix[uid][feature] ?? 0) + 1
  }
  let heatmapMaxCount = 0
  for (const uid of userIdsWithUsage) { for (const f of allFeatures) { const c = userFeatureMatrix[uid]?.[f] ?? 0; if (c > heatmapMaxCount) heatmapMaxCount = c } }
  const heatmapUsers = Array.from(userIdsWithUsage).map((uid) => ({ id: uid, name: profileMap.get(uid) || uid.slice(0, 8) })).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Performance</h1>
        <p className="text-sm text-muted-foreground">
          Prompt effectiveness, model comparison, and output quality
        </p>
      </div>

      {/* Cost Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard title="Total AI Spend" value={`$${totalSpend.toFixed(4)}`} subtitle="All time" icon={DollarSignIcon} accent="primary" />
        <MetricCard title="Cost This Week" value={`$${costThisWeek.toFixed(4)}`} subtitle="Last 7 days" icon={CalendarIcon} accent="blue" />
        <MetricCard title="Avg Cost / Request" value={`$${avgCostPerRequest.toFixed(6)}`} subtitle={`${allLogs.length} total requests`} icon={CalculatorIcon} accent="amber" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DailyCostChart data={dailyCostData} />
        <CostByModelChart data={costByModelData} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <DailyTokenChart data={dailyTokenData} />
        <UsageByFeatureChart data={usageByFeatureData} />
      </div>

      {/* Per-User Heatmap */}
      {allFeatures.length > 0 && heatmapUsers.length > 0 && (
        <UserFeatureHeatmap users={heatmapUsers} features={allFeatures} matrix={userFeatureMatrix} maxCount={heatmapMaxCount} />
      )}

      {/* Model Comparison — Table */}
      <Card className="border-border/50 bg-gradient-to-br from-card via-card to-primary/3 overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
              <CpuIcon className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle>Model Comparison</CardTitle>
              <CardDescription>{modelEntries.length} models used</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {modelEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No model data yet</p>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Avg Time</TableHead>
                    <TableHead className="text-right">Avg Tokens</TableHead>
                    <TableHead className="text-right">Cost/Call</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead>Features</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelEntries.map(([model, stats], i) => {
                    const shortName = model.split("/").pop()?.replace("-2025-04-14", "") || model
                    const avgMs = formatTime(stats.calls > 0 ? stats.totalTime / stats.calls : 0)
                    const avgTokens = stats.calls > 0 ? Math.round(stats.totalTokens / stats.calls) : 0
                    const costPerCall = stats.calls > 0 ? stats.totalCost / stats.calls : 0
                    // Highlight the cheapest model
                    const cheapest = modelEntries.length > 1 && i === modelEntries.length - 1

                    return (
                      <TableRow key={model} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <span className="font-mono text-sm font-medium">{shortName}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{stats.calls}</TableCell>
                        <TableCell className="text-right tabular-nums">{avgMs}</TableCell>
                        <TableCell className="text-right tabular-nums">{avgTokens.toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums font-mono text-xs">
                          ${costPerCall.toFixed(6)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="tabular-nums font-medium">${stats.totalCost.toFixed(4)}</div>
                          {cheapest && <Badge variant="outline" className="mt-1 text-[10px] border-emerald-500/30 bg-emerald-500/10 text-emerald-600">cheapest</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Array.from(stats.features).map((f) => (
                              <Badge key={f} variant="secondary" className="text-[10px] px-1.5 py-0">{f}</Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prompt Performance — Collapsible Table */}
      <PromptTable prompts={sortedPrompts} />

      {/* Output Quality — Combined Card */}
      <Card className="border-border/50 bg-gradient-to-br from-card via-card to-emerald-500/3 overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 ring-1 ring-emerald-500/10">
              <StarIcon className="size-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle>Output Quality</CardTitle>
              <CardDescription>{totalPosts} posts analyzed · Average score {avgQuality.toFixed(1)}/100</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stacked distribution bar */}
          <div>
            <div className="flex h-4 w-full overflow-hidden rounded-full">
              {Number(highPct) > 0 && (
                <div className="bg-emerald-500 transition-all" style={{ width: `${highPct}%` }} title={`High: ${highPct}%`} />
              )}
              {Number(medPct) > 0 && (
                <div className="bg-amber-500 transition-all" style={{ width: `${medPct}%` }} title={`Medium: ${medPct}%`} />
              )}
              {Number(lowPct) > 0 && (
                <div className="bg-destructive/70 transition-all" style={{ width: `${lowPct}%` }} title={`Low: ${lowPct}%`} />
              )}
            </div>
            {/* Legend */}
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full bg-emerald-500" />
                <span>High (71-100): <strong>{highCount}</strong> ({highPct}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full bg-amber-500" />
                <span>Medium (41-70): <strong>{medCount}</strong> ({medPct}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full bg-destructive/70" />
                <span>Low (0-40): <strong>{lowCount}</strong> ({lowPct}%)</span>
              </div>
            </div>
          </div>

          {/* Per-feature quality */}
          {Array.from(featureSet).length > 0 && (
            <div className="border-t border-border/50 pt-4">
              <p className="text-sm font-medium mb-2">Quality by Feature</p>
              <div className="space-y-2">
                {Array.from(featureSet).map((feature) => {
                  const fq = featureQualityMap[feature]
                  const featureAvg = fq && fq.count > 0 ? fq.total / fq.count : null
                  return (
                    <div key={feature} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{feature}</Badge>
                        {fq && <span className="text-muted-foreground">{fq.count} posts</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {featureAvg !== null && (
                          <div className="w-20 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${featureAvg >= 70 ? "bg-emerald-500" : featureAvg >= 40 ? "bg-amber-500" : "bg-destructive/70"}`}
                              style={{ width: `${featureAvg}%` }}
                            />
                          </div>
                        )}
                        <span className="font-medium tabular-nums w-10 text-right">{featureAvg !== null ? featureAvg.toFixed(1) : "—"}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
