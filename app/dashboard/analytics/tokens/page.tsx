import { supabaseAdmin } from "@/lib/supabase/client"
import { getOpenRouterBalance, getOpenRouterActivity, getOpenRouterCredits } from "@/lib/openrouter"
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
import { Badge } from "@/components/ui/badge"
import { DailyCostTrend } from "@/components/charts/token-charts"
import {
  CoinsIcon,
  DollarSignIcon,
  CalendarIcon,
  TrendingUpIcon,
  ZapIcon,
  CpuIcon,
  HashIcon,
  WalletIcon,
} from "lucide-react"

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
  const [{ data: logs }, openRouterBalance, openRouterActivity, openRouterCredits] = await Promise.all([
    supabaseAdmin
      .from("prompt_usage_logs")
      .select("user_id, input_tokens, output_tokens, total_tokens, estimated_cost, model, feature, response_time_ms, created_at"),
    getOpenRouterBalance(),
    getOpenRouterActivity(),
    getOpenRouterCredits(),
  ])

  const allLogs = logs ?? []

  // Local DB metrics
  const totalTokens = allLogs.reduce((sum, l) => sum + (l.total_tokens ?? 0), 0)
  const totalCost = allLogs.reduce((sum, l) => sum + (l.estimated_cost || 0), 0)
  const uniqueUsers = new Set(allLogs.map((l) => l.user_id)).size

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekLogs = allLogs.filter((l) => new Date(l.created_at) >= weekAgo)
  const tokensThisWeek = weekLogs.reduce((sum, l) => sum + (l.total_tokens ?? 0), 0)

  // Per-user breakdown
  const userMap: Record<string, { tokens: number; cost: number; requests: number; lastUsed: string }> = {}
  for (const l of allLogs) {
    const uid = l.user_id || "unknown"
    if (!userMap[uid]) userMap[uid] = { tokens: 0, cost: 0, requests: 0, lastUsed: l.created_at }
    userMap[uid].tokens += l.total_tokens ?? 0
    userMap[uid].cost += l.estimated_cost || 0
    userMap[uid].requests += 1
    if (l.created_at > userMap[uid].lastUsed) userMap[uid].lastUsed = l.created_at
  }

  const userIds = Object.keys(userMap)
  const validUserIds = userIds.filter((id) => id !== "unknown")
  const { data: profiles } = validUserIds.length > 0
    ? await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", validUserIds)
    : { data: [] }

  const profileMap = new Map<string, string>()
  for (const p of profiles ?? []) profileMap.set(p.id, p.full_name || p.email || p.id.slice(0, 8))

  const userRows = userIds
    .map((uid) => ({
      id: uid,
      name: profileMap.get(uid) || (uid === "unknown" ? "Unknown" : uid.slice(0, 8)),
      ...userMap[uid],
      avgTokens: userMap[uid].requests > 0 ? Math.round(userMap[uid].tokens / userMap[uid].requests) : 0,
    }))
    .sort((a, b) => b.tokens - a.tokens)

  const maxTokens = userRows.length > 0 ? userRows[0].tokens : 1

  // Daily cost trend chart data
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const dailyCostMap: Record<string, number> = {}
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
    dailyCostMap[d.toISOString().split("T")[0]] = 0
  }
  for (const l of allLogs) {
    const dateKey = new Date(l.created_at).toISOString().split("T")[0]
    if (dailyCostMap[dateKey] !== undefined) dailyCostMap[dateKey] += l.estimated_cost || 0
  }
  const dailyCostData = Object.entries(dailyCostMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cost]) => ({ date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }), cost }))

  // --- OpenRouter Activity: Per-model aggregation ---
  const activity = openRouterActivity ?? []
  const hasActivity = activity.length > 0

  const modelSpend: Record<string, number> = {}
  const modelRequests: Record<string, number> = {}
  const modelTokens: Record<string, { prompt: number; completion: number; total: number }> = {}

  let orTotalSpend = 0
  let orTotalRequests = 0
  let orTotalTokens = 0

  for (const entry of activity) {
    const model = entry.model?.split("/").pop()?.replace(/-2025.*$/, "") || entry.model || "unknown"

    modelSpend[model] = (modelSpend[model] ?? 0) + (entry.usage || 0)
    modelRequests[model] = (modelRequests[model] ?? 0) + (entry.requests || 0)

    if (!modelTokens[model]) modelTokens[model] = { prompt: 0, completion: 0, total: 0 }
    modelTokens[model].prompt += entry.prompt_tokens || 0
    modelTokens[model].completion += entry.completion_tokens || 0
    modelTokens[model].total += (entry.prompt_tokens || 0) + (entry.completion_tokens || 0)

    orTotalSpend += entry.usage || 0
    orTotalRequests += entry.requests || 0
    orTotalTokens += (entry.prompt_tokens || 0) + (entry.completion_tokens || 0)
  }

  const spendEntries = Object.entries(modelSpend).sort((a, b) => b[1] - a[1])
  const requestEntries = Object.entries(modelRequests).sort((a, b) => b[1] - a[1])
  const tokenEntries = Object.entries(modelTokens).sort((a, b) => b[1].total - a[1].total)

  // Credits
  const credits = openRouterCredits
  const balance = credits ? credits.total_credits - credits.total_usage : null

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold">Token Usage Analytics</h1>
        <p className="text-sm text-muted-foreground">Token consumption and cost tracking</p>
      </div>

      {/* OpenRouter Account */}
      {openRouterBalance && (
        <Card className="group/card relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-amber-500/3 transition-all duration-300 card-glow">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/3 via-transparent to-primary/3 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 pointer-events-none" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 ring-1 ring-amber-500/10">
                <ZapIcon className="size-5 text-amber-500" />
              </div>
              <div>
                <CardTitle>OpenRouter Account</CardTitle>
                <CardDescription>API balance and limits</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Credits Used</p>
                <p className="text-xl font-bold tabular-nums">${openRouterBalance.usage.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Credit Limit</p>
                <p className="text-xl font-bold tabular-nums">
                  {openRouterBalance.limit ? `$${openRouterBalance.limit.toFixed(2)}` : "Unlimited"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Tier</p>
                <p className="text-xl font-semibold">
                  <Badge variant={openRouterBalance.is_free_tier ? "secondary" : "default"}>
                    {openRouterBalance.is_free_tier ? "Free" : "Paid"}
                  </Badge>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {balance !== null ? "Balance" : "Rate Limit"}
                </p>
                <p className="text-xl font-bold tabular-nums">
                  {balance !== null
                    ? `$${balance.toFixed(4)}`
                    : `${openRouterBalance.rate_limit.requests}/${openRouterBalance.rate_limit.interval}`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Spend"
          value={hasActivity ? `$${orTotalSpend.toFixed(4)}` : `$${totalCost.toFixed(4)}`}
          subtitle={hasActivity ? "From OpenRouter" : "From local logs"}
          icon={DollarSignIcon}
          accent="amber"
          compact
        />
        <MetricCard
          title="Total Requests"
          value={hasActivity ? orTotalRequests.toLocaleString() : allLogs.length.toLocaleString()}
          subtitle={hasActivity ? "Last 30 days" : "All time"}
          icon={HashIcon}
          accent="primary"
          compact
        />
        <MetricCard
          title="Total Tokens"
          value={hasActivity ? orTotalTokens.toLocaleString() : totalTokens.toLocaleString()}
          subtitle={hasActivity ? "Prompt + completion" : "All time"}
          icon={CoinsIcon}
          accent="blue"
          compact
        />
        <MetricCard
          title="This Week"
          value={`$${costThisWeek.toFixed(4)}`}
          subtitle={`${tokensThisWeek.toLocaleString()} tokens`}
          icon={CalendarIcon}
          accent="emerald"
          compact
        />
      </div>

      {/* OpenRouter Model Breakdown — 3 sections side by side */}
      {hasActivity && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Spend by Model */}
          <Card className="group/card relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-amber-500/3 transition-all duration-300 card-glow">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/3 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 pointer-events-none" />
            <CardHeader className="relative">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/15 to-amber-500/5 ring-1 ring-amber-500/10">
                  <WalletIcon className="size-4 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Spend by Model</CardTitle>
                  <CardDescription>${orTotalSpend.toFixed(4)} total</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-3">
                {spendEntries.map(([model, spend]) => {
                  const pct = orTotalSpend > 0 ? (spend / orTotalSpend) * 100 : 0
                  return (
                    <div key={model}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-mono text-xs font-medium truncate">{model}</span>
                        <span className="tabular-nums font-medium shrink-0 ml-2">${spend.toFixed(4)}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
                {spendEntries.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No spend data</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Requests by Model */}
          <Card className="group/card relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/3 transition-all duration-300 card-glow">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 pointer-events-none" />
            <CardHeader className="relative">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
                  <HashIcon className="size-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Requests by Model</CardTitle>
                  <CardDescription>{orTotalRequests.toLocaleString()} total</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-3">
                {requestEntries.map(([model, requests]) => {
                  const pct = orTotalRequests > 0 ? (requests / orTotalRequests) * 100 : 0
                  return (
                    <div key={model}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-mono text-xs font-medium truncate">{model}</span>
                        <span className="tabular-nums font-medium shrink-0 ml-2">{requests.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
                {requestEntries.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No request data</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tokens by Model */}
          <Card className="group/card relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-blue-500/3 transition-all duration-300 card-glow">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 pointer-events-none" />
            <CardHeader className="relative">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/15 to-blue-500/5 ring-1 ring-blue-500/10">
                  <CoinsIcon className="size-4 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Tokens by Model</CardTitle>
                  <CardDescription>{orTotalTokens.toLocaleString()} total</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-3">
                {tokenEntries.map(([model, tokens]) => {
                  const pct = orTotalTokens > 0 ? (tokens.total / orTotalTokens) * 100 : 0
                  return (
                    <div key={model}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-mono text-xs font-medium truncate">{model}</span>
                        <span className="tabular-nums font-medium shrink-0 ml-2">{tokens.total.toLocaleString()}</span>
                      </div>
                      <div className="flex text-[10px] text-muted-foreground gap-2 mb-1">
                        <span>{tokens.prompt.toLocaleString()} prompt</span>
                        <span>·</span>
                        <span>{tokens.completion.toLocaleString()} completion</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
                {tokenEntries.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No token data</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily Cost Trend */}
      <DailyCostTrend data={dailyCostData} />

      {/* Per-User Breakdown */}
      <Card className="group/card relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/3 transition-all duration-300 card-glow">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/3 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 pointer-events-none" />
        <CardHeader className="relative">
          <CardTitle>Per-User Breakdown</CardTitle>
          <CardDescription>{userRows.length} users tracked</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Total Tokens</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Avg Tokens/Req</TableHead>
                  <TableHead className="text-right">Last Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No usage data</TableCell>
                  </TableRow>
                ) : (
                  userRows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.tokens.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">${row.cost.toFixed(4)}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.requests.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.avgTokens.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {new Date(row.lastUsed).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
