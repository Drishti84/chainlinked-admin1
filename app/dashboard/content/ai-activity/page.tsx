import { supabaseAdmin } from "@/lib/supabase/client"
import { scoreContent, gradeColor } from "@/lib/quality-score"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import {
  BotIcon,
  ExternalLinkIcon,
  ArrowRightIcon,
  UserIcon,
} from "lucide-react"
import { ActivityTabs } from "./activity-tabs"

/* ── helpers ── */

type NameMap = Map<string, string>

function getUserName(userId: string | null, names: NameMap): string {
  if (!userId) return "—"
  return names.get(userId) || userId.slice(0, 8)
}

function shortModel(model: string | null): string {
  if (!model) return "—"
  return model.replace(/^openai\//, "")
}

function formatMs(ms: number | null): string {
  if (ms == null) return "—"
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatCost(cost: number | null | undefined): string {
  if (cost == null) return "—"
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(2)}`
}

function metadataSummary(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object") return ""
  const m = metadata as Record<string, unknown>
  const parts: string[] = []
  if (m.topic) parts.push(String(m.topic))
  if (m.tone) parts.push(String(m.tone))
  if (m.length) parts.push(String(m.length))
  return parts.length > 0 ? parts.join(" / ") : ""
}

function safeSlice(str: string, max: number): string {
  const chars = Array.from(str)
  if (chars.length <= max) return str
  return chars.slice(0, max).join("")
}

/* ── page ── */

export default async function AIActivityPage() {
  const [logsRes, convsRes, postsRes, profilesRes, linkedPostsRes] = await Promise.all([
    supabaseAdmin
      .from("prompt_usage_logs")
      .select("id, user_id, prompt_type, feature, model, input_tokens, output_tokens, total_tokens, estimated_cost, response_time_ms, success, error_message, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabaseAdmin
      .from("compose_conversations")
      .select("id, user_id, title, mode, tone, messages, is_active, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("generated_posts")
      .select("id, user_id, content, post_type, source, word_count, hook, cta, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabaseAdmin.from("profiles").select("id, full_name, email"),
    supabaseAdmin
      .from("generated_posts")
      .select("id, conversation_id, content")
      .not("conversation_id", "is", null),
  ])

  const logs = logsRes.data ?? []
  const conversations = convsRes.data ?? []
  const posts = postsRes.data ?? []
  const linkedPosts = linkedPostsRes.data ?? []

  const postsByConversation = new Map<string, { id: string; content: string | null }>()
  for (const post of linkedPosts) {
    if (post.conversation_id) {
      postsByConversation.set(post.conversation_id, { id: post.id, content: post.content })
    }
  }

  const names: NameMap = new Map()
  profilesRes.data?.forEach((p) => {
    names.set(p.id, p.full_name || p.email || p.id.slice(0, 8))
  })

  // Stats
  const totalCost = logs.reduce((s, l) => s + (l.estimated_cost || 0), 0)
  const avgResponseTime = logs.length > 0
    ? Math.round(logs.reduce((s, l) => s + (l.response_time_ms || 0), 0) / logs.length)
    : 0
  const successCount = logs.filter((l) => l.success).length
  const successRate = logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 0
  const totalTokens = logs.reduce((s, l) => s + (l.total_tokens || 0), 0)

  // Budget cap for gauge (estimate)
  const costBudget = Math.max(totalCost * 2, 5)
  const speedMax = 2000 // 2s is "slow"
  const costPct = Math.min((totalCost / costBudget) * 100, 100)
  const speedPct = Math.min((avgResponseTime / speedMax) * 100, 100)
  const healthPct = successRate

  // Group logs by date for heatmap+list
  const logsByDate = new Map<string, typeof logs>()
  for (const log of logs) {
    const dateKey = new Date(log.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    if (!logsByDate.has(dateKey)) logsByDate.set(dateKey, [])
    logsByDate.get(dateKey)!.push(log)
  }

  // Build simple heatmap data (last 28 days)
  const heatmapDays: { date: string; count: number }[] = []
  for (let i = 27; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    const count = logsByDate.get(key)?.length ?? 0
    heatmapDays.push({ date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), count })
  }
  const maxHeatCount = Math.max(...heatmapDays.map((d) => d.count), 1)

  // Two-row output
  const midPoint = Math.ceil(posts.length / 2)
  const postsRow1 = posts.slice(0, midPoint)
  const postsRow2 = posts.slice(midPoint)

  return (
    <div className="px-4 lg:px-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">AI Activity</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Monitor AI generation requests, compose conversations, and output quality.
        </p>
      </div>

      {/* ── Radial Ring Dashboard ── */}
      <div className="rounded-xl border bg-card p-5 mb-5">
        <div className="flex items-center justify-around flex-wrap gap-6">
          {/* Cost Ring */}
          {(() => {
            const size = 100; const stroke = 6; const r = (size - stroke) / 2
            const circ = 2 * Math.PI * r; const offset = circ * (1 - Math.min(costPct / 100, 1))
            return (
              <div className="flex flex-col items-center gap-2">
                <div className="relative" style={{ width: size, height: size }}>
                  <svg width={size} height={size} className="-rotate-90">
                    <circle cx={size/2} cy={size/2} r={r} fill="none" className="stroke-muted" strokeWidth={stroke} />
                    <circle cx={size/2} cy={size/2} r={r} fill="none" className="stroke-primary" strokeWidth={stroke}
                      strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
                      style={{ transition: "stroke-dashoffset 1s ease-out" }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold tabular-nums">${totalCost.toFixed(2)}</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold">Cost</p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">{logs.length} requests</p>
                </div>
              </div>
            )
          })()}
          {/* Speed Ring */}
          {(() => {
            const size = 100; const stroke = 6; const r = (size - stroke) / 2
            const circ = 2 * Math.PI * r; const speedFill = Math.min((100 - speedPct) / 100, 1); const offset = circ * (1 - speedFill)
            const color = speedPct > 70 ? "stroke-destructive" : speedPct > 40 ? "stroke-[var(--warning)]" : "stroke-primary"
            return (
              <div className="flex flex-col items-center gap-2">
                <div className="relative" style={{ width: size, height: size }}>
                  <svg width={size} height={size} className="-rotate-90">
                    <circle cx={size/2} cy={size/2} r={r} fill="none" className="stroke-muted" strokeWidth={stroke} />
                    <circle cx={size/2} cy={size/2} r={r} fill="none" className={color} strokeWidth={stroke}
                      strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
                      style={{ transition: "stroke-dashoffset 1s ease-out" }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold tabular-nums">{formatMs(avgResponseTime)}</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold">Speed</p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">{totalTokens.toLocaleString("en-US")} tokens</p>
                </div>
              </div>
            )
          })()}
          {/* Health Ring */}
          {(() => {
            const size = 100; const stroke = 6; const r = (size - stroke) / 2
            const circ = 2 * Math.PI * r; const offset = circ * (1 - healthPct / 100)
            const color = healthPct >= 95 ? "stroke-primary" : healthPct >= 80 ? "stroke-[var(--warning)]" : "stroke-destructive"
            return (
              <div className="flex flex-col items-center gap-2">
                <div className="relative" style={{ width: size, height: size }}>
                  <svg width={size} height={size} className="-rotate-90">
                    <circle cx={size/2} cy={size/2} r={r} fill="none" className="stroke-muted" strokeWidth={stroke} />
                    <circle cx={size/2} cy={size/2} r={r} fill="none" className={color} strokeWidth={stroke}
                      strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
                      style={{ transition: "stroke-dashoffset 1s ease-out" }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold tabular-nums">{successRate}%</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold">Health</p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">{conversations.length} convos · {posts.length} posts</p>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* ── Tabbed Content with Segmented Control ── */}
      <ActivityTabs
        counts={{ requests: logs.length, conversations: conversations.length, output: posts.length }}
        requestsContent={
              logs.length === 0 ? (
                <EmptyState title="No generation requests" description="Prompt usage logs will appear here." icon={<BotIcon className="size-12" />} />
              ) : (
                <div className="space-y-4">
                  {/* Heatmap */}
                  <div className="rounded-lg border bg-card p-4">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2.5">Request Activity — Last 28 Days</p>
                    <div className="flex gap-[3px] flex-wrap">
                      {heatmapDays.map((day, i) => {
                        const intensity = day.count / maxHeatCount
                        const opacity = day.count === 0 ? 0.08 : 0.15 + intensity * 0.85
                        return (
                          <div
                            key={i}
                            className="size-6 rounded-sm transition-colors"
                            style={{ backgroundColor: `oklch(0.47 0.13 230 / ${opacity})` }}
                            title={`${day.date}: ${day.count} requests`}
                          />
                        )
                      })}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                      <span>Less</span>
                      {[0.08, 0.25, 0.5, 0.75, 1].map((o) => (
                        <div key={o} className="size-3 rounded-sm" style={{ backgroundColor: `oklch(0.47 0.13 230 / ${o})` }} />
                      ))}
                      <span>More</span>
                    </div>
                  </div>

                  {/* Date-grouped list */}
                  <div className="space-y-1">
                    {Array.from(logsByDate.entries()).map(([dateKey, dateLogs]) => (
                      <div key={dateKey}>
                        {/* Date header */}
                        <div className="flex items-center gap-2 py-2">
                          <span className="text-[11px] font-semibold text-muted-foreground">{dateKey}</span>
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-[10px] text-muted-foreground tabular-nums">{dateLogs.length} req</span>
                        </div>
                        {/* Entries */}
                        {dateLogs.map((log) => {
                          const meta = metadataSummary(log.metadata)
                          return (
                            <div key={log.id} className="flex items-center gap-3 py-2.5 px-3 hover:bg-muted/30 rounded-lg transition-colors">
                              <div className={`size-2.5 rounded-full shrink-0 ${log.success ? "bg-primary" : "bg-destructive"}`} />
                              <span className="text-sm font-medium w-24 truncate shrink-0">{getUserName(log.user_id, names)}</span>
                              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">{log.feature ?? log.prompt_type ?? "—"}</Badge>
                              <span className="text-xs font-mono text-muted-foreground shrink-0">{shortModel(log.model)}</span>
                              <div className="flex-1" />
                              <span className="text-xs text-muted-foreground tabular-nums shrink-0">{log.total_tokens?.toLocaleString("en-US") ?? "—"} tok</span>
                              <span className="text-xs text-muted-foreground tabular-nums font-mono shrink-0">{formatCost(log.estimated_cost)}</span>
                              <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-14 text-right">{formatMs(log.response_time_ms)}</span>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )
        }
        conversationsContent={
              conversations.length === 0 ? (
                <EmptyState title="No conversations" description="Compose conversations will appear here." icon={<BotIcon className="size-12" />} />
              ) : (
                <div className="rounded-lg border bg-card overflow-hidden divide-y">
                  {conversations.map((conv) => {
                    const messages = (conv.messages ?? []) as Array<{
                      id: string; role: string; parts: Array<{ text: string; type: string }>
                    }>
                    const linkedPost = postsByConversation.get(conv.id)
                    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null
                    const lastRole = lastMessage?.role ?? ""
                    const lastText = lastMessage?.parts?.map((p) => p.text).filter(Boolean).join(" ")?.slice(0, 90) ?? ""
                    const initial = getUserName(conv.user_id, names).charAt(0).toUpperCase()

                    return (
                      <div key={conv.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                        <div className="relative shrink-0 mt-0.5">
                          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                            {initial}
                          </div>
                          {conv.is_active && (
                            <div className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-green-500 border-2 border-card" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm truncate ${conv.is_active ? "font-semibold" : "font-medium"}`}>
                              {conv.title || "Untitled conversation"}
                            </span>
                            <Badge variant="secondary" className="text-[9px] h-4 px-1 shrink-0">{conv.mode ?? "—"}</Badge>
                            <span className="ml-auto text-[11px] text-muted-foreground tabular-nums shrink-0">
                              {new Date(conv.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {lastRole === "assistant" ? "🤖 " : ""}{lastText}{lastText.length >= 90 ? "..." : ""}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground/70">
                            <span>{getUserName(conv.user_id, names)}</span>
                            <span>·</span>
                            <span>{conv.tone ?? "no tone"}</span>
                            <span>·</span>
                            <span className="tabular-nums">{messages.length} msg{messages.length !== 1 ? "s" : ""}</span>
                            {linkedPost && (
                              <>
                                <span>·</span>
                                <a href={`/dashboard/content/generated?post=${linkedPost.id}`} className="inline-flex items-center gap-0.5 text-primary hover:underline font-medium">
                                  View Post <ArrowRightIcon className="size-2.5" />
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
        }
        outputContent={
              posts.length === 0 ? (
                <EmptyState title="No generated output" description="Generated posts will appear here." icon={<BotIcon className="size-12" />} />
              ) : (
                <div className="space-y-3">
                  {[postsRow1, postsRow2].map((row, rowIdx) => (
                    row.length > 0 && (
                      <div key={rowIdx} className="-mx-1 px-1 overflow-x-auto scrollbar-hide">
                        <div className="flex gap-3 pb-1" style={{ minWidth: "max-content" }}>
                          {row.map((post) => {
                            const score = scoreContent(post.content ?? "")
                            const gradeClasses = {
                              high: "text-primary border-primary/30 bg-primary/5",
                              medium: "text-[var(--warning)] border-[var(--warning)]/30 bg-[var(--warning)]/5",
                              low: "text-destructive border-destructive/30 bg-destructive/5",
                            }
                            return (
                              <div key={post.id} className="w-[250px] shrink-0 rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/20">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <div className={`flex items-center justify-center size-9 rounded-lg border text-xs font-bold tabular-nums ${gradeClasses[score.grade]}`}>
                                    {score.total}
                                  </div>
                                  <Badge variant={gradeColor(score.grade) as "default" | "secondary" | "destructive"} className="text-[9px] h-4 px-1">
                                    {score.grade.toUpperCase()}
                                  </Badge>
                                  <Badge variant="outline" className="text-[9px] h-4 px-1 ml-auto capitalize">{post.post_type ?? "—"}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4 mb-3 min-h-[4rem]">
                                  {safeSlice(post.content ?? "—", 90)}
                                </p>
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t">
                                  <span className="truncate max-w-[70px]">{getUserName(post.user_id, names)}</span>
                                  <span className="tabular-nums">{post.word_count ?? 0}w · {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  ))}
                  <p className="text-[10px] text-muted-foreground/50 text-center">← Scroll each row to browse all {posts.length} posts →</p>
                </div>
              )
        }
      />
    </div>
  )
}
