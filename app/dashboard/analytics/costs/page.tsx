import { supabaseAdmin } from "@/lib/supabase/client"
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
import { DollarSignIcon, CalendarDaysIcon, CalendarIcon, ClockIcon } from "lucide-react"
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
    let model = (l.model ?? "unknown").split("/").pop() || l.model || "unknown"
    // Shorten long model names for chart readability
    model = model.replace("-2025-04-14", "").replace("openai/", "")
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
    const uid = l.user_id || "unknown"
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
      <div>
        <h1 className="text-2xl font-semibold">Cost Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          AI spending analysis across models, features, and users
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total AI Spend"
          value={`$${totalSpend.toFixed(4)}`}
          subtitle="All time"
          icon={DollarSignIcon}
          accent="primary"
        />
        <MetricCard
          title="This Month"
          value={`$${monthSpend.toFixed(4)}`}
          subtitle={startOfMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          icon={CalendarDaysIcon}
          accent="blue"
        />
        <MetricCard
          title="This Week"
          value={`$${weekSpend.toFixed(4)}`}
          subtitle="Last 7 days"
          icon={CalendarIcon}
          accent="amber"
        />
        <MetricCard
          title="Today"
          value={`$${todaySpend.toFixed(4)}`}
          subtitle={now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          icon={ClockIcon}
          accent="emerald"
        />
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
      <Card className="border-border/50 bg-gradient-to-br from-card via-card to-primary/3 overflow-hidden">
        <CardHeader>
          <CardTitle>Top Users by Cost</CardTitle>
          <CardDescription>{userCostRows.length} users with AI usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/50 overflow-hidden">
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
                <TableRow className="hover:bg-muted/30 transition-colors">
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No cost data
                  </TableCell>
                </TableRow>
              ) : (
                userCostRows.map(([uid, stats]) => {
                  const pct = (stats.cost / maxUserCost) * 100
                  return (
                    <TableRow key={uid} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        {profileMap.get(uid) || (uid === "unknown" || uid === "null" || !uid ? "Unknown" : uid.slice(0, 8))}
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
          </div>
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
