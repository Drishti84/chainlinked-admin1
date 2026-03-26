"use client"

import React from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import type { PieLabelRenderProps } from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { BarChart3Icon } from "lucide-react"
import { HeatmapCell } from "./heatmap-cell"

const COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(199, 89%, 48%)",
  "hsl(330, 81%, 60%)",
  "hsl(160, 60%, 45%)",
]

function ChartEmpty({ message = "No data yet" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
      <BarChart3Icon className="size-10 mb-2 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

interface DailyCostChartProps {
  data: { date: string; cost: number }[]
}

export function DailyCostChart({ data }: DailyCostChartProps) {
  const hasData = data.some((d) => d.cost > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily AI Cost (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <ChartEmpty message="No AI cost data in the last 30 days" />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  tickFormatter={(v) => `$${v.toFixed(3)}`}
                />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toFixed(4)}`, "Cost"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="hsl(221, 83%, 53%)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface CostByModelChartProps {
  data: { model: string; cost: number }[]
}

export function CostByModelChart({ data }: CostByModelChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost by Model</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <ChartEmpty message="No model cost data" />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="model"
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  tickFormatter={(v) => `$${v.toFixed(3)}`}
                />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toFixed(4)}`, "Cost"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface DailyTokenChartProps {
  data: { date: string; input: number; output: number }[]
}

export function DailyTokenChart({ data }: DailyTokenChartProps) {
  const hasData = data.some((d) => d.input > 0 || d.output > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Token Usage (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <ChartEmpty message="No token usage in the last 30 days" />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                />
                <Tooltip
                  formatter={(value, name) => [
                    Number(value).toLocaleString(),
                    name === "input" ? "Input Tokens" : "Output Tokens",
                  ]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="input" stroke="hsl(221, 83%, 53%)" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="output" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface UsageByFeatureChartProps {
  data: { feature: string; count: number }[]
}

export function UsageByFeatureChart({ data }: UsageByFeatureChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage by Feature</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <ChartEmpty message="No feature usage data" />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="feature"
                  label={(props: PieLabelRenderProps) =>
                    `${props.name ?? ""} (${((Number(props.percent) || 0) * 100).toFixed(0)}%)`
                  }
                  labelLine={{ strokeWidth: 1 }}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [Number(value).toLocaleString(), String(name)]}
                  wrapperStyle={{ zIndex: 50 }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface UserFeatureHeatmapProps {
  users: { id: string; name: string }[]
  features: string[]
  matrix: Record<string, Record<string, number>>
  maxCount: number
}

export function UserFeatureHeatmap({ users, features, matrix, maxCount }: UserFeatureHeatmapProps) {
  function getIntensity(count: number): string {
    if (count === 0) return "transparent"
    const ratio = Math.min(count / Math.max(maxCount, 1), 1)
    const alpha = 0.15 + ratio * 0.85
    return `hsla(221, 83%, 53%, ${alpha})`
  }

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card via-card to-primary/3">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 text-primary"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
          </div>
          <div>
            <CardTitle>Per-User Feature Heatmap</CardTitle>
            <p className="text-xs text-muted-foreground">{users.length} users · {features.length} features</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-8">
          <div className="inline-grid gap-px rounded-lg border border-border/50 overflow-visible bg-border/30" style={{
            gridTemplateColumns: `160px repeat(${features.length}, minmax(80px, 1fr))`,
          }}>
            {/* Header row */}
            <div className="sticky left-0 bg-muted/60 px-3 py-2 text-xs font-semibold text-muted-foreground">
              User
            </div>
            {features.map((f) => (
              <div key={f} className="bg-muted/60 px-2 py-2 text-xs font-semibold text-muted-foreground text-center truncate">
                {f}
              </div>
            ))}

            {/* Data rows */}
            {users.map((user) => (
              <>
                <div key={`name-${user.id}`} className="sticky left-0 bg-card px-3 py-2.5 text-xs font-medium truncate">
                  {user.name}
                </div>
                {features.map((f) => {
                  const count = matrix[user.id]?.[f] ?? 0
                  return (
                    <HeatmapCell
                      key={`${user.id}-${f}`}
                      tooltip={`${user.name}: ${count} ${f} request${count !== 1 ? "s" : ""}`}
                      color={count > 0 ? getIntensity(count) : undefined}
                      className="bg-card tabular-nums"
                    >
                      {count > 0 ? (
                        <span className="font-semibold">{count}</span>
                      ) : (
                        <span className="text-muted-foreground/30">·</span>
                      )}
                    </HeatmapCell>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
