import { supabaseAdmin } from "@/lib/supabase/client"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SidebarSectionsManager } from "./sidebar-sections-manager"
import { LayoutPanelLeftIcon } from "lucide-react"

async function getSidebarSections() {
  const { data, error } = await supabaseAdmin
    .from("sidebar_sections")
    .select("*")
    .order("sort_order")

  if (error || !data) return []
  return data
}

export default async function SidebarControlPage() {
  const sections = await getSidebarSections()

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold">Sidebar Control</h1>
        <p className="text-sm text-muted-foreground">Manage platform navigation sections</p>
      </div>
      <p className="text-sm text-muted-foreground">
        All sections visible · Drag to reorder
      </p>
      <Card className="group/card relative border-border/50 bg-gradient-to-br from-card via-card to-primary/3">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/3 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 pointer-events-none" />
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
              <LayoutPanelLeftIcon className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle>Sidebar Control</CardTitle>
              <CardDescription>
                Toggle visibility and drag to reorder.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <SidebarSectionsManager initialSections={sections} />
      </Card>
    </div>
  )
}
