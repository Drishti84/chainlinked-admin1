"use client"

import React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

interface FeatureAdoptionChartProps {
  data: { label: string; count: number; users: number }[]
}

export function FeatureAdoptionChart({ data }: FeatureAdoptionChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Adoption (Records Count)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis
                type="category"
                dataKey="label"
                width={140}
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <Tooltip
                formatter={(value) => [
                  `${Number(value).toLocaleString("en-US")} records`,
                  "Adoption",
                ]}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

interface FeatureHeatmapProps {
  users: { id: string; name: string }[]
  features: { key: string; label: string }[]
  /** feature key -> array of user IDs that use it */
  matrix: Record<string, string[]>
  maxFeatures: number
}

export function FeatureHeatmapGrid({ users, features, matrix, maxFeatures }: FeatureHeatmapProps) {
  // Pre-build sets for fast lookup
  const matrixSets: Record<string, Set<string>> = {}
  for (const [key, uids] of Object.entries(matrix)) {
    matrixSets[key] = new Set(uids)
  }

  function getUserFeatureCount(uid: string): number {
    let count = 0
    for (const f of features) {
      if (matrixSets[f.key]?.has(uid)) count++
    }
    return count
  }

  function getCellColor(used: boolean, userTotal: number): string {
    if (!used) return "transparent"
    const ratio = Math.min(userTotal / Math.max(maxFeatures, 1), 1)
    const alpha = 0.3 + ratio * 0.7
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
            <CardTitle>Per-User Feature Matrix</CardTitle>
            <p className="text-xs text-muted-foreground">{users.length} users · {features.length} features</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-8">
          <div
            className="inline-grid gap-px rounded-lg border border-border/50 overflow-visible bg-border/30"
            style={{
              gridTemplateColumns: `160px repeat(${features.length}, minmax(90px, 1fr))`,
            }}
          >
            {/* Header */}
            <div className="sticky left-0 bg-muted/60 px-3 py-2 text-xs font-semibold text-muted-foreground">
              User
            </div>
            {features.map((f) => (
              <div key={f.key} className="bg-muted/60 px-2 py-2 text-xs font-semibold text-muted-foreground text-center truncate">
                {f.label}
              </div>
            ))}

            {/* Rows */}
            {users.map((user) => {
              const userTotal = getUserFeatureCount(user.id)
              return (
                <React.Fragment key={user.id}>
                  <div
                    key={`name-${user.id}`}
                    className="sticky left-0 bg-card px-3 py-2.5 text-xs font-medium truncate"
                  >
                    {user.name}
                  </div>
                  {features.map((f) => {
                    const used = matrixSets[f.key]?.has(user.id) ?? false
                    return (
                      <HeatmapCell
                        key={`${user.id}-${f.key}`}
                        tooltip={`${user.name}: ${used ? `Uses ${f.label}` : `No ${f.label}`}`}
                        color={used ? getCellColor(used, userTotal) : undefined}
                        className="bg-card"
                      >
                        {used ? (
                          <span className="font-semibold text-foreground">Yes</span>
                        ) : (
                          <span className="text-muted-foreground/30">·</span>
                        )}
                      </HeatmapCell>
                    )
                  })}
                </React.Fragment>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
