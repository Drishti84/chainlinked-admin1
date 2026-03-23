import { supabaseAdmin } from "@/lib/supabase/client"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { scoreContent, gradeColor } from "@/lib/quality-score"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FileTextIcon } from "lucide-react"

export default async function GeneratedPostsPage() {
  const { data: posts, count, error } = await supabaseAdmin
    .from("generated_posts")
    .select(
      "id, content, post_type, source, status, word_count, created_at, profiles(full_name, email)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .limit(50)

  if (error || !posts || posts.length === 0) {
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

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold">Generated Posts</h1>
        <p className="text-sm text-muted-foreground">
          {count ?? posts.length} total generated posts
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Content</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Words</TableHead>
            <TableHead>Quality</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => {
            const profile = post.profiles as unknown as {
              full_name: string
              email: string
            } | null

            return (
              <TableRow key={post.id}>
                <TableCell className="max-w-[300px] truncate">
                  {post.content?.slice(0, 80) ?? "—"}
                  {post.content && post.content.length > 80 ? "..." : ""}
                </TableCell>
                <TableCell>{profile?.full_name ?? "Unknown"}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{post.post_type ?? "—"}</Badge>
                </TableCell>
                <TableCell>{post.source ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{post.status ?? "—"}</Badge>
                </TableCell>
                <TableCell>{post.word_count ?? 0}</TableCell>
                <TableCell>
                  {(() => {
                    const score = scoreContent(post.content || "")
                    return (
                      <Badge variant={gradeColor(score.grade) as "default" | "secondary" | "destructive"}>
                        {score.total}/100
                      </Badge>
                    )
                  })()}
                </TableCell>
                <TableCell>
                  {new Date(post.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
