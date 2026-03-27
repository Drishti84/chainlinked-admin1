"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  SparklesIcon,
  CalendarIcon,
  UserIcon,
  TypeIcon,
  HashIcon,
  BrainCircuitIcon,
  CoinsIcon,
  MessageSquareIcon,
  BotIcon,
  CpuIcon,
  SearchIcon,
  ArrowUpDownIcon,
  TrendingUpIcon,
  ZapIcon,
  FileTextIcon,
  XIcon,
  ClipboardIcon,
  CopyIcon,
  SendIcon,
} from "lucide-react"

interface PromptSnapshot {
  system_prompt?: string
  user_messages?: string[]
  assistant_response?: string
}

interface ConversationMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface Post {
  id: string
  user_id: string
  content: string | null
  post_type: string | null
  source: string | null
  status: string | null
  word_count: number | null
  hook: string | null
  cta: string | null
  created_at: string
  userName: string
  qualityScore: number
  qualityGrade: "low" | "medium" | "high"
  conversation_id: string | null
  prompt_snapshot: PromptSnapshot | null
  prompt_tokens: number | null
  completion_tokens: number | null
  total_tokens: number | null
  model: string | null
  estimated_cost: number | null
  qualityBreakdown: {
    wordCount: number
    hookQuality: number
    hasCta: number
    formatting: number
    hashtags: number
    lengthFit: number
  }
}

type SortKey = "date" | "quality" | "tokens" | "cost" | "words"

// Safe slice that doesn't break surrogate pairs (unicode chars above U+FFFF)
function safeSlice(str: string, maxChars: number): string {
  const chars = Array.from(str)
  if (chars.length <= maxChars) return str
  return chars.slice(0, maxChars).join("")
}

function gradeLabel(grade: string): string {
  if (grade === "high") return "High Quality"
  if (grade === "medium") return "Medium"
  return "Needs Improvement"
}

function formatCost(cost: number | null): string {
  if (cost == null) return "--"
  return `$${cost.toFixed(4)}`
}

function formatTokens(tokens: number | null): string {
  if (tokens == null) return "--"
  return tokens.toLocaleString("en-US")
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })
}

/* ── Quality Ring SVG ── */
function QualityRing({
  score,
  grade,
  size = 48,
}: {
  score: number
  grade: "low" | "medium" | "high"
  size?: number
}) {
  const radius = (size - 6) / 2
  const circumference = 2 * Math.PI * radius
  const maxScore = 100
  const progress = Math.min(score / maxScore, 1)
  const strokeDashoffset = circumference * (1 - progress)

  const gradeClasses = {
    high: "stroke-primary",
    medium: "stroke-[var(--warning)]",
    low: "stroke-destructive",
  }

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth={3}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={gradeClasses[grade]}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 0.6s var(--ease-smooth)" }}
        />
      </svg>
      <span className="absolute text-xs font-bold tabular-nums">{score}</span>
    </div>
  )
}

