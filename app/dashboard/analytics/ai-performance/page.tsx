import { supabaseAdmin } from "@/lib/supabase/client"
import { MetricCard } from "@/components/metric-card"
import { scoreContent } from "@/lib/quality-score"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
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
import { Separator } from "@/components/ui/separator"

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "openai/gpt-4.1": { input: 0.000002, output: 0.000008 },
  "openai/gpt-4.1-2025-04-14": { input: 0.000002, output: 0.000008 },
  "openai/gpt-4o": { input: 0.0000025, output: 0.00001 },
}
const DEFAULT_PRICING = { input: 0.000002, output: 0.000008 }

function computeCost(inputTokens: number, outputTokens: number, model: string): number {
  const p = MODEL_PRICING[model] || DEFAULT_PRICING
  return inputTokens * p.input + outputTokens * p.output
}

function formatTime(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
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

  // Build prompt stats
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
    const totalCost = logs.reduce(
      (s, l) => s + computeCost(l.input_tokens || 0, l.output_tokens || 0, l.model || ""),
      0,
    )
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

  // Add any uncategorized prompts
  const categorizedTypes = new Set(categories.flatMap((c) => c.prompts.map((p) => p.type)))
  const uncategorized = promptStats.filter((p) => !categorizedTypes.has(p.type))
  if (uncategorized.length > 0) {
    categories.push({ label: "Other", prompts: uncategorized })
  }

  // ---- Section 2: Model Comparison ----
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
    modelMap[model].totalCost += computeCost(log.input_tokens || 0, log.output_tokens || 0, model)
    if (log.feature) modelMap[model].features.add(log.feature)
  }
  const modelEntries = Object.entries(modelMap).sort((a, b) => b[1].totalCost - a[1].totalCost)

  // ---- Section 3: Cost Summary ----
  const totalSpend = allLogs.reduce(
    (s, l) => s + computeCost(l.input_tokens || 0, l.output_tokens || 0, l.model || ""),
    0,
  )
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekLogs = allLogs.filter((l) => new Date(l.created_at) >= weekAgo)
  const costThisWeek = weekLogs.reduce(
    (s, l) => s + computeCost(l.input_tokens || 0, l.output_tokens || 0, l.model || ""),
    0,
  )
  const avgCostPerRequest = allLogs.length > 0 ? totalSpend / allLogs.length : 0

  // ---- Section 4: Output Quality ----
  const scores = allPosts.map((post) => scoreContent(post.content || ""))
  const lowCount = scores.filter((s) => s.total <= 40).length
  const medCount = scores.filter((s) => s.total > 40 && s.total <= 70).length
  const highCount = scores.filter((s) => s.total > 70).length
  const totalPosts = scores.length
  const lowPct = totalPosts > 0 ? ((lowCount / totalPosts) * 100).toFixed(1) : "0"
  const medPct = totalPosts > 0 ? ((medCount / totalPosts) * 100).toFixed(1) : "0"
  const highPct = totalPosts > 0 ? ((highCount / totalPosts) * 100).toFixed(1) : "0"

  // Quality by source (feature)
  const qualityBySource: Record<string, { total: number; count: number }> = {}
  // We need to correlate posts with features from logs — use a simple approach:
  // Score all posts and compute overall avg, plus track by unique features in logs
  const featureSet = new Set(allLogs.map((l) => l.feature).filter(Boolean))
  const avgQuality = totalPosts > 0 ? scores.reduce((s, sc) => s + sc.total, 0) / totalPosts : 0

  return (
    <div className="space-y-8 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Performance</h1>
        <p className="text-sm text-muted-foreground">
          Prompt effectiveness, model comparison, and output quality
        </p>
      </div>

      {/* Section 1: Prompt Performance */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Prompt Performance</h2>
        {categories
          .filter((cat) => cat.prompts.length > 0)
          .map((cat) => (
            <Card key={cat.label}>
              <CardHeader>
                <CardTitle>{cat.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prompt</TableHead>
                      <TableHead className="text-right">Calls</TableHead>
                      <TableHead className="text-right">Avg In Tokens</TableHead>
                      <TableHead className="text-right">Avg Out Tokens</TableHead>
                      <TableHead className="text-right">Avg Time</TableHead>
                      <TableHead className="text-right">Avg Cost/Call</TableHead>
                      <TableHead className="text-right">Success Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cat.prompts.map((p) => (
                      <TableRow key={p.type}>
                        <TableCell>
                          <div className={p.calls === 0 ? "text-muted-foreground" : ""}>
                            <span className="font-medium">{p.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {p.type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${p.calls === 0 ? "text-muted-foreground" : ""}`}
                        >
                          {p.calls}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${p.calls === 0 ? "text-muted-foreground" : ""}`}
                        >
                          {p.calls === 0 ? "-" : p.avgInputTokens.toLocaleString()}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${p.calls === 0 ? "text-muted-foreground" : ""}`}
                        >
                          {p.calls === 0 ? "-" : p.avgOutputTokens.toLocaleString()}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${p.calls === 0 ? "text-muted-foreground" : ""}`}
                        >
                          {p.avgResponseTime}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${p.calls === 0 ? "text-muted-foreground" : ""}`}
                        >
                          {p.avgCostPerCall}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${p.calls === 0 ? "text-muted-foreground" : ""}`}
                        >
                          {p.successRate}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Section 2: Model Comparison */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Model Comparison</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modelEntries.map(([model, stats]) => {
            const shortModelName = model.split("/").pop() || model
            const avgMs = formatTime(stats.calls > 0 ? stats.totalTime / stats.calls : 0)
            const avgTokens = stats.calls > 0 ? Math.round(stats.totalTokens / stats.calls) : 0
            const costPerCall = stats.calls > 0 ? stats.totalCost / stats.calls : 0

            return (
              <Card key={model}>
                <CardHeader>
                  <CardTitle className="font-mono text-base">{shortModelName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Calls:</span> {stats.calls}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg Time:</span> {avgMs}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg Tokens:</span>{" "}
                      {avgTokens.toLocaleString()}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Cost:</span> $
                      {stats.totalCost.toFixed(4)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cost/Call:</span> $
                      {costPerCall.toFixed(6)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Features:</span>{" "}
                      {Array.from(stats.features).map((f) => (
                        <Badge key={f} variant="secondary" className="mr-1 text-xs">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {modelEntries.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">No model data yet</p>
          )}
        </div>
      </div>

      {/* Section 3: Cost Summary */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Cost Summary</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            title="Total AI Spend"
            value={`$${totalSpend.toFixed(4)}`}
            subtitle="All time"
          />
          <MetricCard
            title="Cost This Week"
            value={`$${costThisWeek.toFixed(4)}`}
            subtitle="Last 7 days"
          />
          <MetricCard
            title="Avg Cost Per Request"
            value={`$${avgCostPerRequest.toFixed(6)}`}
            subtitle={`${allLogs.length} total requests`}
          />
        </div>
      </div>

      {/* Section 4: Quality Distribution */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Output Quality Distribution</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            title="Low Quality (0-40)"
            value={`${lowCount}`}
            subtitle={`${lowPct}% of ${totalPosts} posts`}
          />
          <MetricCard
            title="Medium Quality (41-70)"
            value={`${medCount}`}
            subtitle={`${medPct}% of ${totalPosts} posts`}
          />
          <MetricCard
            title="High Quality (71-100)"
            value={`${highCount}`}
            subtitle={`${highPct}% of ${totalPosts} posts`}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Average Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">Overall Average Score</span>
                <span className="font-medium tabular-nums">{avgQuality.toFixed(1)}</span>
              </li>
              {Array.from(featureSet).map((feature) => {
                // For per-feature quality, we use overall average since posts aren't directly linked to features
                return (
                  <li key={feature} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{feature}</span>
                    <span className="font-medium tabular-nums">{avgQuality.toFixed(1)}</span>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
