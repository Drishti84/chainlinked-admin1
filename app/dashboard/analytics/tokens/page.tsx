import { supabaseAdmin } from "@/lib/supabase/client"
import { getOpenRouterBalance } from "@/lib/openrouter"
import { MetricCard } from "@/components/metric-card"
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

export default async function TokensAnalyticsPage() {
  // Fetch all usage logs and OpenRouter balance in parallel
  const [{ data: logs }, openRouterBalance] = await Promise.all([
    supabaseAdmin
      .from("prompt_usage_logs")
      .select("user_id, total_tokens, estimated_cost, model, feature, response_time_ms, created_at"),
    getOpenRouterBalance(),
  ])

  const allLogs = logs ?? []

  // Calculate totals
  const totalTokens = allLogs.reduce((sum, l) => sum + (l.total_tokens ?? 0), 0)
  const totalCost = allLogs.reduce((sum, l) => sum + (l.estimated_cost ?? 0), 0)

  // Unique users
  const uniqueUsers = new Set(allLogs.map((l) => l.user_id)).size
  const avgCostPerUser = uniqueUsers > 0 ? totalCost / uniqueUsers : 0
  const avgCostPerRequest = allLogs.length > 0 ? totalCost / allLogs.length : 0

  // This week
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekLogs = allLogs.filter(
    (l) => new Date(l.created_at) >= weekAgo
  )
  const tokensThisWeek = weekLogs.reduce((sum, l) => sum + (l.total_tokens ?? 0), 0)
  const costThisWeek = weekLogs.reduce((sum, l) => sum + (l.estimated_cost ?? 0), 0)

  // Cost by model
  const costByModel: Record<string, number> = {}
  for (const l of allLogs) {
    const model = l.model ?? "unknown"
    costByModel[model] = (costByModel[model] ?? 0) + (l.estimated_cost ?? 0)
  }
  const modelEntries = Object.entries(costByModel).sort((a, b) => b[1] - a[1])

  // Cost by feature
  const costByFeature: Record<string, number> = {}
  for (const l of allLogs) {
    const feature = l.feature ?? "unknown"
    costByFeature[feature] = (costByFeature[feature] ?? 0) + (l.estimated_cost ?? 0)
  }
  const featureEntries = Object.entries(costByFeature).sort((a, b) => b[1] - a[1])

  // Per-user breakdown
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
    userMap[uid].cost += l.estimated_cost ?? 0
    userMap[uid].requests += 1
    if (l.created_at > userMap[uid].lastUsed) {
      userMap[uid].lastUsed = l.created_at
    }
  }

  // Fetch profiles for user names
  const userIds = Object.keys(userMap)
  const { data: profiles } = userIds.length > 0
    ? await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds)
    : { data: [] }

  const profileMap: Record<string, { full_name: string; email: string }> = {}
  for (const p of profiles ?? []) {
    profileMap[p.id] = { full_name: p.full_name ?? "", email: p.email ?? "" }
  }

  const userRows = userIds
    .map((uid) => ({
      id: uid,
      name: profileMap[uid]?.full_name || profileMap[uid]?.email || uid.slice(0, 8),
      ...userMap[uid],
      avgTokens: userMap[uid].requests > 0
        ? Math.round(userMap[uid].tokens / userMap[uid].requests)
        : 0,
    }))
    .sort((a, b) => b.cost - a.cost)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Token Usage Analytics</h1>

      {openRouterBalance && (
        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>OpenRouter Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Credits Used</p>
                  <p className="text-xl font-semibold">${openRouterBalance.usage.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Credit Limit</p>
                  <p className="text-xl font-semibold">
                    {openRouterBalance.limit ? `$${openRouterBalance.limit.toFixed(2)}` : "Unlimited"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tier</p>
                  <p className="text-xl font-semibold">
                    {openRouterBalance.is_free_tier ? "Free" : "Paid"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rate Limit</p>
                  <p className="text-xl font-semibold">
                    {openRouterBalance.rate_limit.requests}/{openRouterBalance.rate_limit.interval}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Total Tokens"
          value={totalTokens.toLocaleString()}
          subtitle="All time"
        />
        <MetricCard
          title="Total Cost"
          value={`$${totalCost.toFixed(4)}`}
          subtitle="All time"
        />
        <MetricCard
          title="Avg Cost / User"
          value={`$${avgCostPerUser.toFixed(4)}`}
          subtitle={`${uniqueUsers} users`}
        />
        <MetricCard
          title="Avg Cost / Request"
          value={`$${avgCostPerRequest.toFixed(6)}`}
          subtitle={`${allLogs.length} requests`}
        />
        <MetricCard
          title="Tokens This Week"
          value={tokensThisWeek.toLocaleString()}
          subtitle="Last 7 days"
        />
        <MetricCard
          title="Cost This Week"
          value={`$${costThisWeek.toFixed(4)}`}
          subtitle="Last 7 days"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cost by Model</CardTitle>
          </CardHeader>
          <CardContent>
            {modelEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              <ul className="space-y-2">
                {modelEntries.map(([model, cost]) => (
                  <li
                    key={model}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{model}</span>
                    <span className="tabular-nums text-muted-foreground">
                      ${cost.toFixed(4)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost by Feature</CardTitle>
          </CardHeader>
          <CardContent>
            {featureEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              <ul className="space-y-2">
                {featureEntries.map(([feature, cost]) => (
                  <li
                    key={feature}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{feature}</span>
                    <span className="tabular-nums text-muted-foreground">
                      ${cost.toFixed(4)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per-User Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
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
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No usage data
                  </TableCell>
                </TableRow>
              ) : (
                userRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.tokens.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      ${row.cost.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.requests.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.avgTokens.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {new Date(row.lastUsed).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