/* ── Stats Bar ── */
function StatsBar({ posts }: { posts: Post[] }) {
  const stats = useMemo(() => {
    const totalTokens = posts.reduce((s, p) => s + (p.total_tokens || 0), 0)
    const totalCost = posts.reduce((s, p) => s + (p.estimated_cost || 0), 0)
    const avgQuality = posts.length > 0
      ? Math.round(posts.reduce((s, p) => s + p.qualityScore, 0) / posts.length)
      : 0
    const highCount = posts.filter((p) => p.qualityGrade === "high").length
    return { totalTokens, totalCost, avgQuality, highCount }
  }, [posts])

  const items = [
    { label: "Posts", value: posts.length.toLocaleString("en-US"), icon: FileTextIcon },
    { label: "Avg Quality", value: `${stats.avgQuality}`, icon: TrendingUpIcon },
    { label: "High Quality", value: `${stats.highCount}`, icon: SparklesIcon },
    { label: "Tokens Used", value: stats.totalTokens.toLocaleString("en-US"), icon: ZapIcon },
    { label: "Total Cost", value: `$${stats.totalCost.toFixed(2)}`, icon: CoinsIcon },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="group flex items-center gap-3 rounded-xl border bg-card p-3 hover-lift"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8">
            <item.icon className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold tabular-nums leading-tight">{item.value}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Sidebar Filters ── */
function FilterSidebar({
  posts,
  gradeFilters,
  setGradeFilters,
  typeFilters,
  setTypeFilters,
  sourceFilters,
  setSourceFilters,
  statusFilters,
  setStatusFilters,
  onClearAll,
}: {
  posts: Post[]
  gradeFilters: Set<string>
  setGradeFilters: (v: Set<string>) => void
  typeFilters: Set<string>
  setTypeFilters: (v: Set<string>) => void
  sourceFilters: Set<string>
  setSourceFilters: (v: Set<string>) => void
  statusFilters: Set<string>
  setStatusFilters: (v: Set<string>) => void
  onClearAll: () => void
}) {
  // Derive unique values from posts
  const { types, sources, statuses, gradeCounts, typeCounts, sourceCounts, statusCounts } = useMemo(() => {
    const types = new Set<string>()
    const sources = new Set<string>()
    const statuses = new Set<string>()
    const gradeCounts: Record<string, number> = { high: 0, medium: 0, low: 0 }
    const typeCounts: Record<string, number> = {}
    const sourceCounts: Record<string, number> = {}
    const statusCounts: Record<string, number> = {}

    for (const p of posts) {
      const t = p.post_type || "general"
      const s = p.source || "direct"
      const st = p.status || "draft"
      types.add(t)
      sources.add(s)
      statuses.add(st)
      gradeCounts[p.qualityGrade] = (gradeCounts[p.qualityGrade] || 0) + 1
      typeCounts[t] = (typeCounts[t] || 0) + 1
      sourceCounts[s] = (sourceCounts[s] || 0) + 1
      statusCounts[st] = (statusCounts[st] || 0) + 1
    }
    return {
      types: Array.from(types).sort(),
      sources: Array.from(sources).sort(),
      statuses: Array.from(statuses).sort(),
      gradeCounts,
      typeCounts,
      sourceCounts,
      statusCounts,
    }
  }, [posts])

  const hasFilters = gradeFilters.size > 0 || typeFilters.size > 0 || sourceFilters.size > 0 || statusFilters.size > 0

  function toggleSet(set: Set<string>, value: string): Set<string> {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }

  return (
    <div className="space-y-5">
      {/* Quality Grade */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
          Quality Grade
        </h4>
        <div className="space-y-2">
          {(["high", "medium", "low"] as const).map((grade) => (
            <label key={grade} className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox
                checked={gradeFilters.has(grade)}
                onCheckedChange={() => setGradeFilters(toggleSet(gradeFilters, grade))}
              />
              <span className="text-sm capitalize group-hover:text-foreground transition-colors">{grade}</span>
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">{gradeCounts[grade] || 0}</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Post Type */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
          Post Type
        </h4>
        <div className="space-y-2">
          {types.map((type) => (
            <label key={type} className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox
                checked={typeFilters.has(type)}
                onCheckedChange={() => setTypeFilters(toggleSet(typeFilters, type))}
              />
              <span className="text-sm capitalize group-hover:text-foreground transition-colors">{type}</span>
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">{typeCounts[type] || 0}</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Source */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
          Source
        </h4>
        <div className="space-y-2">
          {sources.map((source) => (
            <label key={source} className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox
                checked={sourceFilters.has(source)}
                onCheckedChange={() => setSourceFilters(toggleSet(sourceFilters, source))}
              />
              <span className="text-sm capitalize group-hover:text-foreground transition-colors">{source}</span>
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">{sourceCounts[source] || 0}</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Status */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
          Status
        </h4>
        <div className="space-y-2">
          {statuses.map((status) => (
            <label key={status} className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox
                checked={statusFilters.has(status)}
                onCheckedChange={() => setStatusFilters(toggleSet(statusFilters, status))}
              />
              <span className="text-sm capitalize group-hover:text-foreground transition-colors">{status}</span>
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">{statusCounts[status] || 0}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Clear all */}
      {hasFilters && (
        <>
          <Separator />
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="w-full h-8 text-xs text-muted-foreground"
          >
            <XIcon className="size-3 mr-1" />
            Clear all filters
          </Button>
        </>
      )}
    </div>
  )
}

/* ── Client-only text to avoid hydration mismatch on unicode content ── */
function ClientText({ children, className }: { children: string; className?: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return <span className={className}>&nbsp;</span>
  return <span className={className}>{children}</span>
}

/* ── Main PostList ── */
export function PostList({ posts }: { posts: Post[] }) {
  const [selected, setSelected] = useState<Post | null>(null)
  const [conversationMessages, setConversationMessages] = useState<
    ConversationMessage[] | null
  >(null)
  const [loadingConversation, setLoadingConversation] = useState(false)

  // Filter/sort state
  const [search, setSearch] = useState("")
  const [gradeFilters, setGradeFilters] = useState<Set<string>>(new Set())
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set())
  const [sourceFilters, setSourceFilters] = useState<Set<string>>(new Set())
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>("date")

  // Filtered and sorted posts
  const filteredPosts = useMemo(() => {
    let result = [...posts]

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.content?.toLowerCase().includes(q) ||
          p.userName.toLowerCase().includes(q) ||
          p.post_type?.toLowerCase().includes(q) ||
          p.model?.toLowerCase().includes(q)
      )
    }

    // Checkbox filters
    if (gradeFilters.size > 0) {
      result = result.filter((p) => gradeFilters.has(p.qualityGrade))
    }
    if (typeFilters.size > 0) {
      result = result.filter((p) => typeFilters.has(p.post_type || "general"))
    }
    if (sourceFilters.size > 0) {
      result = result.filter((p) => sourceFilters.has(p.source || "direct"))
    }
    if (statusFilters.size > 0) {
      result = result.filter((p) => statusFilters.has(p.status || "draft"))
    }

    // Sort
    result.sort((a, b) => {
      switch (sortKey) {
        case "quality":
          return b.qualityScore - a.qualityScore
        case "tokens":
          return (b.total_tokens || 0) - (a.total_tokens || 0)
        case "cost":
          return (b.estimated_cost || 0) - (a.estimated_cost || 0)
        case "words":
          return (b.word_count || 0) - (a.word_count || 0)
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    return result
  }, [posts, search, gradeFilters, typeFilters, sourceFilters, statusFilters, sortKey])

  // Fetch conversation
  useEffect(() => {
    if (!selected?.conversation_id) {
      setConversationMessages(null)
      return
    }

    let cancelled = false
    setLoadingConversation(true)

    fetch(`/api/admin/conversations/${selected.conversation_id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.messages) {
          setConversationMessages(data.messages)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingConversation(false)
      })

    return () => {
      cancelled = true
    }
  }, [selected?.conversation_id])

  function clearAllFilters() {
    setSearch("")
    setGradeFilters(new Set())
    setTypeFilters(new Set())
    setSourceFilters(new Set())
    setStatusFilters(new Set())
    setSortKey("date")
  }

  return (
    <div className="space-y-5">
      {/* Stats Summary */}
      <StatsBar posts={posts} />

      {/* Search + Sort bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search posts, users, models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <XIcon className="size-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-9 w-[150px] gap-1.5">
              <ArrowUpDownIcon className="size-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Newest First</SelectItem>
              <SelectItem value="quality">Quality Score</SelectItem>
              <SelectItem value="tokens">Token Usage</SelectItem>
              <SelectItem value="cost">Cost</SelectItem>
              <SelectItem value="words">Word Count</SelectItem>
            </SelectContent>
          </Select>

          {filteredPosts.length !== posts.length && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {filteredPosts.length} of {posts.length}
            </span>
          )}
        </div>
      </div>

      {/* Main content: sidebar filters + masonry grid */}
      <div className="flex gap-6">
        {/* Always-visible filter sidebar */}
        <aside className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-4 rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-4">Filters</h3>
            <FilterSidebar
              posts={posts}
              gradeFilters={gradeFilters}
              setGradeFilters={setGradeFilters}
              typeFilters={typeFilters}
              setTypeFilters={setTypeFilters}
              sourceFilters={sourceFilters}
              setSourceFilters={setSourceFilters}
              statusFilters={statusFilters}
              setStatusFilters={setStatusFilters}
              onClearAll={clearAllFilters}
            />
          </div>
        </aside>

        {/* Masonry grid */}
        <div className="flex-1 min-w-0">
          {filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <SearchIcon className="size-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No posts match your filters</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 xl:columns-3 gap-3 [column-fill:_balance]">
              {filteredPosts.map((post, index) => (
                <Card
                  key={post.id}
                  className="group mb-3 break-inside-avoid cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20 animate-slide-up"
                  style={{ animationDelay: `${Math.min(index * 25, 250)}ms`, animationFillMode: "both" }}
                  onClick={() => setSelected(post)}
                >
                  <CardContent className="flex flex-col gap-3 p-4">
                    {/* Top: quality ring + user + date */}
                    <div className="flex items-center gap-3">
                      <QualityRing score={post.qualityScore} grade={post.qualityGrade} size={40} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{post.userName}</p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          {formatFullDate(post.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Content preview — client-only to avoid unicode hydration mismatch */}
                    <p className="text-sm leading-relaxed line-clamp-5">
                      <ClientText>{safeSlice(post.content || "", 300) || "No content"}</ClientText>
                    </p>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                        {post.post_type || "general"}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                        {post.source || "direct"}
                      </Badge>
                      {post.status && post.status !== "draft" && (
                        <Badge
                          variant={post.status === "posted" ? "default" : "outline"}
                          className="text-[10px] px-1.5 py-0 h-5"
                        >
                          {post.status}
                        </Badge>
                      )}
                      {post.model && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-mono">
                          <CpuIcon className="mr-0.5 size-2.5" />
                          {post.model.replace(/^openai\//, "")}
                        </Badge>
                      )}
                    </div>

                    {/* Footer stats */}
                    <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                      <span>{post.word_count || 0} words</span>
                      <div className="flex items-center gap-2.5">
                        {post.total_tokens != null && (
                          <span className="tabular-nums">{post.total_tokens.toLocaleString("en-US")} tok</span>
                        )}
                        {post.estimated_cost != null && (
                          <span className="font-medium tabular-nums">{formatCost(post.estimated_cost)}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Sheet — 40% width ── */}
      <Sheet
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent className="!w-full sm:!w-[40vw] sm:!max-w-[40vw] overflow-y-auto p-0">
          {selected && (
            <>
              {/* ── Clean header: score + grade only ── */}
              <SheetHeader className="px-5 pt-5 pb-3 border-b">
                <SheetTitle className="flex items-center gap-2.5">
                  <QualityRing score={selected.qualityScore} grade={selected.qualityGrade} size={32} />
                  <div>
                    <span className="text-sm font-semibold tabular-nums">
                      {selected.qualityScore}/100
                    </span>
                    <Badge
                      variant={
                        selected.qualityGrade === "high"
                          ? "default"
                          : selected.qualityGrade === "medium"
                          ? "secondary"
                          : "destructive"
                      }
                      className="text-[10px] px-1.5 py-0 ml-2"
                    >
                      {selected.qualityGrade.toUpperCase()}
                    </Badge>
                  </div>
                </SheetTitle>
                <SheetDescription className="text-xs">
                  {gradeLabel(selected.qualityGrade)}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 px-5 py-4">
                {/* ── LinkedIn Preview Card ── */}
                <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                  {/* Profile header */}
                  <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                      {selected.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold leading-tight truncate">{selected.userName}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight mt-px">
                        {new Date(selected.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {" · "}
                        <span className="capitalize">{selected.post_type || "general"}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                      <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize">{selected.source || "direct"}</Badge>
                      <Badge variant={selected.status === "posted" ? "default" : "outline"} className="text-[9px] h-4 px-1 capitalize">{selected.status || "draft"}</Badge>
                    </div>
                  </div>

                  {/* Post content */}
                  <div className="px-4 py-3" suppressHydrationWarning>
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed" suppressHydrationWarning>
                      <ClientText>{selected.content || "No content available"}</ClientText>
                    </p>
                  </div>

                  {/* Right-aligned meta line */}
                  <div className="px-4 pb-2">
                    <p className="text-[11px] text-muted-foreground text-right tabular-nums">
                      {selected.word_count || 0} words · {(selected.content || "").length.toLocaleString("en-US")} chars
                      {(selected.content?.match(/#\w+/g) || []).length > 0 && (
                        <> · {(selected.content?.match(/#\w+/g) || []).length} tags</>
                      )}
                    </p>
                  </div>

                  {/* Action bar inside card */}
                  <div className="flex items-center border-t divide-x">
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigator.clipboard.writeText(selected?.content || "")
                        toast.success("Post copied")
                      }}
                    >
                      <CopyIcon className="size-3" />
                      Copy
                    </button>
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        const text = `Author: ${selected?.userName}\nType: ${selected?.post_type || "general"}\nScore: ${selected?.qualityScore}/100\n\n${selected?.content || ""}`
                        navigator.clipboard.writeText(text)
                        toast.success("Copied with metadata")
                      }}
                    >
                      <ClipboardIcon className="size-3" />
                      Copy All
                    </button>
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        const blob = new Blob([selected?.content || ""], { type: "text/plain" })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = `post-${selected?.id.slice(0, 8)}.txt`
                        a.click()
                        URL.revokeObjectURL(url)
                        toast.success("Exported")
                      }}
                    >
                      <SendIcon className="size-3" />
                      Export
                    </button>
                  </div>
                </div>

                {/* Hook & CTA — full width, overflow fixed */}
                {(selected.hook || selected.cta) && (
                  <div className="space-y-2">
                    {selected.hook && (
                      <div className="rounded-lg bg-primary/5 px-3 py-2.5 border border-primary/10 overflow-hidden">
                        <p className="text-[10px] font-medium text-primary/60 uppercase tracking-wider mb-1">Hook</p>
                        <p className="text-xs leading-relaxed break-words overflow-wrap-anywhere whitespace-pre-wrap">{selected.hook}</p>
                      </div>
                    )}
                    {selected.cta && (
                      <div className="rounded-lg bg-secondary/10 px-3 py-2.5 border border-secondary/10 overflow-hidden">
                        <p className="text-[10px] font-medium text-secondary-foreground/60 uppercase tracking-wider mb-1">Call to Action</p>
                        <p className="text-xs leading-relaxed break-words overflow-wrap-anywhere whitespace-pre-wrap">{selected.cta}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Quality Breakdown — inline badges */}
                {selected.qualityBreakdown && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <SparklesIcon className="size-3" />
                        Quality Breakdown
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: "Words", score: selected.qualityBreakdown.wordCount, max: 25 },
                          { label: "Hook", score: selected.qualityBreakdown.hookQuality, max: 20 },
                          { label: "CTA", score: selected.qualityBreakdown.hasCta, max: 15 },
                          { label: "Format", score: selected.qualityBreakdown.formatting, max: 15 },
                          { label: "Tags", score: selected.qualityBreakdown.hashtags, max: 10 },
                          { label: "Length", score: selected.qualityBreakdown.lengthFit, max: 15 },
                        ].map((item) => {
                          const pct = item.max > 0 ? item.score / item.max : 0
                          const variant = pct >= 0.8 ? "default" : pct >= 0.4 ? "secondary" : "destructive"
                          return (
                            <Badge key={item.label} variant={variant} className="text-[10px] px-2 py-0.5 tabular-nums gap-1">
                              {item.label} <span className="font-semibold">{item.score}</span>
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* AI Generation Details */}
                {(selected.model || selected.estimated_cost != null || selected.total_tokens != null) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="mb-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <BrainCircuitIcon className="size-3" />
                        AI Details
                      </h3>
                      <div className="grid grid-cols-2 gap-1.5">
                        {selected.model && (
                          <div className="rounded-md border bg-card px-2.5 py-2">
                            <p className="text-[10px] text-muted-foreground">Model</p>
                            <p className="text-[11px] font-medium font-mono mt-px truncate">
                              {selected.model.replace(/^openai\//, "")}
                            </p>
                          </div>
                        )}
                        {selected.estimated_cost != null && (
                          <div className="rounded-md border bg-card px-2.5 py-2">
                            <p className="text-[10px] text-muted-foreground">Cost</p>
                            <p className="text-[11px] font-semibold text-primary tabular-nums mt-px">
                              {formatCost(selected.estimated_cost)}
                            </p>
                          </div>
                        )}
                      </div>

                      {selected.total_tokens != null && (
                        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                          {[
                            { label: "Prompt", value: selected.prompt_tokens },
                            { label: "Completion", value: selected.completion_tokens },
                            { label: "Total", value: selected.total_tokens },
                          ].map((tok) => (
                            <div key={tok.label} className="rounded-md border bg-card px-2 py-1.5 text-center">
                              <p className="text-[10px] text-muted-foreground">{tok.label}</p>
                              <p className="text-xs font-semibold tabular-nums">{formatTokens(tok.value)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Prompt Snapshot — chat bubbles */}
                {selected.prompt_snapshot && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="mb-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <MessageSquareIcon className="size-3" />
                        Prompt Snapshot
                      </h3>
                      <div className="space-y-2.5">
                        {selected.prompt_snapshot.system_prompt && (
                          <div className="rounded-lg bg-muted/50 border border-muted p-3">
                            <p className="mb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">System</p>
                            <p className="whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed">
                              {selected.prompt_snapshot.system_prompt}
                            </p>
                          </div>
                        )}
                        {selected.prompt_snapshot.user_messages?.map((msg, i) => (
                          <div key={`user-${i}`} className="flex justify-end">
                            <div className="max-w-[85%] rounded-lg bg-primary/10 border border-primary/20 p-3">
                              <p className="mb-1 text-[10px] font-medium text-primary/70 uppercase tracking-wider">User</p>
                              <p className="whitespace-pre-wrap text-xs leading-relaxed">{msg}</p>
                            </div>
                          </div>
                        ))}
                        {selected.prompt_snapshot.assistant_response && (
                          <div className="flex justify-start">
                            <div className="max-w-[85%] rounded-lg bg-secondary/30 border border-secondary/20 p-3">
                              <p className="mb-1 text-[10px] font-medium text-secondary-foreground/70 uppercase tracking-wider flex items-center gap-1">
                                <BotIcon className="size-3" />
                                Assistant
                              </p>
                              <p className="whitespace-pre-wrap text-xs leading-relaxed">
                                {selected.prompt_snapshot.assistant_response}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Full conversation — chat bubbles */}
                {selected.conversation_id && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="mb-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <MessageSquareIcon className="size-3" />
                        Full Conversation
                      </h3>

                      {loadingConversation ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                          <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                          Loading conversation...
                        </div>
                      ) : conversationMessages ? (
                        <div className="space-y-2.5">
                          {conversationMessages.map((msg, i) => {
                            if (msg.role === "system") {
                              return (
                                <div key={i} className="rounded-lg bg-muted/50 border border-muted p-3">
                                  <p className="mb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">System</p>
                                  <p className="whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed">{msg.content}</p>
                                </div>
                              )
                            }
                            if (msg.role === "user") {
                              return (
                                <div key={i} className="flex justify-end">
                                  <div className="max-w-[85%] rounded-lg bg-primary/10 border border-primary/20 p-3">
                                    <p className="mb-1 text-[10px] font-medium text-primary/70 uppercase tracking-wider">User</p>
                                    <p className="whitespace-pre-wrap text-xs leading-relaxed">{msg.content}</p>
                                  </div>
                                </div>
                              )
                            }
                            return (
                              <div key={i} className="flex justify-start">
                                <div className="max-w-[85%] rounded-lg bg-secondary/30 border border-secondary/20 p-3">
                                  <p className="mb-1 text-[10px] font-medium text-secondary-foreground/70 uppercase tracking-wider flex items-center gap-1">
                                    <BotIcon className="size-3" />
                                    Assistant
                                  </p>
                                  <p className="whitespace-pre-wrap text-xs leading-relaxed">{msg.content}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground py-2">
                          Could not load conversation data.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
