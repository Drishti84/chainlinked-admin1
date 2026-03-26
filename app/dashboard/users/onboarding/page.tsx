import { supabaseAdmin } from "@/lib/supabase/client"
import { MetricCard } from "@/components/metric-card"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  UserPlusIcon,
  CheckCircleIcon,
  LinkedinIcon,
  FileTextIcon,
  CalendarIcon,
  ActivityIcon,
  ArrowDownIcon,
  TargetIcon,
  TrendingDownIcon,
  LayersIcon,
  ClockIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

const STEP_ICONS = [
  UserPlusIcon,
  CheckCircleIcon,
  LinkedinIcon,
  FileTextIcon,
  CalendarIcon,
  ActivityIcon,
]

const STEP_ACCENTS = [
  "from-primary/12 to-primary/4 ring-primary/15",
  "from-emerald-500/12 to-emerald-500/4 ring-emerald-500/15",
  "from-blue-500/12 to-blue-500/4 ring-blue-500/15",
  "from-amber-500/12 to-amber-500/4 ring-amber-500/15",
  "from-destructive/12 to-destructive/4 ring-destructive/15",
  "from-primary/12 to-primary/4 ring-primary/15",
]

const STEP_ICON_COLORS = [
  "text-primary",
  "text-emerald-500",
  "text-blue-500",
  "text-amber-500",
  "text-destructive",
  "text-primary",
]

async function getOnboardingFunnel() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: signedUp },
    { count: onboardingComplete },
    linkedInData,
    firstPostData,
    firstScheduledData,
    activeData,
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("onboarding_completed", true),
    supabaseAdmin.from("linkedin_tokens").select("user_id"),
    supabaseAdmin.from("generated_posts").select("user_id"),
    supabaseAdmin.from("scheduled_posts").select("user_id"),
    supabaseAdmin.from("generated_posts").select("user_id").gte("created_at", weekAgo),
  ])

  const linkedInConnected = new Set(linkedInData.data?.map((r) => r.user_id)).size
  const firstPostGenerated = new Set(firstPostData.data?.map((r) => r.user_id)).size
  const firstPostScheduled = new Set(firstScheduledData.data?.map((r) => r.user_id)).size
  const active7d = new Set(activeData.data?.map((r) => r.user_id)).size

  const total = signedUp ?? 1

  return [
    { label: "Signed Up", count: signedUp ?? 0, pct: 100 },
    { label: "Onboarding Complete", count: onboardingComplete ?? 0, pct: Math.round(((onboardingComplete ?? 0) / total) * 100) },
    { label: "LinkedIn Connected", count: linkedInConnected, pct: Math.round((linkedInConnected / total) * 100) },
    { label: "First Post Generated", count: firstPostGenerated, pct: Math.round((firstPostGenerated / total) * 100) },
    { label: "First Post Scheduled", count: firstPostScheduled, pct: Math.round((firstPostScheduled / total) * 100) },
    { label: "Active (7d)", count: active7d, pct: Math.round((active7d / total) * 100) },
  ]
}

