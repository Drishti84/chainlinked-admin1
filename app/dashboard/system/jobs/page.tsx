import { supabaseAdmin } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { AlertCircleIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react"
import { JobsTabs } from "./jobs-tabs"

const RUNNING_STATUSES = ["pending", "scraping", "researching", "analyzing"]

function statusColor(status: string) {
  if (status === "completed") return "bg-green-500"
  if (status === "failed") return "bg-red-500"
  return "bg-yellow-500"
}

function statusBadgeClass(status: string) {
  if (status === "completed") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
  if (status === "failed") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
  return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
}

function countByStatus(jobs: { status: string }[]) {
  return {
    completed: jobs.filter((j) => j.status === "completed").length,
    running: jobs.filter((j) => RUNNING_STATUSES.includes(j.status)).length,
    failed: jobs.filter((j) => j.status === "failed").length,
  }
}

async function getJobs() {
  const [companyRes, researchRes, suggestionRes, profilesRes] = await Promise.all([
    supabaseAdmin.from("company_context").select("id, company_name, status, error_message, created_at, completed_at, user_id").order("created_at", { ascending: false }),
    supabaseAdmin.from("research_sessions").select("id, topics, status, posts_discovered, posts_generated, error_message, created_at, completed_at, user_id").order("created_at", { ascending: false }),
    supabaseAdmin.from("suggestion_generation_runs").select("id, status, suggestions_requested, suggestions_generated, error_message, created_at, completed_at, user_id").order("created_at", { ascending: false }),
    supabaseAdmin.from("profiles").select("id, full_name, email"),
  ])

  const company = companyRes.data ?? []
  const research = researchRes.data ?? []
  const suggestions = suggestionRes.data ?? []

  const names = new Map<string, string>()
  profilesRes.data?.forEach((p) => names.set(p.id, p.full_name || p.email || p.id.slice(0, 8)))

  const all = [...company, ...research, ...suggestions]
  const running = all.filter((j) => RUNNING_STATUSES.includes(j.status)).length
  const completed = all.filter((j) => j.status === "completed").length
  const failed = all.filter((j) => j.status === "failed").length
  const total = all.length

  return { company, research, suggestions, names, running, completed, failed, total }
}

export default async function JobsPage() {
  const { company, research, suggestions, names, running, completed, failed, total } = await getJobs()

  const cs = countByStatus(company)
  const rs = countByStatus(research)
  const ss = countByStatus(suggestions)

  const runPct = total > 0 ? Math.round((running / total) * 100) : 0
  const compPct = total > 0 ? Math.round((completed / total) * 100) : 0
  const failPct = total > 0 ? Math.round((failed / total) * 100) : 0

  const dateFmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

  return (
    <div className="px-4 lg:px-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Background Jobs</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Monitor background processing tasks</p>
      </div>

      {/* ── Status Cards ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {/* Running */}
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="size-2.5 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-2xl font-bold tabular-nums">{running}</span>
          </div>
          <p className="text-sm font-medium">Running</p>
          <p className="text-xs text-muted-foreground tabular-nums mt-0.5">{runPct}% of {total}</p>
        </div>
        {/* Completed */}
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle2Icon className="size-4 text-green-500" />
            <span className="text-2xl font-bold tabular-nums">{completed}</span>
          </div>
          <p className="text-sm font-medium">Completed</p>
          <p className="text-xs text-muted-foreground tabular-nums mt-0.5">{compPct}% of {total}</p>
        </div>
        {/* Failed */}
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <XCircleIcon className="size-4 text-red-500" />
            <span className="text-2xl font-bold tabular-nums">{failed}</span>
          </div>
          <p className="text-sm font-medium">Failed</p>
          <p className="text-xs text-muted-foreground tabular-nums mt-0.5">{failPct}% of {total}</p>
        </div>
      </div>

      {/* ── Icon Card Tabs + Content ── */}
      <JobsTabs
        tabs={{
          company: company.length, companyC: cs.completed, companyR: cs.running, companyF: cs.failed,
          research: research.length, researchC: rs.completed, researchR: rs.running, researchF: rs.failed,
          suggest: suggestions.length, suggestC: ss.completed, suggestR: ss.running, suggestF: ss.failed,
        }}
        companyContent={
          company.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No company analysis jobs</p>
          ) : (
            <div className="space-y-2">
              {company.map((job) => (
                <div key={job.id} className="rounded-xl border bg-card overflow-hidden hover:border-primary/20 transition-colors">
                  <div className="flex items-center gap-4 p-4">
                    {/* Company avatar initial */}
                    <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary text-lg font-bold shrink-0">
                      {(job.company_name || "?").charAt(0).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{job.company_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{names.get(job.user_id) ?? "-"}</p>
                      <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                        {dateFmt(job.created_at)}
                        {job.completed_at && <> → {dateFmt(job.completed_at)}</>}
                      </p>
                    </div>
                    {/* Status tag on the right */}
                    <Badge variant="outline" className={`text-xs px-2.5 py-1 shrink-0 ${statusBadgeClass(job.status)}`}>
                      {job.status}
                    </Badge>
                  </div>
                  {job.error_message && (
                    <div className="flex items-start gap-1.5 border-t bg-red-50 dark:bg-red-950/30 px-4 py-2.5 text-xs text-red-700 dark:text-red-400">
                      <AlertCircleIcon className="size-3.5 shrink-0 mt-0.5" />
                      <span>{job.error_message}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        }
        researchContent={
          research.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No research sessions</p>
          ) : (
            <div className="space-y-2">
              {research.map((job) => (
                <div key={job.id} className="rounded-xl border bg-card p-4 hover:border-primary/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`size-3 rounded-full mt-1 shrink-0 ${statusColor(job.status)}`} />
                      <div>
                        <p className="text-sm font-semibold">{Array.isArray(job.topics) ? job.topics.join(", ") : "No topics"}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{names.get(job.user_id) ?? "-"}</span>
                          <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${statusBadgeClass(job.status)}`}>{job.status}</Badge>
                          <span className="tabular-nums">{job.posts_discovered ?? 0} discovered</span>
                          <span className="tabular-nums">{job.posts_generated ?? 0} generated</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground tabular-nums shrink-0">
                      <p>{dateFmt(job.created_at)}</p>
                      {job.completed_at && <p className="mt-0.5">&rarr; {dateFmt(job.completed_at)}</p>}
                    </div>
                  </div>
                  {job.error_message && (
                    <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2 text-xs text-red-700 dark:text-red-400">
                      <AlertCircleIcon className="size-3.5 shrink-0 mt-0.5" />
                      <span>{job.error_message}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        }
        suggestContent={
          suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No suggestion runs</p>
          ) : (
            <div className="space-y-2">
              {suggestions.map((job) => {
                const requested = job.suggestions_requested ?? 0
                const generated = job.suggestions_generated ?? 0
                const pct = requested > 0 ? Math.round((generated / requested) * 100) : 0
                return (
                  <div key={job.id} className="rounded-xl border bg-card p-4 hover:border-primary/20 transition-colors">
                    {/* Top: user + status */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{names.get(job.user_id) ?? "-"}</span>
                        <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${statusBadgeClass(job.status)}`}>{job.status}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {dateFmt(job.created_at)}
                        {job.completed_at && <> → {dateFmt(job.completed_at)}</>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 tabular-nums">
                        {requested} requested
                      </Badge>
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 tabular-nums">
                        {generated} generated
                      </Badge>
                      <Badge variant={job.status === "completed" ? "default" : "secondary"} className="text-[10px] h-5 px-1.5 tabular-nums">
                        {pct}%
                      </Badge>
                    </div>
                    {job.error_message && (
                      <div className="mt-2 flex items-start gap-1.5 border-t pt-2 text-xs text-red-600 dark:text-red-400">
                        <AlertCircleIcon className="size-3.5 shrink-0 mt-0.5" />
                        <span>{job.error_message}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        }
      />
    </div>
  )
}
