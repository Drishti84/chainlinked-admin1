import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  subtitle?: string
}

export function MetricCard({ title, value, change, subtitle }: MetricCardProps) {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0
  const TrendIcon = isPositive
    ? TrendingUpIcon
    : isNegative
    ? TrendingDownIcon
    : MinusIcon

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {typeof value === "number" ? value.toLocaleString() : value}
        </CardTitle>
        {change !== undefined && (
          <CardAction>
            <Badge variant="outline">
              <TrendIcon />
              {change > 0 ? "+" : ""}
              {change.toFixed(1)}%
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {subtitle && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">{subtitle}</div>
        </CardFooter>
      )}
    </Card>
  )
}