async function getOnboardingTimeline() {
  const [
    { data: recentUsers },
    linkedInData,
    postsData,
    scheduledData,
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, created_at, onboarding_completed")
      .order("created_at", { ascending: false })
      .limit(10),
    supabaseAdmin.from("linkedin_tokens").select("user_id"),
    supabaseAdmin.from("generated_posts").select("user_id"),
    supabaseAdmin.from("scheduled_posts").select("user_id"),
  ])

  const linkedInSet = new Set(linkedInData.data?.map((r) => r.user_id))
  const postsSet = new Set(postsData.data?.map((r) => r.user_id))
  const scheduledSet = new Set(scheduledData.data?.map((r) => r.user_id))

  return (recentUsers ?? []).map((user) => {
    const stepsCompleted: string[] = ["Signed Up"]
    if (user.onboarding_completed) stepsCompleted.push("Onboarded")
    if (linkedInSet.has(user.id)) stepsCompleted.push("LinkedIn")
    if (postsSet.has(user.id)) stepsCompleted.push("Generated")
    if (scheduledSet.has(user.id)) stepsCompleted.push("Scheduled")

    return {
      id: user.id,
      name: user.full_name || user.email || user.id.slice(0, 8),
      createdAt: user.created_at,
      stepsCompleted,
      totalSteps: stepsCompleted.length,
    }
  })
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return "yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default async function OnboardingFunnelPage() {
  const [steps, timeline] = await Promise.all([
    getOnboardingFunnel(),
    getOnboardingTimeline(),
  ])

  // Compute summary metrics
  const overallConversion = steps.length >= 2 ? steps[steps.length - 1].pct : 0
  const totalUsers = steps[0].count

  // Find biggest drop-off
  let biggestDropStep = ""
  let biggestDropPct = 0
  for (let i = 1; i < steps.length; i++) {
    const drop = steps[i - 1].pct - steps[i].pct
    if (drop > biggestDropPct) {
      biggestDropPct = drop
      biggestDropStep = steps[i].label
    }
  }

  // Average steps completed per user (weighted)
  const avgSteps = totalUsers > 0
    ? (steps.reduce((sum, s) => sum + s.count, 0) / totalUsers).toFixed(1)
    : "0"

  // Step-to-step conversion rates
  const conversions: { rate: number; dropped: number }[] = []
  for (let i = 1; i < steps.length; i++) {
    const prevCount = steps[i - 1].count || 1
    const rate = Math.min(100, Math.round((steps[i].count / prevCount) * 100))
    const dropped = Math.max(0, steps[i - 1].count - steps[i].count)
    conversions.push({ rate, dropped })
  }

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold">Onboarding Funnel</h1>
        <p className="text-sm text-muted-foreground">
          User progression through key activation steps
        </p>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          title="Overall Conversion"
          value={`${overallConversion}%`}
          subtitle={`${steps[steps.length - 1].count} of ${totalUsers} users reach Active (7d)`}
          icon={TargetIcon}
          accent="primary"
        />
        <MetricCard
          title="Biggest Drop-off"
          value={biggestDropPct > 0 ? `${biggestDropPct}%` : "—"}
          subtitle={biggestDropStep ? `At "${biggestDropStep}" step` : "No drop-off detected"}
          icon={TrendingDownIcon}
          accent="amber"
        />
        <MetricCard
          title="Avg Steps Completed"
          value={`${avgSteps} / ${steps.length}`}
          subtitle={`${totalUsers} total users tracked`}
          icon={LayersIcon}
          accent="emerald"
        />
      </div>

      {/* Funnel Visualization */}
      <Card className="border-border/50 bg-gradient-to-br from-card via-card to-primary/3 overflow-hidden">
        <CardHeader>
          <CardTitle>Funnel Steps</CardTitle>
          <CardDescription>
            Percentage of total users who reached each step
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-0">
            {steps.map((step, i) => {
              const Icon = STEP_ICONS[i]
              // On narrow screens the funnel effect is less dramatic to prevent text truncation
              const barWidthPct = Math.max(55, step.pct)
              const isLastStep = i === steps.length - 1

              return (
                <div key={step.label} className="w-full flex flex-col items-center">
                  {/* Funnel step */}
                  <div
                    className="w-full transition-all"
                    style={{ maxWidth: `${barWidthPct}%` }}
                  >
                    <div
                      className={`group/step relative flex items-center gap-3 rounded-lg border px-3 py-3 sm:px-4 sm:py-3.5 transition-all duration-300 hover:shadow-md ${
                        i === 0
                          ? "bg-gradient-to-r from-primary/8 via-card to-card border-primary/20 hover:border-primary/30"
                          : step.pct >= 50
                          ? "bg-gradient-to-r from-card to-card border-border/50 hover:border-primary/20"
                          : "bg-gradient-to-r from-muted/30 to-card border-border/50 hover:border-border"
                      }`}
                    >
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/step:opacity-100 pointer-events-none rounded-lg" />

                      {/* Step icon badge */}
                      <div className={`relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ring-1 sm:size-10 ${STEP_ACCENTS[i]}`}>
                        <Icon className={`size-4 sm:size-5 ${STEP_ICON_COLORS[i]}`} />
                      </div>

                      {/* Label and stats */}
                      <div className="relative flex flex-1 items-center justify-between gap-2 min-w-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{step.label}</p>
                          <p className="text-xs text-muted-foreground">
                            Step {i + 1}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold tabular-nums sm:text-xl">{step.count}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">{step.pct}%</p>
                        </div>
                      </div>

                      {/* Progress bar at bottom */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-lg">
                        <div
                          className={`h-full rounded-b-lg transition-all ${
                            step.pct >= 70
                              ? "bg-primary"
                              : step.pct >= 30
                              ? "bg-primary/60"
                              : "bg-destructive/60"
                          }`}
                          style={{ width: `${step.pct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Drop-off connector between steps */}
                  {!isLastStep && conversions[i] && (
                    <div className="flex flex-col items-center py-1.5">
                      <div className="flex items-center gap-1.5 text-xs">
                        <ArrowDownIcon className="size-3 text-muted-foreground/60" />
                        <span className={`font-medium tabular-nums ${
                          conversions[i].rate >= 80
                            ? "text-foreground"
                            : conversions[i].rate >= 50
                            ? "text-muted-foreground"
                            : "text-destructive"
                        }`}>
                          {conversions[i].rate}% continued
                        </span>
                        {conversions[i].dropped > 0 && (
                          <span className="text-muted-foreground/60">
                            · {conversions[i].dropped} dropped
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Onboarding Timeline */}
      {timeline.length > 0 && (
        <Card className="group/card relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/3 transition-all duration-300 card-glow">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/3 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 pointer-events-none" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
                <ClockIcon className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle>Onboarding Timeline</CardTitle>
                <CardDescription>Recent signups and their activation progress</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-0">
              {timeline.map((user, i) => {
                const isLast = i === timeline.length - 1
                return (
                  <div key={user.id} className="relative flex gap-4">
                    {/* Vertical line */}
                    {!isLast && (
                      <div className="absolute left-[15px] top-9 bottom-0 w-px bg-border/60" />
                    )}
                    {/* Dot */}
                    <div className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10 mt-1">
                      <UserPlusIcon className="size-3.5 text-primary" />
                    </div>
                    {/* Content */}
                    <div className={`flex-1 pb-5 ${isLast ? "pb-0" : ""}`}>
                      <div className="flex items-center justify-between gap-2">
                        <Link href={`/dashboard/users/${user.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                          {user.name}
                        </Link>
                        <span className="text-xs text-muted-foreground shrink-0">{formatTimeAgo(user.createdAt)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {user.stepsCompleted.map((step) => (
                          <Badge
                            key={step}
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                          >
                            {step}
                          </Badge>
                        ))}
                        {user.totalSteps < 5 && (
                          <span className="text-[10px] text-muted-foreground/50 self-center ml-1">
                            {5 - user.totalSteps} steps remaining
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
