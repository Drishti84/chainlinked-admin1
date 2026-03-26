"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BrainCircuitIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"

interface PromptStat {
  name: string
  type: string
  category: string
  calls: number
  avgInputTokens: number
  avgOutputTokens: number
  avgResponseTime: string
  avgCostPerCall: string
  successRate: string
}

const CATEGORY_COLORS: Record<string, string> = {
  Remix: "bg-primary/10 text-primary border-primary/20",
  "Post Type": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Carousel: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Foundation: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Other: "bg-muted text-muted-foreground",
}

export function PromptTable({ prompts }: { prompts: PromptStat[] }) {
  const [showUnused, setShowUnused] = useState(false)

  const active = prompts.filter((p) => p.calls > 0)
  const unused = prompts.filter((p) => p.calls === 0)

  return (
    <Card className="group/card relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/3 transition-all duration-300 card-glow">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/3 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 pointer-events-none" />
      <CardHeader className="relative">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
            <BrainCircuitIcon className="size-5 text-primary" />
          </div>
          <div>
            <CardTitle>Prompt Performance</CardTitle>
            <CardDescription>
              {active.length} active of {prompts.length} total prompts
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prompt</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Calls</TableHead>
                <TableHead className="text-right">Avg In</TableHead>
                <TableHead className="text-right">Avg Out</TableHead>
                <TableHead className="text-right">Avg Time</TableHead>
                <TableHead className="text-right">Cost/Call</TableHead>
                <TableHead className="text-right">Success</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Active prompts — always visible */}
              {active.map((p) => (
                <TableRow key={p.type} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <span className="text-sm font-medium">{p.name}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[p.category] || ""}`}>
                      {p.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{p.calls}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.avgInputTokens.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.avgOutputTokens.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.avgResponseTime}</TableCell>
                  <TableCell className="text-right tabular-nums font-mono text-xs">{p.avgCostPerCall}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.successRate}</TableCell>
                </TableRow>
              ))}

              {/* Unused prompts — toggle controlled */}
              {showUnused && unused.map((p) => (
                <TableRow key={p.type} className="hover:bg-muted/30 transition-colors opacity-40">
                  <TableCell>
                    <span className="text-sm">{p.name}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[p.category] || ""}`}>
                      {p.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">0</TableCell>
                  <TableCell className="text-right tabular-nums">-</TableCell>
                  <TableCell className="text-right tabular-nums">-</TableCell>
                  <TableCell className="text-right tabular-nums">-</TableCell>
                  <TableCell className="text-right tabular-nums">-</TableCell>
                  <TableCell className="text-right tabular-nums">-</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Toggle button */}
        {unused.length > 0 && (
          <div className="flex justify-center pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUnused(!showUnused)}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {showUnused ? (
                <>
                  <ChevronUpIcon className="size-3.5" />
                  Hide {unused.length} unused prompts
                </>
              ) : (
                <>
                  <ChevronDownIcon className="size-3.5" />
                  Show {unused.length} unused prompts
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
