import { supabaseAdmin } from "@/lib/supabase/client"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ClockIcon } from "lucide-react"

export default async function ScheduledPostsPage() {
  const [postsRes, profilesRes] = await Promise.all([
    supabaseAdmin
      .from("scheduled_posts")
      .select(
        "id, user_id, content, scheduled_for, timezone, status, error_message, posted_at, created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin.from("profiles").select("id, full_name, email"),
  ])

  const posts = postsRes.data ?? []
  const count = postsRes.count

  const names = new Map<string, string>()
  profilesRes.data?.forEach((p) => {
    names.set(p.id, p.full_name || p.email || p.id.slice(0, 8))
  })

  if (!posts.length) {
    return (
      <div className="px-4 lg:px-6">
        <EmptyState
          title="No scheduled posts"
          description="Scheduled posts will appear here."
          icon={<ClockIcon className="size-12" />}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold">Scheduled Posts</h1>
        <p className="text-sm text-muted-foreground">
          {count ?? posts.length} total scheduled posts
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Content</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Scheduled For</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Error</TableHead>
            <TableHead>Posted At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => {
            const isFailed = post.status === "failed"

            return (
              <TableRow
                key={post.id}
                className={cn(isFailed && "bg-red-50 dark:bg-red-950/20")}
              >
                <TableCell className="max-w-[300px] truncate">
                  {post.content?.slice(0, 80) ?? "—"}
                  {post.content && post.content.length > 80 ? "..." : ""}
                </TableCell>
                <TableCell>{names.get(post.user_id) ?? "Unknown"}</TableCell>
                <TableCell>
                  {post.scheduled_for
                    ? new Date(post.scheduled_for).toLocaleString()
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      isFailed
                        ? "destructive"
                        : post.status === "posted"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {post.status ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {post.error_message ? (
                    <span className="text-sm text-red-600 dark:text-red-400">
                      {post.error_message}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {post.posted_at
                    ? new Date(post.posted_at).toLocaleString()
                    : "—"}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
