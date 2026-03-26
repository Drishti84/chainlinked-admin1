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
    <Card>
      <CardHeader>
        <CardTitle>Per-User Feature Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div
            className="inline-grid gap-px"
            style={{
              gridTemplateColumns: `160px repeat(${features.length}, minmax(90px, 1fr))`,
            }}
          >
            {/* Header */}
            <div className="sticky left-0 bg-background px-2 py-1.5 text-xs font-medium text-muted-foreground">
              User
            </div>
            {features.map((f) => (
              <div key={f.key} className="px-2 py-1.5 text-xs font-medium text-muted-foreground text-center truncate">
                {f.label}
              </div>
            ))}

            {/* Rows */}
            {users.map((user) => {
              const userTotal = getUserFeatureCount(user.id)
              return (
                <React.Fragment key={user.id}>
                  <div
                    className="sticky left-0 bg-background px-2 py-1.5 text-xs font-medium truncate border-t border-border/50"
                  >
                    {user.name}
                  </div>
                  {features.map((f) => {
                    const used = matrixSets[f.key]?.has(user.id) ?? false
                    return (
                      <div
                        key={`${user.id}-${f.key}`}
                        className="px-2 py-1.5 text-xs text-center border-t border-border/50 rounded-sm relative group cursor-default"
                        style={{ backgroundColor: getCellColor(used, userTotal) }}
                      >
                        {used ? (
                          <span className="font-medium text-primary-foreground mix-blend-difference">Yes</span>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-popover text-popover-foreground border border-border rounded px-2 py-1 text-xs whitespace-nowrap shadow-md z-10">
                          {user.name}: {used ? `Uses ${f.label}` : `No ${f.label}`}
                        </div>
                      </div>
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
