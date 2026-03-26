import { supabaseAdmin } from "@/lib/supabase/client"
import { EmptyState } from "@/components/empty-state"
import { scoreContent } from "@/lib/quality-score"
import { FileTextIcon } from "lucide-react"
import { PostList } from "./post-list"

export default async function GeneratedPostsPage() {
  const [postsRes, profilesRes] = await Promise.all([
    supabaseAdmin
      .from("generated_posts")
      .select(
        "id, user_id, content, post_type, source, status, word_count, hook, cta, created_at, conversation_id, prompt_snapshot, prompt_tokens, completion_tokens, total_tokens, model, estimated_cost",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .limit(100),
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
          title="No generated posts"
          description="Generated posts will appear here."
          icon={<FileTextIcon className="size-12" />}
        />
      </div>
    )
  }

  // Normalize unicode to NFC to prevent hydration mismatches
  // (fancy unicode chars like 𝘀𝘁𝗮 can encode differently in Node vs browser)
  const norm = (s: string | null) => s ? s.normalize("NFC") : s

  const enrichedPosts = posts.map((post) => {
    const content = norm(post.content)
    const score = scoreContent(content || "")
    return {
      ...post,
      content,
      hook: norm(post.hook),
      cta: norm(post.cta),
      userName: names.get(post.user_id) ?? "Unknown",
      qualityScore: score.total,
      qualityGrade: score.grade,
      qualityBreakdown: score.breakdown,
    }
  })

  return (
    <div className="px-4 lg:px-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Generated Posts</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          <span className="tabular-nums">{count ?? posts.length}</span>
          {" "}total posts{" · "}Showing latest 100
        </p>
      </div>

      <PostList posts={enrichedPosts} />
    </div>
  )
}
