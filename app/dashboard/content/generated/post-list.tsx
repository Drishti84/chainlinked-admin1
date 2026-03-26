"use client"

import { useState, useEffect } from "react"
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
import { Separator } from "@/components/ui/separator"
import {
  EyeIcon,
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
  return tokens.toLocaleString()
}

const PAGE_SIZE = 20

export function PostList({ posts }: { posts: Post[] }) {
  const [selected, setSelected] = useState<Post | null>(null)
  const [conversationMessages, setConversationMessages] = useState<
    ConversationMessage[] | null
  >(null)
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [page, setPage] = useState(1)

  const totalPages = Math.ceil(posts.length / PAGE_SIZE)
  const paginatedPosts = posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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

  return (
    <>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, posts.length)} of {posts.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      <div className="grid gap-3">
        {paginatedPosts.map((post) => (
          <Card
            key={post.id}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => setSelected(post)}
          >
            <CardContent className="flex items-start gap-4 pt-4 pb-4">
              {/* Quality indicator */}
              <div className="flex flex-col items-center gap-1 pt-0.5">
                <div
                  className={`flex size-10 items-center justify-center rounded-lg text-sm font-bold ${
                    post.qualityGrade === "high"
                      ? "bg-primary/10 text-primary"
                      : post.qualityGrade === "medium"
                      ? "bg-secondary/20 text-secondary-foreground"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {post.qualityScore}
                </div>
              </div>

              {/* Content preview */}
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed line-clamp-3">
                  {post.content?.slice(0, 200) || "No content"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {post.post_type || "general"}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {post.source || "direct"}
                  </Badge>
                  <Badge
                    variant={
                      post.status === "posted" ? "default" : "outline"
                    }
                    className="text-xs"
                  >
                    {post.status || "draft"}
                  </Badge>
                  {post.model && (
                    <Badge variant="outline" className="text-xs">
                      <CpuIcon className="mr-1 size-2.5" />
                      {post.model}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {post.word_count || 0} words
                  </span>
                  {post.total_tokens != null && (
                    <span className="text-xs text-muted-foreground">
                      {post.total_tokens.toLocaleString()} tokens
                    </span>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                <span className="text-xs font-medium">{post.userName}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(post.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                {post.estimated_cost != null && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatCost(post.estimated_cost)}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 text-xs"
                >
                  <EyeIcon className="mr-1 size-3" />
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }) }}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }) }}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Full post viewer sheet */}
      <Sheet
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
          {selected && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4">
                <SheetTitle className="flex items-center gap-2">
                  <SparklesIcon className="size-4" />
                  Generated Post
                </SheetTitle>
                <SheetDescription>
                  Full content, AI context, and metadata
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 px-6 pb-6">
                {/* Quality score */}
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-12 items-center justify-center rounded-xl text-lg font-bold ${
                      selected.qualityGrade === "high"
                        ? "bg-primary/10 text-primary"
                        : selected.qualityGrade === "medium"
                        ? "bg-secondary/20 text-secondary-foreground"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {selected.qualityScore}
                  </div>
                  <div>
                    <p className="font-medium">
                      Quality Score: {selected.qualityScore}/100
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {gradeLabel(selected.qualityGrade)}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <UserIcon className="size-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Author:</span>
                    <span className="font-medium">{selected.userName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TypeIcon className="size-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Type:</span>
                    <Badge variant="outline" className="text-xs">
                      {selected.post_type || "general"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <SparklesIcon className="size-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Source:</span>
                    <Badge variant="secondary" className="text-xs">
                      {selected.source || "direct"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarIcon className="size-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">
                      {new Date(selected.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <HashIcon className="size-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Words:</span>
                    <span className="font-medium">
                      {selected.word_count || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge
                      variant={
                        selected.status === "posted" ? "default" : "outline"
                      }
                      className="text-xs"
                    >
                      {selected.status || "draft"}
                    </Badge>
                  </div>
                </div>

                {/* Model & Cost section */}
                {(selected.model ||
                  selected.estimated_cost != null ||
                  selected.total_tokens != null) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                        <BrainCircuitIcon className="size-4 text-muted-foreground" />
                        AI Generation Details
                      </h3>
                      <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-4">
                        {selected.model && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                              Model
                            </p>
                            <p className="text-sm font-medium">
                              {selected.model}
                            </p>
                          </div>
                        )}
                        {selected.estimated_cost != null && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                              Estimated Cost
                            </p>
                            <p className="text-sm font-semibold text-primary">
                              {formatCost(selected.estimated_cost)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Token usage grid */}
                      {selected.total_tokens != null && (
                        <div className="mt-3 grid grid-cols-3 gap-3">
                          <div className="rounded-lg border bg-card p-3 text-center">
                            <p className="text-xs text-muted-foreground">
                              Prompt
                            </p>
                            <p className="text-lg font-semibold">
                              {formatTokens(selected.prompt_tokens)}
                            </p>
                          </div>
                          <div className="rounded-lg border bg-card p-3 text-center">
                            <p className="text-xs text-muted-foreground">
                              Completion
                            </p>
                            <p className="text-lg font-semibold">
                              {formatTokens(selected.completion_tokens)}
                            </p>
                          </div>
                          <div className="rounded-lg border bg-card p-3 text-center">
                            <p className="text-xs text-muted-foreground">
                              Total
                            </p>
                            <p className="text-lg font-semibold">
                              {formatTokens(selected.total_tokens)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Separator />

                {/* Full post content */}
                <div>
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                    Full Post Content
                  </h3>
                  <div className="rounded-lg border bg-card p-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {selected.content || "No content available"}
                    </p>
                  </div>
                </div>

                {/* Hook & CTA if present */}
                {(selected.hook || selected.cta) && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      {selected.hook && (
                        <div>
                          <h3 className="mb-1 text-sm font-medium text-muted-foreground">
                            Hook
                          </h3>
                          <p className="text-sm rounded-lg bg-primary/5 p-3 border border-primary/10">
                            {selected.hook}
                          </p>
                        </div>
                      )}
                      {selected.cta && (
                        <div>
                          <h3 className="mb-1 text-sm font-medium text-muted-foreground">
                            Call to Action
                          </h3>
                          <p className="text-sm rounded-lg bg-secondary/10 p-3 border border-secondary/10">
                            {selected.cta}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Conversation Thread from prompt_snapshot */}
                {selected.prompt_snapshot && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                        <MessageSquareIcon className="size-4 text-muted-foreground" />
                        Prompt Snapshot
                      </h3>
                      <div className="space-y-3">
                        {/* System prompt */}
                        {selected.prompt_snapshot.system_prompt && (
                          <div className="rounded-lg bg-muted/50 border border-muted p-3">
                            <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              System
                            </p>
                            <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                              {selected.prompt_snapshot.system_prompt}
                            </p>
                          </div>
                        )}

                        {/* User messages */}
                        {selected.prompt_snapshot.user_messages?.map(
                          (msg, i) => (
                            <div key={`user-${i}`} className="flex justify-end">
                              <div className="max-w-[85%] rounded-lg bg-primary/10 border border-primary/20 p-3">
                                <p className="mb-1 text-xs font-medium text-primary/70 uppercase tracking-wider">
                                  User
                                </p>
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                  {msg}
                                </p>
                              </div>
                            </div>
                          )
                        )}

                        {/* Assistant response */}
                        {selected.prompt_snapshot.assistant_response && (
                          <div className="flex justify-start">
                            <div className="max-w-[85%] rounded-lg bg-secondary/30 border border-secondary/20 p-3">
                              <p className="mb-1 text-xs font-medium text-secondary-foreground/70 uppercase tracking-wider flex items-center gap-1">
                                <BotIcon className="size-3" />
                                Assistant
                              </p>
                              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                {selected.prompt_snapshot.assistant_response}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Full conversation from compose_conversations */}
                {selected.conversation_id && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                        <MessageSquareIcon className="size-4 text-muted-foreground" />
                        Full Conversation
                      </h3>

                      {loadingConversation ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                          <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                          Loading conversation...
                        </div>
                      ) : conversationMessages ? (
                        <div className="space-y-3">
                          {conversationMessages.map((msg, i) => {
                            if (msg.role === "system") {
                              return (
                                <div
                                  key={i}
                                  className="rounded-lg bg-muted/50 border border-muted p-3"
                                >
                                  <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    System
                                  </p>
                                  <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                                    {msg.content}
                                  </p>
                                </div>
                              )
                            }

                            if (msg.role === "user") {
                              return (
                                <div
                                  key={i}
                                  className="flex justify-end"
                                >
                                  <div className="max-w-[85%] rounded-lg bg-primary/10 border border-primary/20 p-3">
                                    <p className="mb-1 text-xs font-medium text-primary/70 uppercase tracking-wider">
                                      User
                                    </p>
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                      {msg.content}
                                    </p>
                                  </div>
                                </div>
                              )
                            }

                            return (
                              <div
                                key={i}
                                className="flex justify-start"
                              >
                                <div className="max-w-[85%] rounded-lg bg-secondary/30 border border-secondary/20 p-3">
                                  <p className="mb-1 text-xs font-medium text-secondary-foreground/70 uppercase tracking-wider flex items-center gap-1">
                                    <BotIcon className="size-3" />
                                    Assistant
                                  </p>
                                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                    {msg.content}
                                  </p>
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
    </>
  )
}
