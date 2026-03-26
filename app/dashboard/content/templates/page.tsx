import { supabaseAdmin } from "@/lib/supabase/client"
import { EmptyState } from "@/components/empty-state"
import { LayoutTemplateIcon } from "lucide-react"
import { TemplateList } from "./template-list"

export default async function TemplatesPage() {
  const [templatesRes, profilesRes] = await Promise.all([
    supabaseAdmin
      .from("templates")
      .select(
        "id, user_id, name, content, category, is_public, usage_count, is_ai_generated, created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin.from("profiles").select("id, full_name, email"),
  ])

  const templates = templatesRes.data ?? []
  const count = templatesRes.count

  const names = new Map<string, string>()
  profilesRes.data?.forEach((p) => {
    names.set(p.id, p.full_name || p.email || p.id.slice(0, 8))
  })

  if (!templates.length) {
    return (
      <div className="px-4 lg:px-6">
        <EmptyState
          title="No templates"
          description="Templates will appear here."
          icon={<LayoutTemplateIcon className="size-12" />}
        />
      </div>
    )
  }

  // Normalize unicode
  const norm = (s: string | null) => (s ? s.normalize("NFC") : s)

  const enrichedTemplates = templates.map((template) => ({
    ...template,
    name: norm(template.name),
    content: norm(template.content),
    userName: names.get(template.user_id) ?? "Unknown",
  }))

  return (
    <div className="px-4 lg:px-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          <span className="tabular-nums">{count ?? templates.length}</span>
          {" "}total templates{" · "}Showing latest 50
        </p>
      </div>

      <TemplateList templates={enrichedTemplates} />
    </div>
  )
}
