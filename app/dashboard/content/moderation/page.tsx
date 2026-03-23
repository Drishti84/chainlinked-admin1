import { supabaseAdmin } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { EmptyState } from "@/components/empty-state"
import { ShieldIcon } from "lucide-react"

interface ModerationItem {
  id: string
  content: string | null
  user_name: string
  type: "generated" | "scheduled"
  meta: string
  created_at: string
}

export default async function ModerationPage() {
  const [generatedResult, scheduledResult, profilesRes] = await Promise.all([
    supabaseAdmin
      .from("generated_posts")
      .select(
        "id, user_id, content, word_count, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("scheduled_posts")
      .select(
        "id, user_id, content, status, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin.from("profiles").select("id, full_name, email"),
  ])

  const names = new Map<string, string>()
  profilesRes.data?.forEach((p) => {
    names.set(p.id, p.full_name || p.email || p.id.slice(0, 8))
  })

  const items: ModerationItem[] = []

  if (generatedResult.data) {
    for (const post of generatedResult.data) {
      items.push({
        id: post.id,
        content: post.content,
        user_name: names.get(post.user_id) ?? "Unknown",
        type: "generated",
        meta: `${post.word_count ?? 0} words`,
        created_at: post.created_at,
      })
    }
  }

  if (scheduledResult.data) {
    for (const post of scheduledResult.data) {
      items.push({
        id: post.id,
        content: post.content,
        user_name: names.get(post.user_id) ?? "Unknown",
        type: "scheduled",
        meta: post.status ?? "unknown",
        created_at: post.created_at,
      })
    }
  }

  items.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Content Moderation</CardTitle>
          <CardDescription>
            Review generated and scheduled posts across all users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState
              title="No content to moderate"
              description="Content will appear here once users start creating posts."
              icon={<ShieldIcon className="size-12" />}
            />
          ) : (
            <div className="grid gap-4">
              {items.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex flex-col gap-2 rounded-lg border p-4"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        item.type === "generated" ? "secondary" : "outline"
                      }
                    >
                      {item.type}
                    </Badge>
                    <span className="text-sm font-medium">
                      {item.user_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.meta}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {item.content ?? "No content"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
