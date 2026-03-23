import { supabaseAdmin } from "@/lib/supabase/client"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LayoutTemplateIcon } from "lucide-react"

export default async function TemplatesPage() {
  const [templatesRes, profilesRes] = await Promise.all([
    supabaseAdmin
      .from("templates")
      .select(
        "id, user_id, name, category, is_public, usage_count, is_ai_generated, created_at",
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

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold">Templates</h1>
        <p className="text-sm text-muted-foreground">
          {count ?? templates.length} total templates
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Creator</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Visibility</TableHead>
            <TableHead>Usage Count</TableHead>
            <TableHead>AI</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => {
            return (
              <TableRow key={template.id}>
                <TableCell className="font-medium">
                  {template.name ?? "Untitled"}
                </TableCell>
                <TableCell>{names.get(template.user_id) ?? "Unknown"}</TableCell>
                <TableCell>{template.category ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={template.is_public ? "default" : "secondary"}>
                    {template.is_public ? "Public" : "Private"}
                  </Badge>
                </TableCell>
                <TableCell>{template.usage_count ?? 0}</TableCell>
                <TableCell>
                  {template.is_ai_generated ? (
                    <Badge variant="outline">AI Generated</Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {new Date(template.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
