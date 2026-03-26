import { supabaseAdmin } from "@/lib/supabase/client"
import { EmptyState } from "@/components/empty-state"
import { ClockIcon } from "lucide-react"
import { ScheduledPostList } from "./scheduled-post-list"

export default async function ScheduledPostsPage() {
  const [postsRes, profilesRes] = await Promise.all([
    supabaseAdmin
      .from("scheduled_posts")
      .select(
        "id, user_id, content, scheduled_for, timezone, status, error_message, posted_at, created_at",
        { count: "exact" }
      )
      .order("scheduled_for", { ascending: false })
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

  // Normalize unicode
  const norm = (s: string | null) => (s ? s.normalize("NFC") : s)

  const enrichedPosts = posts.map((post) => ({
    ...post,
    content: norm(post.content),
    userName: names.get(post.user_id) ?? "Unknown",
  }))

  return (
    <div className="px-4 lg:px-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Scheduled Posts</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          <span className="tabular-nums">{count ?? posts.length}</span>
          {" "}total scheduled posts
        </p>
      </div>

      <ScheduledPostList posts={enrichedPosts} />
    </div>
  )
}
