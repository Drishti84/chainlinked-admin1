"use client"

import { useState, useEffect, useMemo } from "react"
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
import { toast } from "sonner"
import {
  LayoutTemplateIcon,
  UserIcon,
  CalendarIcon,
  SparklesIcon,
  GlobeIcon,
  LockIcon,
  BotIcon,
  SearchIcon,
  XIcon,
  CopyIcon,
  ClipboardIcon,
  HashIcon,
  BarChart3Icon,
  FileTextIcon,
  SendIcon,
} from "lucide-react"

interface Template {
  id: string
  user_id: string
  name: string | null
  content: string | null
  category: string | null
  is_public: boolean | null
  usage_count: number | null
  is_ai_generated: boolean | null
  created_at: string
  userName: string
}

function categoryColor(category: string | null): string {
  switch (category?.toLowerCase()) {
    case "thought-leadership":
    case "thought leadership":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800"
    case "engagement":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800"
    case "promotional":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800"
    case "educational":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
    case "storytelling":
    case "story":
      return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-800"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800"
  }
}

// Safe slice for unicode
function safeSlice(str: string, max: number): string {
  const chars = Array.from(str)
  if (chars.length <= max) return str
  return chars.slice(0, max).join("")
}

// Client-only text to avoid hydration mismatch on unicode
function ClientText({ children, className }: { children: string; className?: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return <span className={className}>&nbsp;</span>
  return <span className={className}>{children}</span>
}

/* ── Stats Bar ── */
function StatsBar({ templates }: { templates: Template[] }) {
  const stats = useMemo(() => {
    const aiCount = templates.filter((t) => t.is_ai_generated).length
    const publicCount = templates.filter((t) => t.is_public).length
    const totalUsage = templates.reduce((s, t) => s + (t.usage_count || 0), 0)
    return { aiCount, publicCount, totalUsage }
  }, [templates])

  const items = [
    { label: "Templates", value: templates.length.toLocaleString("en-US"), icon: LayoutTemplateIcon },
    { label: "AI Generated", value: `${stats.aiCount}`, icon: BotIcon },
    { label: "Public", value: `${stats.publicCount}`, icon: GlobeIcon },
    { label: "Total Usage", value: stats.totalUsage.toLocaleString("en-US"), icon: BarChart3Icon },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-3 rounded-xl border bg-card p-3 hover-lift"
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

/* ── Main TemplateList ── */
export function TemplateList({ templates }: { templates: Template[] }) {
  const [selected, setSelected] = useState<Template | null>(null)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  // Derive unique categories
  const categories = useMemo(() => {
    const set = new Set<string>()
    templates.forEach((t) => { if (t.category) set.add(t.category) })
    return Array.from(set).sort()
  }, [templates])

  // Filter
  const filteredTemplates = useMemo(() => {
    let result = [...templates]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.name?.toLowerCase().includes(q) ||
          t.content?.toLowerCase().includes(q) ||
          t.userName.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q)
      )
    }

    if (categoryFilter !== "all") {
      result = result.filter((t) => t.category?.toLowerCase() === categoryFilter.toLowerCase())
    }

    return result
  }, [templates, search, categoryFilter])

  return (
    <div className="space-y-5">
      {/* Stats */}
      <StatsBar templates={templates} />

      {/* Search + Category chips */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
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

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={categoryFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter("all")}
            className="h-7 text-xs"
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(categoryFilter === cat ? "all" : cat)}
              className="h-7 text-xs capitalize"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Results count when filtering */}
      {(search || categoryFilter !== "all") && (
        <p className="text-xs text-muted-foreground">
          {filteredTemplates.length} of {templates.length} templates
        </p>
      )}

      {/* Card Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <SearchIcon className="size-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No templates match</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your search or category filter</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((template, index) => (
            <Card
              key={template.id}
              className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20 animate-slide-up overflow-hidden"
              style={{ animationDelay: `${Math.min(index * 30, 300)}ms`, animationFillMode: "both" }}
              onClick={() => setSelected(template)}
            >
              <CardContent className="flex flex-col gap-3 p-4">
                {/* Top: category badge + visibility + AI */}
                <div className="flex items-center gap-1.5">
                  {template.category && (
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${categoryColor(template.category)}`}>
                      {template.category}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-5 ${
                      template.is_public
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                        : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800"
                    }`}
                  >
                    {template.is_public ? <GlobeIcon className="size-2.5" /> : <LockIcon className="size-2.5" />}
                  </Badge>
                  {template.is_ai_generated && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800">
                      <BotIcon className="size-2.5" />
                    </Badge>
                  )}
                  <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                    {template.usage_count || 0} uses
                  </span>
                </div>

                {/* Name */}
                <h3 className="text-sm font-semibold leading-tight line-clamp-1">
                  {template.name ?? "Untitled"}
                </h3>

                {/* Content preview */}
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  <ClientText>{safeSlice(template.content || template.name || "No content", 150)}</ClientText>
                </p>

                {/* Footer: user + date */}
                <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <UserIcon className="size-3" />
                    <span className="truncate max-w-[100px]">{template.userName}</span>
                  </div>
                  <span className="tabular-nums">
                    {new Date(template.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Detail Sheet — 40% width ── */}
      <Sheet
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent className="!w-full sm:!w-[40vw] sm:!max-w-[40vw] overflow-y-auto p-0">
          {selected && (
            <>
              {/* Header */}
              <SheetHeader className="px-5 pt-5 pb-3 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <LayoutTemplateIcon className="size-4 text-muted-foreground" />
                  <span className="truncate">{selected.name ?? "Untitled Template"}</span>
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Template details and content
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 px-5 py-4">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {selected.category && (
                    <Badge variant="outline" className={categoryColor(selected.category)}>
                      {selected.category}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={
                      selected.is_public
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                        : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800"
                    }
                  >
                    {selected.is_public ? (
                      <><GlobeIcon className="mr-1 size-3" />Public</>
                    ) : (
                      <><LockIcon className="mr-1 size-3" />Private</>
                    )}
                  </Badge>
                  {selected.is_ai_generated && (
                    <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800">
                      <BotIcon className="mr-1 size-3" />
                      AI Generated
                    </Badge>
                  )}
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Creator</p>
                    <p className="text-xs font-medium mt-0.5 truncate">{selected.userName}</p>
                  </div>
                  <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Created</p>
                    <p className="text-xs font-medium mt-0.5 tabular-nums">
                      {new Date(selected.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/20 px-2.5 py-2 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Usage</p>
                    <p className="text-xs font-semibold mt-0.5 tabular-nums">{selected.usage_count ?? 0}</p>
                  </div>
                </div>

                {/* AI context */}
                {selected.is_ai_generated && (
                  <div className="rounded-lg border bg-violet-50/50 dark:bg-violet-900/10 p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <SparklesIcon className="size-3.5 text-violet-600 dark:text-violet-400" />
                      <span className="text-xs font-medium text-violet-800 dark:text-violet-300">AI-Generated Template</span>
                    </div>
                    <p className="text-[11px] text-violet-700/80 dark:text-violet-400/80 leading-relaxed">
                      Automatically generated based on user preferences and content patterns.
                    </p>
                  </div>
                )}

                <Separator />

                {/* Template content card with actions */}
                <div className="rounded-xl border bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b bg-muted/20">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Template Content</h3>
                  </div>
                  <div className="px-4 py-3">
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed break-words" suppressHydrationWarning>
                      <ClientText>{selected.content || selected.name || "No content available"}</ClientText>
                    </p>
                  </div>
                  {/* Right-aligned meta */}
                  <div className="px-4 pb-2">
                    <p className="text-[11px] text-muted-foreground text-right tabular-nums">
                      {(selected.content || "").split(/\s+/).filter(Boolean).length} words · {(selected.content || "").length.toLocaleString("en-US")} chars
                    </p>
                  </div>
                  {/* Action bar */}
                  <div className="flex items-center border-t divide-x">
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigator.clipboard.writeText(selected.content || selected.name || "")
                        toast.success("Template copied")
                      }}
                    >
                      <CopyIcon className="size-3" />
                      Copy
                    </button>
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        const text = `Template: ${selected.name || "Untitled"}\nCategory: ${selected.category || "None"}\nCreator: ${selected.userName}\n\n${selected.content || ""}`
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
                        const blob = new Blob([selected.content || ""], { type: "text/plain" })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = `template-${(selected.name || "untitled").replace(/\s+/g, "-").toLowerCase().slice(0, 30)}.txt`
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
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
