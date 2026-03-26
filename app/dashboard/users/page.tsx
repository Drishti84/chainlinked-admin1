import { supabaseAdmin } from "@/lib/supabase/client"
import { EmptyState } from "@/components/empty-state"
import { MetricCard } from "@/components/metric-card"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  UsersIcon,
  UserPlusIcon,
  CalendarIcon,
  CalendarDaysIcon,
  ClockIcon,
} from "lucide-react"
import Link from "next/link"
import { UsersTable } from "./users-table"

async function getUsers() {
  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, created_at, onboarding_completed, linkedin_user_id")
    .order("created_at", { ascending: false })

  if (error || !profiles) return []

  const { data: postCounts } = await supabaseAdmin
    .from("generated_posts")
    .select("user_id")

  const postCountMap = new Map<string, number>()
  postCounts?.forEach((p) => {
    postCountMap.set(p.user_id, (postCountMap.get(p.user_id) ?? 0) + 1)
  })

  const { data: teamMembers } = await supabaseAdmin
    .from("team_members")
    .select("user_id, team_id, teams(name)")

  const teamMap = new Map<string, string>()
  teamMembers?.forEach((tm) => {
    const teamName = (tm.teams as unknown as { name: string })?.name
    if (teamName) {
      teamMap.set(tm.user_id, teamName)
    }
  })

  return profiles.map((profile) => ({
    ...profile,
    postCount: postCountMap.get(profile.id) ?? 0,
    teamName: teamMap.get(profile.id) ?? null,
  }))
}

function getSignupMetrics(users: { created_at: string }[]) {
  const now = new Date()
  const todayStr = now.toISOString().split("T")[0]
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const today = users.filter((u) => u.created_at.startsWith(todayStr)).length
  const thisWeek = users.filter((u) => new Date(u.created_at) >= weekAgo).length
  const thisMonth = users.filter((u) => new Date(u.created_at) >= monthAgo).length

  return { today, thisWeek, thisMonth, total: users.length }
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
  return new Date(dateStr).toLocaleDateString()
}

export default async function UsersPage() {
  const users = await getUsers()

  if (users.length === 0) {
    return (
      <div className="px-4 lg:px-6">
        <EmptyState
          title="No users yet"
          description="Users will appear here once they sign up."
          icon={<UsersIcon className="size-12" />}
        />
      </div>
    )
  }

  const metrics = getSignupMetrics(users)
  const recentUsers = users.slice(0, 4)

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">
          {users.length} total users
        </p>
      </div>

      {/* Signup Metric Cards */}
      <div className="grid grid-cols-2 gap-3 @xl/main:grid-cols-4">
        <MetricCard
          title="Today"
          value={metrics.today}
          icon={ClockIcon}
          accent="emerald"
        />
        <MetricCard
          title="This Week"
          value={metrics.thisWeek}
          icon={CalendarIcon}
          accent="blue"
        />
        <MetricCard
          title="This Month"
          value={metrics.thisMonth}
          icon={CalendarDaysIcon}
          accent="amber"
        />
        <MetricCard
          title="Total Users"
          value={metrics.total}
          icon={UsersIcon}
          accent="primary"
        />
      </div>

      {/* Recently Joined */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-2">Recently Joined</h2>
        <div className="grid grid-cols-2 gap-2 @xl/main:grid-cols-4">
          {recentUsers.map((user) => (
            <Link key={user.id} href={`/dashboard/users/${user.id}`}>
              <Card className="group/user border-border/50 bg-gradient-to-br from-card to-primary/3 hover:border-primary/20 hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/user:opacity-100 pointer-events-none" />
                <CardContent className="relative py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
                      <UserPlusIcon className="size-3.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{user.full_name || "No name"}</p>
                      <p className="text-xs text-muted-foreground">{formatTimeAgo(user.created_at)}</p>
                    </div>
                    {user.onboarding_completed && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0 shrink-0">Done</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Filterable Table */}
      <UsersTable users={users} />
    </div>
  )
}
