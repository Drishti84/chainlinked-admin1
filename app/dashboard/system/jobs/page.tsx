import { supabaseAdmin } from "@/lib/supabase/client"
import { MetricCard } from "@/components/metric-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  LoaderIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  LayersIcon,
  ServerIcon,
} from "lucide-react"

const RUNNING_STATUSES = ["pending", "scraping", "researching", "analyzing"]

function statusVariant(status: string) {
  if (status === "completed") return "default" as const
  if (status === "failed") return "destructive" as const
  return "secondary" as const
}

async function getJobs() {
  const [companyRes, researchRes, suggestionRes, profilesRes] = await Promise.all([
    supabaseAdmin
      .from("company_context")
      .select("id, company_name, status, error_message, created_at, completed_at, user_id")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("research_sessions")
      .select("id, topics, status, posts_discovered, posts_generated, error_message, created_at, completed_at, user_id")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("suggestion_generation_runs")
      .select("id, status, suggestions_requested, suggestions_generated, error_message, created_at, completed_at, user_id")
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("profiles").select("id, full_name, email"),
  ])

  const company = companyRes.data ?? []
  const research = researchRes.data ?? []
  const suggestions = suggestionRes.data ?? []

  const names = new Map<string, string>()
  profilesRes.data?.forEach((p) => {
    names.set(p.id, p.full_name || p.email || p.id.slice(0, 8))
  })

  const all = [
    ...company.map((j) => ({ status: j.status })),
    ...research.map((j) => ({ status: j.status })),
    ...suggestions.map((j) => ({ status: j.status })),
  ]

  const running = all.filter((j) => RUNNING_STATUSES.includes(j.status)).length
  const completed = all.filter((j) => j.status === "completed").length
  const failed = all.filter((j) => j.status === "failed").length
  const total = all.length

  return { company, research, suggestions, names, running, completed, failed, total }
}

export default async function JobsPage() {
  const { company, research, suggestions, names, running, completed, failed, total } =
    await getJobs()

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold">Background Jobs</h1>
        <p className="text-sm text-muted-foreground">Monitor background processing tasks</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Running" value={running} icon={LoaderIcon} accent="amber" />
        <MetricCard title="Completed" value={completed} icon={CheckCircleIcon} accent="emerald" />
        <MetricCard title="Failed" value={failed} icon={AlertTriangleIcon} accent="default" />
        <MetricCard title="Total" value={total} icon={LayersIcon} accent="primary" />
      </div>

      <Card className="group/card relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/3 transition-all duration-300 card-glow">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/3 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 pointer-events-none" />
        <CardContent className="relative pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
              <ServerIcon className="size-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-medium">Job History</h3>
              <p className="text-xs text-muted-foreground">Across all job types</p>
            </div>
          </div>
          <Tabs defaultValue="company">
            <TabsList>
              <TabsTrigger value="company">
                Company Analysis ({company.length})
              </TabsTrigger>
              <TabsTrigger value="research">
                Research Sessions ({research.length})
              </TabsTrigger>
              <TabsTrigger value="suggestions">
                Suggestion Generation ({suggestions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="company">
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {company.map((job) => (
                      <TableRow key={job.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">
                          {job.company_name}
                        </TableCell>
                        <TableCell>
                          {names.get(job.user_id) ?? "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(job.status)}>
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {job.error_message ?? "-"}
                        </TableCell>
                        <TableCell>
                          {new Date(job.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {job.completed_at
                            ? new Date(job.completed_at).toLocaleDateString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="research">
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Topics</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Discovered</TableHead>
                      <TableHead>Generated</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {research.map((job) => (
                      <TableRow key={job.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="max-w-[200px] truncate font-medium">
                          {Array.isArray(job.topics)
                            ? job.topics.join(", ")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {names.get(job.user_id) ?? "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(job.status)}>
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{job.posts_discovered ?? 0}</TableCell>
                        <TableCell>{job.posts_generated ?? 0}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {job.error_message ?? "-"}
                        </TableCell>
                        <TableCell>
                          {new Date(job.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {job.completed_at
                            ? new Date(job.completed_at).toLocaleDateString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="suggestions">
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Generated</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggestions.map((job) => (
                      <TableRow key={job.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">
                          {names.get(job.user_id) ?? "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(job.status)}>
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{job.suggestions_requested ?? 0}</TableCell>
                        <TableCell>{job.suggestions_generated ?? 0}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {job.error_message ?? "-"}
                        </TableCell>
                        <TableCell>
                          {new Date(job.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {job.completed_at
                            ? new Date(job.completed_at).toLocaleDateString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
