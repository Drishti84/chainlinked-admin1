"use client"

import {
  LineChart,
  Line,
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
import { BarChart3Icon } from "lucide-react"

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

const tooltipStyle = {
  backgroundColor: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
}

function ChartEmpty({ message = "No data yet" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
      <BarChart3Icon className="size-10 mb-2 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

interface DailyCostLineProps {
  data: { date: string; cost: number }[]
}

export function CostDailyLineChart({ data }: DailyCostLineProps) {
  const hasData = data.some((d) => d.cost > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Cost (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <ChartEmpty message="No cost data in the last 30 days" />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `$${v.toFixed(3)}`} />
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(4)}`, "Cost"]} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="cost" stroke="hsl(221, 83%, 53%)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface CostByModelBarProps {
  data: { model: string; cost: number }[]
}

export function CostByModelBarChart({ data }: CostByModelBarProps) {
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
                <XAxis dataKey="model" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `$${v.toFixed(3)}`} />
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(4)}`, "Cost"]} contentStyle={tooltipStyle} />
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

interface CostByFeatureBarProps {
  data: { feature: string; cost: number }[]
}

export function CostByFeatureBarChart({ data }: CostByFeatureBarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost by Feature</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <ChartEmpty message="No feature cost data" />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="feature" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `$${v.toFixed(3)}`} />
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(4)}`, "Cost"]} contentStyle={tooltipStyle} />
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

interface MonthlyTrendProps {
  data: { month: string; cost: number }[]
}

export function MonthlyTrendChart({ data }: MonthlyTrendProps) {
  const hasData = data.some((d) => d.cost > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Cost Trend (Last 6 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <ChartEmpty message="No monthly cost data yet" />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `$${v.toFixed(2)}`} />
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(4)}`, "Cost"]} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="cost" stroke="hsl(262, 83%, 58%)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
