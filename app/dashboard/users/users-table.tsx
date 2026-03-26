"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SearchIcon, ArrowUpDownIcon, DownloadIcon } from "lucide-react"

interface User {
  id: string
  full_name: string | null
  email: string
  created_at: string
  onboarding_completed: boolean
  linkedin_user_id: string | null
  postCount: number
  teamName: string | null
}

type SortKey = "name" | "created_at" | "postCount"
type SortDir = "asc" | "desc"

export function UsersTable({ users }: { users: User[] }) {
  const [search, setSearch] = useState("")
  const [onboardingFilter, setOnboardingFilter] = useState<string>("all")
  const [linkedinFilter, setLinkedinFilter] = useState<string>("all")
  const [sortKey, setSortKey] = useState<SortKey>("created_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const filtered = useMemo(() => {
    let result = users

    // Search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (u) =>
          (u.full_name?.toLowerCase().includes(q)) ||
          u.email.toLowerCase().includes(q)
      )
    }

    // Onboarding filter
    if (onboardingFilter === "complete") {
      result = result.filter((u) => u.onboarding_completed)
    } else if (onboardingFilter === "incomplete") {
      result = result.filter((u) => !u.onboarding_completed)
    }

    // LinkedIn filter
    if (linkedinFilter === "connected") {
      result = result.filter((u) => u.linkedin_user_id)
    } else if (linkedinFilter === "not_connected") {
      result = result.filter((u) => !u.linkedin_user_id)
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0
      if (sortKey === "name") {
        cmp = (a.full_name || "").localeCompare(b.full_name || "")
      } else if (sortKey === "created_at") {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else if (sortKey === "postCount") {
        cmp = a.postCount - b.postCount
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    return result
  }, [users, search, onboardingFilter, linkedinFilter, sortKey, sortDir])

  function handleExport() {
    const headers = ["Name", "Email", "Signed Up", "Onboarding", "Posts", "LinkedIn", "Team"]
    const rows = filtered.map((u) => [
      u.full_name || "No name",
      u.email,
      new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      u.onboarding_completed ? "Complete" : "Incomplete",
      String(u.postCount),
      u.linkedin_user_id ? "Connected" : "Not connected",
      u.teamName ?? "-",
    ])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "chainlinked-users.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      {/* Filters Row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={onboardingFilter} onValueChange={setOnboardingFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Onboarding" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Onboarding</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="incomplete">Incomplete</SelectItem>
            </SelectContent>
          </Select>
          <Select value={linkedinFilter} onValueChange={setLinkedinFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="LinkedIn" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All LinkedIn</SelectItem>
              <SelectItem value="connected">Connected</SelectItem>
              <SelectItem value="not_connected">Not Connected</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 shrink-0">
            <DownloadIcon className="size-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Results count */}
      {(search || onboardingFilter !== "all" || linkedinFilter !== "all") && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} of {users.length} users
        </p>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  Name
                  <ArrowUpDownIcon className={`size-3 ${sortKey === "name" ? "text-foreground" : "text-muted-foreground/40"}`} />
                </button>
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>
                <button onClick={() => toggleSort("created_at")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  Signed Up
                  <ArrowUpDownIcon className={`size-3 ${sortKey === "created_at" ? "text-foreground" : "text-muted-foreground/40"}`} />
                </button>
              </TableHead>
              <TableHead>Onboarding</TableHead>
              <TableHead>
                <button onClick={() => toggleSort("postCount")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  Posts
                  <ArrowUpDownIcon className={`size-3 ${sortKey === "postCount" ? "text-foreground" : "text-muted-foreground/40"}`} />
                </button>
              </TableHead>
              <TableHead>LinkedIn</TableHead>
              <TableHead>Team</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No users match your filters
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">
                    {user.full_name || "No name"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell className="tabular-nums">
                    {new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.onboarding_completed ? "default" : "secondary"}>
                      {user.onboarding_completed ? "Complete" : "Incomplete"}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums font-medium">{user.postCount}</TableCell>
                  <TableCell>
                    <Badge variant={user.linkedin_user_id ? "default" : "outline"}>
                      {user.linkedin_user_id ? "Connected" : "Not connected"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.teamName ?? "-"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/users/${user.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
