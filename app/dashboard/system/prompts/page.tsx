import Link from "next/link"
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
import { FileTextIcon } from "lucide-react"

async function getPrompts() {
  const { data, error } = await supabaseAdmin
    .from("system_prompts")
    .select("id, name, type, version, is_active, is_default, updated_at")
    .order("name")

  if (error || !data) return []
  return data
}

export default async function PromptsPage() {
  const prompts = await getPrompts()

  if (prompts.length === 0) {
    return (
      <div className="px-4 lg:px-6">
        <EmptyState
          title="No prompts configured"
          description="System prompts will appear here once created."
          icon={<FileTextIcon className="size-12" />}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold">System Prompts</h1>
        <p className="text-sm text-muted-foreground">
          {prompts.length} prompts configured
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Default</TableHead>
            <TableHead>Last Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prompts.map((prompt) => (
            <TableRow key={prompt.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/dashboard/system/prompts/${prompt.id}`}
                  className="underline underline-offset-4 hover:text-primary"
                >
                  {prompt.name}
                </Link>
              </TableCell>
              <TableCell>{prompt.type}</TableCell>
              <TableCell>v{prompt.version}</TableCell>
              <TableCell>
                <Badge variant={prompt.is_active ? "default" : "secondary"}>
                  {prompt.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={prompt.is_default ? "default" : "secondary"}>
                  {prompt.is_default ? "Default" : "No"}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(prompt.updated_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
