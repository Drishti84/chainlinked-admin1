"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { BarChart3Icon } from "lucide-react"

interface DailyCostTrendProps {
  data: { date: string; cost: number }[]
}

export function DailyCostTrend({ data }: DailyCostTrendProps) {
  const hasData = data.some((d) => d.cost > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Cost Trend (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
            <BarChart3Icon className="size-10 mb-2 opacity-40" />
            <p className="text-sm">No cost data in the last 30 days</p>
          </div>
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
