import { supabaseAdmin } from "@/lib/supabase/client"
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
import {
  CostDailyLineChart,
  CostByModelBarChart,
  CostByFeatureBarChart,
  MonthlyTrendChart,
} from "@/components/charts/cost-charts"

export default async function CostDashboardPage() {
  const [{ data: logs }, { data: profiles }] = await Promise.all([
    supabaseAdmin
      .from("prompt_usage_logs")
      .select("user_id, estimated_cost, model, feature, created_at"),
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, email"),
  ])

  const allLogs = logs ?? []

  const profileMap = new Map<string, string>()
  for (const p of profiles ?? []) {
    profileMap.set(p.id, p.full_name || p.email || p.id.slice(0, 8))
  }

  const now = new Date()

  // ---- Summary metrics ----
  const totalSpend = allLogs.reduce((s, l) => s + (l.estimated_cost || 0), 0)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthLogs = allLogs.filter((l) => new Date(l.created_at) >= startOfMonth)
  const monthSpend = monthLogs.reduce((s, l) => s + (l.estimated_cost || 0), 0)

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekLogs = allLogs.filter((l) => new Date(l.created_at) >= weekAgo)
  const weekSpend = weekLogs.reduce((s, l) => s + (l.estimated_cost || 0), 0)

  const todayStr = now.toISOString().split("T")[0]
  const todayLogs = allLogs.filter((l) => l.created_at.startsWith(todayStr))
  const todaySpend = todayLogs.reduce((s, l) => s + (l.estimated_cost || 0), 0)

  const totalRequests = allLogs.length
  const avgPerRequest = totalRequests > 0 ? totalSpend / totalRequests : 0

  // ---- Daily cost (last 30 days) ----
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const dailyCostMap: Record<string, number> = {}
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
    dailyCostMap[d.toISOString().split("T")[0]] = 0
  }
  for (const l of allLogs) {
    const key = new Date(l.created_at).toISOString().split("T")[0]
    if (dailyCostMap[key] !== undefined) {
      dailyCostMap[key] += l.estimated_cost || 0
    }
  }
  const dailyCostData = Object.entries(dailyCostMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cost]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      cost,
    }))

  // ---- Cost by model ----
  const costByModel: Record<string, number> = {}
  for (const l of allLogs) {
    const model = (l.model ?? "unknown").split("/").pop() || l.model || "unknown"
    costByModel[model] = (costByModel[model] ?? 0) + (l.estimated_cost || 0)
  }
  const costByModelData = Object.entries(costByModel)
    .sort((a, b) => b[1] - a[1])
    .map(([model, cost]) => ({ model, cost }))

  // ---- Cost by feature ----
  const costByFeature: Record<string, number> = {}
  for (const l of allLogs) {
    const feature = l.feature ?? "unknown"
    costByFeature[feature] = (costByFeature[feature] ?? 0) + (l.estimated_cost || 0)
  }
  const costByFeatureData = Object.entries(costByFeature)
    .sort((a, b) => b[1] - a[1])
    .map(([feature, cost]) => ({ feature, cost }))

  // ---- Cost by user ----
  const costByUser: Record<string, { cost: number; requests: number }> = {}
  for (const l of allLogs) {
    const uid = l.user_id
    if (!costByUser[uid]) costByUser[uid] = { cost: 0, requests: 0 }
    costByUser[uid].cost += l.estimated_cost || 0
    costByUser[uid].requests += 1
  }
  const userCostRows = Object.entries(costByUser)
    .sort((a, b) => b[1].cost - a[1].cost)
    .slice(0, 20)
  const maxUserCost = userCostRows.length > 0 ? userCostRows[0][1].cost : 1

  // ---- Monthly trend (last 6 months) ----
  const monthlyCostMap: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    monthlyCostMap[key] = 0
  }
  for (const l of allLogs) {
    const d = new Date(l.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    if (monthlyCostMap[key] !== undefined) {
      monthlyCostMap[key] += l.estimated_cost || 0
    }
  }
  const monthlyTrendData = Object.entries(monthlyCostMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, cost]) => {
      const [y, m] = month.split("-")
      const d = new Date(Number(y), Number(m) - 1)
      return {
        month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        cost,
      }
    })

  // ---- Monthly trend cards data ----
  const monthlyTrendCards = Object.entries(monthlyCostMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month], idx, arr) => {
      const [y, m] = month.split("-")
      const d = new Date(Number(y), Number(m) - 1)
      const cost = monthlyCostMap[month]
      const prevCost = idx > 0 ? monthlyCostMap[arr[idx - 1][0]] : null
      const change = prevCost !== null && prevCost > 0 ? ((cost - prevCost) / prevCost) * 100 : null
      return {
        label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        cost,
        change,
      }
    })

  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Page Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Cost Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Track spending across models, features, and time periods.
        </p>
      </div>

      {/* Cost Summary Banner */}
      <Card className="rounded-xl border">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
            {/* Total Cost */}
            <div className="p-5 lg:p-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Total Cost
              </p>
              <p className="text-2xl lg:text-3xl font-semibold tabular-nums text-primary mt-1">
                ${totalSpend.toFixed(4)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </div>

            {/* This Month */}
            <div className="p-5 lg:p-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                This Month
              </p>
              <p className="text-2xl lg:text-3xl font-semibold tabular-nums mt-1">
                ${monthSpend.toFixed(4)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {startOfMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            </div>

            {/* Per Request */}
            <div className="p-5 lg:p-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Per Request
              </p>
              <p className="text-2xl lg:text-3xl font-semibold tabular-nums mt-1">
                ${avgPerRequest.toFixed(6)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Average cost</p>
            </div>

            {/* Total Requests */}
            <div className="p-5 lg:p-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Total Requests
              </p>
              <p className="text-2xl lg:text-3xl font-semibold tabular-nums mt-1">
                {totalRequests.toLocaleString("en-US")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Period Info Banner */}
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4 shrink-0 opacity-60"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
            clipRule="evenodd"
          />
        </svg>
        <span>
          Current period: <span className="font-medium text-foreground">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
          {" "}&middot; Today&apos;s spend: <span className="font-medium text-foreground">${todaySpend.toFixed(4)}</span>
          {" "}&middot; This week: <span className="font-medium text-foreground">${weekSpend.toFixed(4)}</span>
        </span>
      </div>

      {/* Daily Cost Chart */}
      <div className="rounded-xl border bg-card">
        <CostDailyLineChart data={dailyCostData} />
      </div>

      {/* Cost by Model + Feature */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card">
          <CostByModelBarChart data={costByModelData} />
        </div>
        <div className="rounded-xl border bg-card">
          <CostByFeatureBarChart data={costByFeatureData} />
        </div>
      </div>

      {/* Cost by User */}
      <Card className="rounded-xl border">
        <CardHeader>
          <CardTitle>Top Users by Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Avg/Req</TableHead>
                <TableHead className="w-[200px]">Spend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userCostRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No cost data
                  </TableCell>
                </TableRow>
              ) : (
                userCostRows.map(([uid, stats]) => {
                  const pct = (stats.cost / maxUserCost) * 100
                  return (
                    <TableRow key={uid}>
                      <TableCell className="font-medium">
                        {profileMap.get(uid) || uid.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-mono">
                        ${stats.cost.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {stats.requests.toLocaleString("en-US")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-mono">
                        ${stats.requests > 0 ? (stats.cost / stats.requests).toFixed(6) : "0"}
                      </TableCell>
                      <TableCell>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monthly Trend Chart */}
      <div className="rounded-xl border bg-card">
        <MonthlyTrendChart data={monthlyTrendData} />
      </div>

      {/* Monthly Trend Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Monthly Breakdown</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {monthlyTrendCards.map((item) => (
            <Card key={item.label} className="rounded-xl border">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                <p className="text-xl font-semibold tabular-nums mt-1">
                  ${item.cost.toFixed(4)}
                </p>
                {item.change !== null && (
                  <p
                    className={`text-xs font-medium mt-1 ${
                      item.change >= 0 ? "text-red-500" : "text-green-500"
                    }`}
                  >
                    {item.change >= 0 ? "+" : ""}
                    {item.change.toFixed(1)}% vs prev month
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
