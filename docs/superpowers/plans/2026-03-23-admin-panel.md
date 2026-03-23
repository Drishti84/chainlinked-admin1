# ChainLinked Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full admin dashboard for ChainLinked SaaS with auth, user management, content moderation, token usage analytics, PostHog integration, system monitoring, and feature flags.

**Architecture:** Monolithic Next.js 16 app using the existing shadcn scaffold. Server components query Supabase directly via service role key. Auth uses bcrypt + JWT cookies with middleware protection. No client-side Supabase calls — API routes handle mutations only.

**Tech Stack:** Next.js 16.2.1, React 19, shadcn/ui (radix-nova), Recharts 3, TanStack Table 8, Supabase (service role), bcryptjs, jose, Zod 4

**Spec:** `docs/superpowers/specs/2026-03-23-admin-panel-design.md`

---

## File Structure Overview

```
lib/
├── supabase/
│   └── client.ts              — Supabase service role client singleton
├── auth.ts                    — JWT sign/verify helpers, cookie helpers
├── rate-limit.ts              — In-memory login rate limiter
├── audit.ts                   — Structured console logging for admin actions
└── posthog.ts                 — PostHog API client for server-side queries

app/
├── login/
│   └── page.tsx               — Login form (client component)
├── api/
│   ├── auth/
│   │   ├── login/route.ts     — POST: verify credentials, set JWT cookie
│   │   └── logout/route.ts    — POST: clear JWT cookie
│   └── admin/
│       ├── users/
│       │   └── [id]/route.ts  — DELETE: delete user, PATCH: suspend/unsuspend
│       ├── content/
│       │   └── [id]/route.ts  — DELETE: delete content
│       ├── prompts/
│       │   └── [id]/route.ts  — PUT: update prompt
│       └── flags/
│           └── route.ts       — GET/POST: list/create flags
│           └── [id]/route.ts  — PUT/DELETE: update/delete flag
├── dashboard/
│   ├── layout.tsx             — Sidebar + header wrapper (server component)
│   ├── page.tsx               — Overview with metric cards + charts
│   ├── users/
│   │   ├── page.tsx           — All users table
│   │   ├── [id]/page.tsx      — User detail
│   │   └── onboarding/
│   │       └── page.tsx       — Onboarding funnel
│   ├── content/
│   │   ├── generated/page.tsx — Generated posts table
│   │   ├── scheduled/page.tsx — Scheduled posts table
│   │   ├── templates/page.tsx — Templates table
│   │   └── moderation/page.tsx— Moderation review
│   ├── analytics/
│   │   ├── tokens/page.tsx    — Token usage analytics
│   │   ├── features/page.tsx  — Feature usage heatmap
│   │   └── posthog/page.tsx   — PostHog embed + API cards
│   ├── system/
│   │   ├── jobs/page.tsx      — Background jobs monitor
│   │   ├── prompts/page.tsx   — Prompts management
│   │   └── flags/page.tsx     — Feature flags
│   └── settings/
│       └── page.tsx           — Admin settings

components/
├── app-sidebar.tsx            — MODIFY: replace placeholder nav with real admin nav
├── site-header.tsx            — MODIFY: dynamic title based on current route
├── section-cards.tsx          — MODIFY: replace hardcoded cards with dynamic metric cards
├── chart-area-interactive.tsx — MODIFY: replace mock data with real signup chart
├── metric-card.tsx            — Reusable metric card with trend badge
├── admin-data-table.tsx       — Generic paginated data table for admin pages
├── confirmation-dialog.tsx    — Delete confirmation dialog (type name to confirm)
├── empty-state.tsx            — Empty state placeholder component
├── onboarding-funnel.tsx      — Funnel visualization for onboarding steps
└── login-form.tsx             — Login form component

middleware.ts                  — Auth middleware for /dashboard/* routes

scripts/
└── seed-admin.ts              — Script to create initial admin user
```

---

## Chunk 1: Foundation — Dependencies, Supabase Client, Auth System

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install production dependencies**

```bash
cd "/Volumes/Crucial X9/AgiNotReady/chainlinked-admin"
npm install @supabase/supabase-js bcryptjs jose
```

- [ ] **Step 2: Install dev type definitions**

```bash
npm install -D @types/bcryptjs
```

- [ ] **Step 3: Verify installation**

```bash
npm ls @supabase/supabase-js bcryptjs jose
```

Expected: All three packages listed without errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add supabase, bcryptjs, jose dependencies"
```

---

### Task 2: Create Supabase service role client

**Files:**
- Create: `lib/supabase/client.ts`

- [ ] **Step 1: Create the Supabase client**

```typescript
// lib/supabase/client.ts
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
```

- [ ] **Step 2: Create .env.local with placeholder values**

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://baurjucvzdboavbcuxjh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
ADMIN_JWT_SECRET=generate-a-random-64-char-string-here
POSTHOG_API_KEY=
POSTHOG_PROJECT_ID=
POSTHOG_DASHBOARD_URL=
OPENROUTER_API_KEY=
```

- [ ] **Step 3: Add .env.local to .gitignore if not already there**

Read `.gitignore` and verify `.env*.local` is listed. If not, add it.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/client.ts
git commit -m "feat: add Supabase service role client"
```

---

### Task 3: Create auth utilities (JWT + password helpers)

**Files:**
- Create: `lib/auth.ts`

- [ ] **Step 1: Create auth helpers**

```typescript
// lib/auth.ts
import { SignJWT, jwtVerify } from "jose"
import bcrypt from "bcryptjs"

const JWT_SECRET = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!)
const COOKIE_NAME = "admin-session"
const EXPIRY_HOURS = 24

export interface AdminPayload {
  sub: string       // admin user id
  username: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSessionToken(payload: AdminPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_HOURS}h`)
    .sign(JWT_SECRET)
}

export async function verifySessionToken(
  token: string
): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as AdminPayload
  } catch {
    return null
  }
}

export { COOKIE_NAME }
```

- [ ] **Step 2: Commit**

```bash
git add lib/auth.ts
git commit -m "feat: add JWT and bcrypt auth utilities"
```

---

### Task 4: Create rate limiter

**Files:**
- Create: `lib/rate-limit.ts`

- [ ] **Step 1: Create in-memory rate limiter**

```typescript
// lib/rate-limit.ts
const attempts = new Map<string, { count: number; resetAt: number }>()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()
  const record = attempts.get(ip)

  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfterMs: 0 }
  }

  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMs: record.resetAt - now }
  }

  record.count++
  return { allowed: true, retryAfterMs: 0 }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/rate-limit.ts
git commit -m "feat: add in-memory login rate limiter"
```

---

### Task 5: Create audit logger

**Files:**
- Create: `lib/audit.ts`

- [ ] **Step 1: Create structured audit logger**

```typescript
// lib/audit.ts
type AuditAction =
  | "login"
  | "logout"
  | "user.delete"
  | "content.delete"
  | "prompt.update"
  | "flag.create"
  | "flag.update"
  | "flag.delete"
  | "password.change"

export function auditLog(
  action: AuditAction,
  details: Record<string, unknown>
) {
  console.log(
    JSON.stringify({
      type: "admin_audit",
      action,
      timestamp: new Date().toISOString(),
      ...details,
    })
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/audit.ts
git commit -m "feat: add structured audit logger"
```

---

### Task 6: Create admin_users table via Supabase migration

**Files:**
- None (database migration via Supabase MCP)

- [ ] **Step 1: Create admin_users table**

Run this SQL via Supabase MCP `apply_migration`:

```sql
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- No RLS needed — accessed only via service role key
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Create the seed script**

Create `scripts/seed-admin.ts`:

```typescript
// scripts/seed-admin.ts
// Usage: npx tsx scripts/seed-admin.ts <username> <password>
import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function main() {
  const [username, password] = process.argv.slice(2)

  if (!username || !password) {
    console.error("Usage: npx tsx scripts/seed-admin.ts <username> <password>")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const hash = await bcrypt.hash(password, 12)

  const { error } = await supabase.from("admin_users").insert({
    username,
    password_hash: hash,
  })

  if (error) {
    console.error("Failed to create admin:", error.message)
    process.exit(1)
  }

  console.log(`Admin user "${username}" created successfully.`)
}

main()
```

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-admin.ts
git commit -m "feat: add admin_users table migration and seed script"
```

---

### Task 7: Create login API route

**Files:**
- Create: `app/api/auth/login/route.ts`

- [ ] **Step 1: Create login route handler**

```typescript
// app/api/auth/login/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/client"
import { verifyPassword, createSessionToken, COOKIE_NAME } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { auditLog } from "@/lib/audit"

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown"

  const { allowed, retryAfterMs } = checkRateLimit(ip)
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    )
  }

  const body = await request.json()
  const { username, password } = body

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 }
    )
  }

  const { data: admin, error } = await supabaseAdmin
    .from("admin_users")
    .select("id, username, password_hash")
    .eq("username", username)
    .single()

  if (error || !admin) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 })
  }

  const valid = await verifyPassword(password, admin.password_hash)
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 })
  }

  const token = await createSessionToken({
    sub: admin.id,
    username: admin.username,
  })

  // Update last_login
  await supabaseAdmin
    .from("admin_users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", admin.id)

  auditLog("login", { adminId: admin.id, username: admin.username, ip })

  const response = NextResponse.json({ success: true })
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  })

  return response
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/auth/login/route.ts
git commit -m "feat: add login API route with rate limiting"
```

---

### Task 8: Create logout API route

**Files:**
- Create: `app/api/auth/logout/route.ts`

- [ ] **Step 1: Create logout route handler**

```typescript
// app/api/auth/logout/route.ts
import { NextResponse } from "next/server"
import { COOKIE_NAME } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

export async function POST() {
  auditLog("logout", {})

  const response = NextResponse.json({ success: true })
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  })

  return response
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/auth/logout/route.ts
git commit -m "feat: add logout API route"
```

---

### Task 9: Create middleware for auth protection

**Files:**
- Create: `middleware.ts` (project root)

- [ ] **Step 1: Create auth middleware**

```typescript
// middleware.ts
import { NextResponse, type NextRequest } from "next/server"
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /dashboard routes
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const payload = await verifySessionToken(token)
  if (!payload) {
    const response = NextResponse.redirect(new URL("/login", request.url))
    response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add auth middleware for dashboard routes"
```

---

### Task 10: Create login page

**Files:**
- Create: `components/login-form.tsx`
- Create: `app/login/page.tsx`

- [ ] **Step 1: Create the login form component**

```tsx
// components/login-form.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const username = formData.get("username") as string
    const password = formData.get("password") as string

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Login failed.")
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">ChainLinked Admin</CardTitle>
        <CardDescription>Enter your credentials to sign in.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create the login page**

```tsx
// app/login/page.tsx
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoginForm />
    </div>
  )
}
```

- [ ] **Step 3: Verify login flow works**

Run: `npm run dev`

1. Visit `http://localhost:3000/dashboard` — should redirect to `/login`
2. Enter wrong credentials — should show error
3. Seed an admin user first, then login with correct credentials — should redirect to `/dashboard`

- [ ] **Step 4: Commit**

```bash
git add components/login-form.tsx app/login/page.tsx
git commit -m "feat: add login page with form and error handling"
```

---

## Chunk 2: Dashboard Layout, Sidebar, and Overview Page

### Task 11: Rewrite sidebar with admin navigation

**Files:**
- Modify: `components/app-sidebar.tsx`

- [ ] **Step 1: Replace the entire sidebar data and component**

Replace the entire content of `components/app-sidebar.tsx` with:

```tsx
// components/app-sidebar.tsx
"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboardIcon,
  UsersIcon,
  FileTextIcon,
  BarChart3Icon,
  CogIcon,
  CalendarIcon,
  LayoutTemplateIcon,
  ShieldIcon,
  CoinsIcon,
  ActivityIcon,
  MonitorIcon,
  ScrollTextIcon,
  FlagIcon,
  SettingsIcon,
  LinkIcon,
  LogOutIcon,
} from "lucide-react"

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
    ],
  },
  {
    label: "Users",
    items: [
      { title: "All Users", url: "/dashboard/users", icon: UsersIcon },
      { title: "Onboarding Funnel", url: "/dashboard/users/onboarding", icon: ActivityIcon },
    ],
  },
  {
    label: "Content",
    items: [
      { title: "Generated Posts", url: "/dashboard/content/generated", icon: FileTextIcon },
      { title: "Scheduled Posts", url: "/dashboard/content/scheduled", icon: CalendarIcon },
      { title: "Templates", url: "/dashboard/content/templates", icon: LayoutTemplateIcon },
      { title: "Moderation", url: "/dashboard/content/moderation", icon: ShieldIcon },
    ],
  },
  {
    label: "Analytics",
    items: [
      { title: "Token Usage", url: "/dashboard/analytics/tokens", icon: CoinsIcon },
      { title: "Feature Usage", url: "/dashboard/analytics/features", icon: BarChart3Icon },
      { title: "PostHog", url: "/dashboard/analytics/posthog", icon: MonitorIcon },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Background Jobs", url: "/dashboard/system/jobs", icon: CogIcon },
      { title: "Prompts", url: "/dashboard/system/prompts", icon: ScrollTextIcon },
      { title: "Feature Flags", url: "/dashboard/system/flags", icon: FlagIcon },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Admin Account", url: "/dashboard/settings", icon: SettingsIcon },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="/dashboard">
                <LinkIcon className="size-5!" />
                <span className="text-base font-semibold">ChainLinked Admin</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                    >
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOutIcon className="mr-2 size-4" />
          Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/app-sidebar.tsx
git commit -m "feat: replace sidebar with admin navigation structure"
```

---

### Task 12: Create dashboard layout

**Files:**
- Create: `app/dashboard/layout.tsx`

- [ ] **Step 1: Create the layout**

```tsx
// app/dashboard/layout.tsx
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/layout.tsx
git commit -m "feat: add dashboard layout with sidebar and header"
```

---

### Task 13: Create reusable metric card component

**Files:**
- Create: `components/metric-card.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/metric-card.tsx
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  change?: number        // percentage change (e.g., 12.5 or -20)
  subtitle?: string
}

export function MetricCard({ title, value, change, subtitle }: MetricCardProps) {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0
  const TrendIcon = isPositive
    ? TrendingUpIcon
    : isNegative
    ? TrendingDownIcon
    : MinusIcon

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {typeof value === "number" ? value.toLocaleString() : value}
        </CardTitle>
        {change !== undefined && (
          <CardAction>
            <Badge variant="outline">
              <TrendIcon />
              {change > 0 ? "+" : ""}
              {change.toFixed(1)}%
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {subtitle && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">{subtitle}</div>
        </CardFooter>
      )}
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/metric-card.tsx
git commit -m "feat: add reusable metric card component"
```

---

### Task 14: Create empty state component

**Files:**
- Create: `components/empty-state.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/empty-state.tsx
import { InboxIcon } from "lucide-react"

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
}

export function EmptyState({
  title = "No data yet",
  description = "There's nothing to show here.",
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-muted-foreground">
        {icon ?? <InboxIcon className="size-12" />}
      </div>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/empty-state.tsx
git commit -m "feat: add empty state component"
```

---

### Task 15: Create confirmation dialog component

**Files:**
- Create: `components/confirmation-dialog.tsx`

- [ ] **Step 1: Add dialog shadcn component if not present**

Check if `components/ui/dialog.tsx` exists. If not:

```bash
cd "/Volumes/Crucial X9/AgiNotReady/chainlinked-admin"
npx shadcn@latest add dialog
```

- [ ] **Step 2: Create the confirmation dialog**

```tsx
// components/confirmation-dialog.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText: string // user must type this to confirm
  onConfirm: () => void
  loading?: boolean
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  onConfirm,
  loading,
}: ConfirmationDialogProps) {
  const [input, setInput] = useState("")

  function handleConfirm() {
    if (input === confirmText) {
      onConfirm()
      setInput("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); setInput("") }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Type <span className="font-mono font-medium text-foreground">{confirmText}</span> to confirm.
          </p>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={confirmText}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={input !== confirmText || loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/confirmation-dialog.tsx components/ui/dialog.tsx
git commit -m "feat: add confirmation dialog for destructive actions"
```

---

### Task 16: Build the dashboard overview page

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `components/section-cards.tsx` (delete — replaced by inline metric cards)

- [ ] **Step 1: Rewrite the dashboard overview page**

Replace `app/dashboard/page.tsx` entirely:

```tsx
// app/dashboard/page.tsx
import { supabaseAdmin } from "@/lib/supabase/client"
import { MetricCard } from "@/components/metric-card"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

async function getOverviewMetrics() {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const weekAgoISO = weekAgo.toISOString()
  const twoWeeksAgoISO = twoWeeksAgo.toISOString()

  const [
    { count: totalUsers },
    { count: usersLastWeek },
    { count: usersPrevWeek },
    { count: postsGenerated },
    { count: postsGeneratedThisWeek },
    { count: postsPublished },
    { count: teams },
    { count: companies },
    tokenData,
    activeUsersData,
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgoISO),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", twoWeeksAgoISO).lt("created_at", weekAgoISO),
    supabaseAdmin.from("generated_posts").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("generated_posts").select("*", { count: "exact", head: true }).gte("created_at", weekAgoISO),
    supabaseAdmin.from("scheduled_posts").select("*", { count: "exact", head: true }).eq("status", "posted"),
    supabaseAdmin.from("teams").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("companies").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("prompt_usage_logs").select("total_tokens, estimated_cost"),
    supabaseAdmin.from("generated_posts").select("user_id").gte("created_at", weekAgoISO),
  ])

  const totalTokens = tokenData.data?.reduce((sum, r) => sum + (r.total_tokens || 0), 0) ?? 0
  const totalCost = tokenData.data?.reduce((sum, r) => sum + Number(r.estimated_cost || 0), 0) ?? 0
  const activeUsers = new Set(activeUsersData.data?.map((r) => r.user_id)).size

  const userGrowth = usersPrevWeek
    ? (((usersLastWeek ?? 0) - (usersPrevWeek ?? 0)) / (usersPrevWeek ?? 1)) * 100
    : 0

  return {
    totalUsers: totalUsers ?? 0,
    userGrowth,
    activeUsers,
    postsGenerated: postsGenerated ?? 0,
    postsGeneratedThisWeek: postsGeneratedThisWeek ?? 0,
    postsPublished: postsPublished ?? 0,
    totalTokens,
    totalCost,
    teams: (teams ?? 0) + (companies ?? 0),
  }
}

async function getRecentActivity() {
  const [signups, generated, scheduled] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("generated_posts")
      .select("id, user_id, post_type, created_at, content")
      .order("created_at", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("scheduled_posts")
      .select("id, user_id, status, scheduled_for, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  type ActivityItem = {
    type: "signup" | "generated" | "scheduled"
    id: string
    description: string
    timestamp: string
  }

  const items: ActivityItem[] = []

  signups.data?.forEach((u) =>
    items.push({
      type: "signup",
      id: u.id,
      description: `${u.full_name || u.email} signed up`,
      timestamp: u.created_at,
    })
  )
  generated.data?.forEach((p) =>
    items.push({
      type: "generated",
      id: p.id,
      description: `Post generated (${p.post_type || "unknown"})`,
      timestamp: p.created_at,
    })
  )
  scheduled.data?.forEach((s) =>
    items.push({
      type: "scheduled",
      id: s.id,
      description: `Post ${s.status} for ${new Date(s.scheduled_for).toLocaleDateString()}`,
      timestamp: s.created_at,
    })
  )

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)
}

async function getSystemHealth() {
  const [companyJobs, researchJobs, suggestionJobs] = await Promise.all([
    supabaseAdmin.from("company_context").select("status"),
    supabaseAdmin.from("research_sessions").select("status"),
    supabaseAdmin.from("suggestion_generation_runs").select("status"),
  ])

  const allJobs = [
    ...(companyJobs.data || []),
    ...(researchJobs.data || []),
    ...(suggestionJobs.data || []),
  ]

  return {
    running: allJobs.filter((j) => ["pending", "scraping", "researching", "analyzing"].includes(j.status)).length,
    completed: allJobs.filter((j) => j.status === "completed").length,
    failed: allJobs.filter((j) => j.status === "failed").length,
    total: allJobs.length,
  }
}

export default async function DashboardPage() {
  const [metrics, activity, health] = await Promise.all([
    getOverviewMetrics(),
    getRecentActivity(),
    getSystemHealth(),
  ])

  return (
    <>
      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
        <MetricCard
          title="Total Users"
          value={metrics.totalUsers}
          change={metrics.userGrowth}
          subtitle="All registered users"
        />
        <MetricCard
          title="Active Users (7d)"
          value={metrics.activeUsers}
          subtitle="Users who generated content this week"
        />
        <MetricCard
          title="Posts Generated"
          value={metrics.postsGenerated}
          subtitle={`${metrics.postsGeneratedThisWeek} this week`}
        />
        <MetricCard
          title="Posts Published"
          value={metrics.postsPublished}
          subtitle="Successfully posted to LinkedIn"
        />
        <MetricCard
          title="Token Usage"
          value={metrics.totalTokens.toLocaleString()}
          subtitle={`Est. cost: $${metrics.totalCost.toFixed(2)}`}
        />
        <MetricCard
          title="Teams & Companies"
          value={metrics.teams}
          subtitle="Total organizations"
        />
      </div>

      {/* Recent Activity + System Health */}
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest events across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{item.description}</span>
                  <span className="text-muted-foreground">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Background job status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-semibold text-yellow-600">{health.running}</div>
                <div className="text-sm text-muted-foreground">Running</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-green-600">{health.completed}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-destructive">{health.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold">{health.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify the dashboard loads with real data**

Run: `npm run dev`, visit `http://localhost:3000/dashboard` (after logging in).

Expected: 6 metric cards with real data, recent activity panel, system health panel.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: build dashboard overview with live Supabase metrics"
```

---

## Chunk 3: Users Section

### Task 17: Build All Users page

**Files:**
- Create: `app/dashboard/users/page.tsx`

- [ ] **Step 1: Create the users table page**

```tsx
// app/dashboard/users/page.tsx
import { supabaseAdmin } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/empty-state"

async function getUsers() {
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, created_at, onboarding_completed, linkedin_user_id, extension_last_active_at")
    .order("created_at", { ascending: false })

  if (!profiles) return []

  // Get post counts per user
  const { data: postCounts } = await supabaseAdmin
    .from("generated_posts")
    .select("user_id")

  const postCountMap = new Map<string, number>()
  postCounts?.forEach((p) => {
    postCountMap.set(p.user_id, (postCountMap.get(p.user_id) || 0) + 1)
  })

  // Get team memberships
  const { data: memberships } = await supabaseAdmin
    .from("team_members")
    .select("user_id, team_id, teams(name)")

  const teamMap = new Map<string, string>()
  memberships?.forEach((m) => {
    const teamName = (m as unknown as { teams: { name: string } }).teams?.name
    if (teamName) teamMap.set(m.user_id, teamName)
  })

  return profiles.map((p) => ({
    ...p,
    postsGenerated: postCountMap.get(p.id) || 0,
    teamName: teamMap.get(p.id) || "—",
    onboardingStatus: p.onboarding_completed
      ? "complete"
      : "incomplete" as const,
    linkedinConnected: !!p.linkedin_user_id,
  }))
}

export default async function UsersPage() {
  const users = await getUsers()

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <EmptyState title="No users" description="No users have signed up yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Signed Up</TableHead>
                  <TableHead>Onboarding</TableHead>
                  <TableHead>Posts</TableHead>
                  <TableHead>LinkedIn</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || "—"}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.onboardingStatus === "complete"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {user.onboardingStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.postsGenerated}</TableCell>
                    <TableCell>
                      {user.linkedinConnected ? (
                        <Badge variant="default">Connected</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>{user.teamName}</TableCell>
                    <TableCell>
                      <a
                        href={`/dashboard/users/${user.id}`}
                        className="text-sm text-primary underline-offset-4 hover:underline"
                      >
                        View
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/users/page.tsx
git commit -m "feat: add users listing page with posts and team data"
```

---

### Task 18: Build User Detail page

**Files:**
- Create: `app/dashboard/users/[id]/page.tsx`
- Create: `app/api/admin/users/[id]/route.ts`

- [ ] **Step 1: Create the delete user API route**

```typescript
// app/api/admin/users/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/client"
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = await verifySessionToken(token)
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  // Delete from auth.users (cascades to profiles via Supabase trigger)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  auditLog("user.delete", { adminId: admin.sub, targetUserId: id })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Create the user detail page**

```tsx
// app/dashboard/users/[id]/page.tsx
import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/client"
import { MetricCard } from "@/components/metric-card"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserActions } from "./user-actions"

async function getUserData(id: string) {
  const [profile, generatedPosts, scheduledPosts, templates, tokenUsage] =
    await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", id).single(),
      supabaseAdmin
        .from("generated_posts")
        .select("id, content, post_type, status, created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("scheduled_posts")
        .select("id, content, status, scheduled_for, created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("templates")
        .select("*", { count: "exact", head: true })
        .eq("user_id", id),
      supabaseAdmin
        .from("prompt_usage_logs")
        .select("total_tokens, estimated_cost, feature, created_at")
        .eq("user_id", id),
    ])

  return {
    profile: profile.data,
    generatedPosts: generatedPosts.data || [],
    scheduledPosts: scheduledPosts.data || [],
    templatesCount: templates.count || 0,
    tokenUsage: tokenUsage.data || [],
  }
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getUserData(id)

  if (!data.profile) return notFound()

  const p = data.profile
  const totalTokens = data.tokenUsage.reduce((s, r) => s + (r.total_tokens || 0), 0)
  const totalCost = data.tokenUsage.reduce((s, r) => s + Number(r.estimated_cost || 0), 0)

  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="size-16">
            <AvatarImage src={p.avatar_url || p.linkedin_avatar_url || undefined} />
            <AvatarFallback>
              {(p.full_name || p.email || "?").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{p.full_name || "Unnamed"}</h2>
            <p className="text-sm text-muted-foreground">{p.email}</p>
            <div className="mt-1 flex gap-2">
              <Badge variant={p.onboarding_completed ? "default" : "secondary"}>
                {p.onboarding_completed ? "Onboarded" : "Not onboarded"}
              </Badge>
              {p.linkedin_user_id && <Badge>LinkedIn Connected</Badge>}
            </div>
          </div>
          <UserActions userId={id} userName={p.full_name || p.email || id} />
        </CardContent>
      </Card>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <MetricCard title="Posts Generated" value={data.generatedPosts.length} />
        <MetricCard title="Posts Scheduled" value={data.scheduledPosts.length} />
        <MetricCard title="Templates" value={data.templatesCount} />
        <MetricCard title="Token Usage" value={totalTokens.toLocaleString()} subtitle={`$${totalCost.toFixed(2)}`} />
      </div>

      {/* Recent Generated Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Generated Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Content</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.generatedPosts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="max-w-xs truncate">
                    {post.content?.slice(0, 80)}...
                  </TableCell>
                  <TableCell>{post.post_type || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{post.status || "draft"}</Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(post.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Create the user actions client component**

```tsx
// app/dashboard/users/[id]/user-actions.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { toast } from "sonner"

export function UserActions({
  userId,
  userName,
}: {
  userId: string
  userName: string
}) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to delete user")
        return
      }
      toast.success("User deleted")
      router.push("/dashboard/users")
      router.refresh()
    } catch {
      toast.error("Network error")
    } finally {
      setLoading(false)
      setDeleteOpen(false)
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
        Delete User
      </Button>
      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete User"
        description={`This will permanently delete "${userName}" and all their data. This cannot be undone.`}
        confirmText={userName}
        onConfirm={handleDelete}
        loading={loading}
      />
    </>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/users/\[id\]/page.tsx app/dashboard/users/\[id\]/user-actions.tsx app/api/admin/users/\[id\]/route.ts
git commit -m "feat: add user detail page with delete action"
```

---

### Task 19: Build Onboarding Funnel page

**Files:**
- Create: `app/dashboard/users/onboarding/page.tsx`

- [ ] **Step 1: Create the funnel page**

```tsx
// app/dashboard/users/onboarding/page.tsx
import { supabaseAdmin } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

async function getFunnelData() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalUsers },
    { count: onboarded },
    linkedinUsers,
    postUsers,
    scheduledUsers,
    activeUsers,
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("onboarding_completed", true),
    supabaseAdmin.from("linkedin_tokens").select("user_id"),
    supabaseAdmin.from("generated_posts").select("user_id"),
    supabaseAdmin.from("scheduled_posts").select("user_id"),
    supabaseAdmin.from("generated_posts").select("user_id").gte("created_at", weekAgo),
  ])

  const linkedinCount = new Set(linkedinUsers.data?.map((r) => r.user_id)).size
  const postCount = new Set(postUsers.data?.map((r) => r.user_id)).size
  const scheduledCount = new Set(scheduledUsers.data?.map((r) => r.user_id)).size
  const activeCount = new Set(activeUsers.data?.map((r) => r.user_id)).size

  const total = totalUsers ?? 0
  return [
    { label: "Signed Up", count: total },
    { label: "Onboarding Complete", count: onboarded ?? 0 },
    { label: "LinkedIn Connected", count: linkedinCount },
    { label: "First Post Generated", count: postCount },
    { label: "First Post Scheduled", count: scheduledCount },
    { label: "Active (Last 7d)", count: activeCount },
  ].map((step) => ({
    ...step,
    percentage: total > 0 ? Math.round((step.count / total) * 100) : 0,
  }))
}

export default async function OnboardingFunnelPage() {
  const steps = await getFunnelData()

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Funnel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, i) => (
            <div key={step.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {i + 1}. {step.label}
                </span>
                <span className="text-muted-foreground">
                  {step.count} users ({step.percentage}%)
                </span>
              </div>
              <div className="h-8 w-full overflow-hidden rounded-md bg-secondary">
                <div
                  className="h-full rounded-md bg-primary transition-all"
                  style={{ width: `${step.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/users/onboarding/page.tsx
git commit -m "feat: add onboarding funnel visualization"
```

---

## Chunk 4: Content Section

### Task 20: Build Generated Posts page

**Files:**
- Create: `app/dashboard/content/generated/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// app/dashboard/content/generated/page.tsx
import { supabaseAdmin } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/empty-state"

export default async function GeneratedPostsPage() {
  const { data: posts, count } = await supabaseAdmin
    .from("generated_posts")
    .select("id, user_id, content, post_type, source, status, word_count, created_at, profiles(full_name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Generated Posts ({count ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!posts?.length ? (
            <EmptyState title="No posts" description="No posts have been generated yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Words</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => {
                  const profile = post.profiles as unknown as { full_name: string; email: string } | null
                  return (
                    <TableRow key={post.id}>
                      <TableCell className="max-w-xs truncate">
                        {post.content?.slice(0, 80)}
                      </TableCell>
                      <TableCell>{profile?.full_name || profile?.email || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{post.post_type || "—"}</Badge>
                      </TableCell>
                      <TableCell>{post.source || "direct"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{post.status || "draft"}</Badge>
                      </TableCell>
                      <TableCell>{post.word_count || "—"}</TableCell>
                      <TableCell>{new Date(post.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/content/generated/page.tsx
git commit -m "feat: add generated posts listing page"
```

---

### Task 21: Build Scheduled Posts page

**Files:**
- Create: `app/dashboard/content/scheduled/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// app/dashboard/content/scheduled/page.tsx
import { supabaseAdmin } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/empty-state"
import { cn } from "@/lib/utils"

export default async function ScheduledPostsPage() {
  const { data: posts, count } = await supabaseAdmin
    .from("scheduled_posts")
    .select("id, user_id, content, scheduled_for, timezone, status, error_message, posted_at, created_at, profiles(full_name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Posts ({count ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!posts?.length ? (
            <EmptyState title="No scheduled posts" description="No posts have been scheduled yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Scheduled For</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Posted At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => {
                  const profile = post.profiles as unknown as { full_name: string; email: string } | null
                  const isFailed = post.status === "failed"
                  return (
                    <TableRow key={post.id} className={cn(isFailed && "bg-destructive/5")}>
                      <TableCell className="max-w-xs truncate">{post.content?.slice(0, 80)}</TableCell>
                      <TableCell>{profile?.full_name || profile?.email || "—"}</TableCell>
                      <TableCell>{new Date(post.scheduled_for).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={isFailed ? "destructive" : post.status === "posted" ? "default" : "secondary"}>
                          {post.status}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn("max-w-xs truncate", isFailed && "text-destructive")}>
                        {post.error_message || "—"}
                      </TableCell>
                      <TableCell>
                        {post.posted_at ? new Date(post.posted_at).toLocaleString() : "—"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/content/scheduled/page.tsx
git commit -m "feat: add scheduled posts page with failure highlighting"
```

---

### Task 22: Build Templates page

**Files:**
- Create: `app/dashboard/content/templates/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// app/dashboard/content/templates/page.tsx
import { supabaseAdmin } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/empty-state"

export default async function TemplatesPage() {
  const { data: templates, count } = await supabaseAdmin
    .from("templates")
    .select("id, name, user_id, category, is_public, usage_count, is_ai_generated, created_at, profiles(full_name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Templates ({count ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!templates?.length ? (
            <EmptyState title="No templates" description="No templates have been created." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>AI</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => {
                  const profile = t.profiles as unknown as { full_name: string; email: string } | null
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{profile?.full_name || profile?.email || "—"}</TableCell>
                      <TableCell>{t.category || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={t.is_public ? "default" : "secondary"}>
                          {t.is_public ? "Public" : "Private"}
                        </Badge>
                      </TableCell>
                      <TableCell>{t.usage_count}</TableCell>
                      <TableCell>
                        {t.is_ai_generated && <Badge variant="outline">AI</Badge>}
                      </TableCell>
                      <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/content/templates/page.tsx
git commit -m "feat: add templates listing page"
```

---

### Task 23: Build Moderation Queue page

**Files:**
- Create: `app/dashboard/content/moderation/page.tsx`
- Create: `app/api/admin/content/[id]/route.ts`

- [ ] **Step 1: Create the delete content API route**

```typescript
// app/api/admin/content/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/client"
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = await verifySessionToken(token)
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const url = new URL(request.url)
  const table = url.searchParams.get("table") || "generated_posts"

  if (!["generated_posts", "scheduled_posts"].includes(table)) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from(table).delete().eq("id", id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  auditLog("content.delete", { adminId: admin.sub, contentId: id, table })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Create the moderation page**

```tsx
// app/dashboard/content/moderation/page.tsx
import { supabaseAdmin } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"

export default async function ModerationPage() {
  const { data: posts } = await supabaseAdmin
    .from("generated_posts")
    .select("id, user_id, content, post_type, word_count, created_at, profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Content Moderation</CardTitle>
          <CardDescription>Review generated content across all users</CardDescription>
        </CardHeader>
        <CardContent>
          {!posts?.length ? (
            <EmptyState title="No content" description="No content to review." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content Preview</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Words</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => {
                  const profile = post.profiles as unknown as { full_name: string; email: string } | null
                  return (
                    <TableRow key={post.id}>
                      <TableCell className="max-w-md">
                        <p className="line-clamp-3 text-sm">{post.content}</p>
                      </TableCell>
                      <TableCell>{profile?.full_name || profile?.email || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{post.post_type || "—"}</Badge>
                      </TableCell>
                      <TableCell>{post.word_count || "—"}</TableCell>
                      <TableCell>{new Date(post.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/content/moderation/page.tsx app/api/admin/content/\[id\]/route.ts
git commit -m "feat: add content moderation page and delete API"
```

---

## Chunk 5: Analytics Section

### Task 24: Build Token Usage page

**Files:**
- Create: `app/dashboard/analytics/tokens/page.tsx`

- [ ] **Step 1: Create the token usage analytics page**

```tsx
// app/dashboard/analytics/tokens/page.tsx
import { supabaseAdmin } from "@/lib/supabase/client"
import { MetricCard } from "@/components/metric-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/empty-state"

async function getTokenMetrics() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [allLogs, weekLogs, { count: totalUsers }] = await Promise.all([
    supabaseAdmin.from("prompt_usage_logs").select("user_id, total_tokens, estimated_cost, model, feature, created_at"),
    supabaseAdmin.from("prompt_usage_logs").select("total_tokens, estimated_cost").gte("created_at", weekAgo),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
  ])

  const logs = allLogs.data || []
  const totalTokens = logs.reduce((s, r) => s + (r.total_tokens || 0), 0)
  const totalCost = logs.reduce((s, r) => s + Number(r.estimated_cost || 0), 0)
  const weekTokens = (weekLogs.data || []).reduce((s, r) => s + (r.total_tokens || 0), 0)
  const weekCost = (weekLogs.data || []).reduce((s, r) => s + Number(r.estimated_cost || 0), 0)
  const userCount = totalUsers ?? 1

  // Per-user breakdown
  const userMap = new Map<string, { tokens: number; cost: number; count: number; lastUsed: string }>()
  logs.forEach((l) => {
    const existing = userMap.get(l.user_id) || { tokens: 0, cost: 0, count: 0, lastUsed: "" }
    existing.tokens += l.total_tokens || 0
    existing.cost += Number(l.estimated_cost || 0)
    existing.count++
    if (l.created_at > existing.lastUsed) existing.lastUsed = l.created_at
    userMap.set(l.user_id, existing)
  })

  // Model breakdown
  const modelMap = new Map<string, number>()
  logs.forEach((l) => {
    const model = l.model || "unknown"
    modelMap.set(model, (modelMap.get(model) || 0) + Number(l.estimated_cost || 0))
  })

  // Feature breakdown
  const featureMap = new Map<string, number>()
  logs.forEach((l) => {
    const feature = l.feature || "unknown"
    featureMap.set(feature, (featureMap.get(feature) || 0) + Number(l.estimated_cost || 0))
  })

  return {
    totalTokens,
    totalCost,
    avgCostPerUser: totalCost / userCount,
    avgCostPerPost: logs.length > 0 ? totalCost / logs.length : 0,
    weekTokens,
    weekCost,
    perUser: Array.from(userMap.entries()).map(([userId, data]) => ({ userId, ...data })),
    byModel: Array.from(modelMap.entries()).map(([model, cost]) => ({ model, cost })).sort((a, b) => b.cost - a.cost),
    byFeature: Array.from(featureMap.entries()).map(([feature, cost]) => ({ feature, cost })).sort((a, b) => b.cost - a.cost),
  }
}

export default async function TokenUsagePage() {
  const m = await getTokenMetrics()

  // Fetch user names for the per-user table
  const userIds = m.perUser.map((u) => u.userId)
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds)

  const nameMap = new Map<string, string>()
  profiles?.forEach((p) => nameMap.set(p.id, p.full_name || p.email || p.id))

  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
        <MetricCard title="Total Tokens" value={m.totalTokens.toLocaleString()} />
        <MetricCard title="Total Cost" value={`$${m.totalCost.toFixed(2)}`} />
        <MetricCard title="Avg Cost / User" value={`$${m.avgCostPerUser.toFixed(2)}`} />
        <MetricCard title="Avg Cost / Request" value={`$${m.avgCostPerPost.toFixed(4)}`} />
        <MetricCard title="Tokens This Week" value={m.weekTokens.toLocaleString()} />
        <MetricCard title="Cost This Week" value={`$${m.weekCost.toFixed(2)}`} />
      </div>

      {/* Cost by Model + Feature side by side */}
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cost by Model</CardTitle>
          </CardHeader>
          <CardContent>
            {m.byModel.length === 0 ? (
              <EmptyState title="No data" />
            ) : (
              <div className="space-y-2">
                {m.byModel.map((item) => (
                  <div key={item.model} className="flex items-center justify-between text-sm">
                    <span className="font-mono">{item.model}</span>
                    <span className="font-medium">${item.cost.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cost by Feature</CardTitle>
          </CardHeader>
          <CardContent>
            {m.byFeature.length === 0 ? (
              <EmptyState title="No data" />
            ) : (
              <div className="space-y-2">
                {m.byFeature.map((item) => (
                  <div key={item.feature} className="flex items-center justify-between text-sm">
                    <span>{item.feature}</span>
                    <span className="font-medium">${item.cost.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-user Table */}
      <Card>
        <CardHeader>
          <CardTitle>Per-User Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Total Tokens</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Avg Tokens/Req</TableHead>
                <TableHead>Last Used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {m.perUser.map((u) => (
                <TableRow key={u.userId}>
                  <TableCell>{nameMap.get(u.userId) || u.userId.slice(0, 8)}</TableCell>
                  <TableCell>{u.tokens.toLocaleString()}</TableCell>
                  <TableCell>${u.cost.toFixed(4)}</TableCell>
                  <TableCell>{u.count}</TableCell>
                  <TableCell>{u.count > 0 ? Math.round(u.tokens / u.count).toLocaleString() : 0}</TableCell>
                  <TableCell>{new Date(u.lastUsed).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/analytics/tokens/page.tsx
git commit -m "feat: add token usage analytics page with per-user breakdown"
```

---

### Task 25: Build Feature Usage page

**Files:**
- Create: `app/dashboard/analytics/features/page.tsx`

- [ ] **Step 1: Create the feature usage page**

```tsx
// app/dashboard/analytics/features/page.tsx
import { supabaseAdmin } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CheckIcon } from "lucide-react"

async function getFeatureUsage() {
  const features = [
    { name: "Post Generation", table: "generated_posts" as const },
    { name: "Scheduling", table: "scheduled_posts" as const },
    { name: "Templates", table: "templates" as const },
    { name: "Carousels", table: "carousel_templates" as const },
    { name: "Swipe/Discovery", table: "swipe_preferences" as const },
    { name: "Research Sessions", table: "research_sessions" as const },
    { name: "Compose Conversations", table: "compose_conversations" as const },
    { name: "Writing Style Analysis", table: "writing_style_profiles" as const },
  ]

  const results = await Promise.all(
    features.map(async (f) => {
      const { count } = await supabaseAdmin.from(f.table).select("*", { count: "exact", head: true })
      const { data: users } = await supabaseAdmin.from(f.table).select("user_id")
      const uniqueUsers = new Set(users?.map((u) => u.user_id)).size
      return { ...f, totalCount: count ?? 0, uniqueUsers }
    })
  )

  return results.sort((a, b) => b.totalCount - a.totalCount)
}

async function getPerUserMatrix() {
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email")

  if (!profiles) return []

  const tables = [
    "generated_posts", "scheduled_posts", "templates",
    "carousel_templates", "swipe_preferences", "research_sessions",
    "compose_conversations", "writing_style_profiles",
  ] as const

  const userFeatures = await Promise.all(
    profiles.map(async (p) => {
      const checks = await Promise.all(
        tables.map(async (table) => {
          const { count } = await supabaseAdmin
            .from(table)
            .select("*", { count: "exact", head: true })
            .eq("user_id", p.id)
          return (count ?? 0) > 0
        })
      )
      return {
        name: p.full_name || p.email || p.id.slice(0, 8),
        features: checks,
      }
    })
  )

  return userFeatures
}

export default async function FeatureUsagePage() {
  const [features, matrix] = await Promise.all([
    getFeatureUsage(),
    getPerUserMatrix(),
  ])

  const featureNames = [
    "Posts", "Schedule", "Templates", "Carousels",
    "Swipe", "Research", "Compose", "Style",
  ]

  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Feature Adoption Bar Chart (simple) */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Adoption</CardTitle>
          <CardDescription>Total usage count across all users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {features.map((f) => {
            const maxCount = features[0]?.totalCount || 1
            const width = Math.max((f.totalCount / maxCount) * 100, 2)
            return (
              <div key={f.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{f.name}</span>
                  <span className="text-muted-foreground">
                    {f.totalCount} total, {f.uniqueUsers} users
                  </span>
                </div>
                <div className="h-6 w-full overflow-hidden rounded bg-secondary">
                  <div
                    className="flex h-full items-center rounded bg-primary px-2 text-xs text-primary-foreground"
                    style={{ width: `${width}%` }}
                  >
                    {f.totalCount}
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Per-User Feature Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Per-User Feature Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                {featureNames.map((name) => (
                  <TableHead key={name} className="text-center">{name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.map((user) => (
                <TableRow key={user.name}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  {user.features.map((has, i) => (
                    <TableCell key={i} className="text-center">
                      {has ? (
                        <CheckIcon className="mx-auto size-4 text-green-600" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/analytics/features/page.tsx
git commit -m "feat: add feature usage analytics with per-user matrix"
```

---

### Task 26: Build PostHog page

**Files:**
- Create: `app/dashboard/analytics/posthog/page.tsx`

- [ ] **Step 1: Create the PostHog analytics page**

```tsx
// app/dashboard/analytics/posthog/page.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { EmptyState } from "@/components/empty-state"

export default function PostHogPage() {
  const dashboardUrl = process.env.POSTHOG_DASHBOARD_URL

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>PostHog Analytics</CardTitle>
          <CardDescription>
            Product analytics from PostHog
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardUrl ? (
            <iframe
              src={dashboardUrl}
              className="h-[800px] w-full rounded-lg border"
              title="PostHog Dashboard"
              allow="fullscreen"
            />
          ) : (
            <EmptyState
              title="PostHog not configured"
              description="Set POSTHOG_DASHBOARD_URL in your environment variables to embed your PostHog dashboard here."
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/analytics/posthog/page.tsx
git commit -m "feat: add PostHog embedded dashboard page"
```

---

## Chunk 6: System Section

### Task 27: Build Background Jobs page

**Files:**
- Create: `app/dashboard/system/jobs/page.tsx`

- [ ] **Step 1: Create the background jobs page**

```tsx
// app/dashboard/system/jobs/page.tsx
import { supabaseAdmin } from "@/lib/supabase/client"
import { MetricCard } from "@/components/metric-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"

async function getJobData() {
  const [companyJobs, researchJobs, suggestionJobs] = await Promise.all([
    supabaseAdmin
      .from("company_context")
      .select("id, company_name, status, user_id, error_message, created_at, completed_at, profiles(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("research_sessions")
      .select("id, topics, status, posts_discovered, posts_generated, error_message, user_id, created_at, completed_at, profiles(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("suggestion_generation_runs")
      .select("id, status, suggestions_requested, suggestions_generated, error_message, user_id, created_at, completed_at, profiles(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  const allStatuses = [
    ...(companyJobs.data || []),
    ...(researchJobs.data || []),
    ...(suggestionJobs.data || []),
  ].map((j) => j.status)

  const running = allStatuses.filter((s) => ["pending", "scraping", "researching", "analyzing"].includes(s)).length
  const completed = allStatuses.filter((s) => s === "completed").length
  const failed = allStatuses.filter((s) => s === "failed").length

  return {
    summary: { running, completed, failed, total: allStatuses.length },
    companyJobs: companyJobs.data || [],
    researchJobs: researchJobs.data || [],
    suggestionJobs: suggestionJobs.data || [],
  }
}

function statusVariant(status: string) {
  if (status === "completed") return "default" as const
  if (status === "failed") return "destructive" as const
  return "secondary" as const
}

export default async function BackgroundJobsPage() {
  const { summary, companyJobs, researchJobs, suggestionJobs } = await getJobData()

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <MetricCard title="Running" value={summary.running} />
        <MetricCard title="Completed" value={summary.completed} />
        <MetricCard title="Failed" value={summary.failed} />
        <MetricCard title="Total" value={summary.total} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="company">
            <TabsList>
              <TabsTrigger value="company">Company Analysis ({companyJobs.length})</TabsTrigger>
              <TabsTrigger value="research">Research ({researchJobs.length})</TabsTrigger>
              <TabsTrigger value="suggestions">Suggestions ({suggestionJobs.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="company">
              {companyJobs.length === 0 ? <EmptyState title="No jobs" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyJobs.map((j) => {
                      const profile = j.profiles as unknown as { full_name: string; email: string } | null
                      return (
                        <TableRow key={j.id}>
                          <TableCell>{j.company_name || "—"}</TableCell>
                          <TableCell>{profile?.full_name || profile?.email || "—"}</TableCell>
                          <TableCell><Badge variant={statusVariant(j.status)}>{j.status}</Badge></TableCell>
                          <TableCell className="max-w-xs truncate text-destructive">{j.error_message || "—"}</TableCell>
                          <TableCell>{new Date(j.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="research">
              {researchJobs.length === 0 ? <EmptyState title="No jobs" /> : (
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {researchJobs.map((j) => {
                      const profile = j.profiles as unknown as { full_name: string; email: string } | null
                      return (
                        <TableRow key={j.id}>
                          <TableCell className="max-w-xs truncate">{j.topics?.join(", ") || "—"}</TableCell>
                          <TableCell>{profile?.full_name || profile?.email || "—"}</TableCell>
                          <TableCell><Badge variant={statusVariant(j.status)}>{j.status}</Badge></TableCell>
                          <TableCell>{j.posts_discovered ?? 0}</TableCell>
                          <TableCell>{j.posts_generated ?? 0}</TableCell>
                          <TableCell className="max-w-xs truncate text-destructive">{j.error_message || "—"}</TableCell>
                          <TableCell>{new Date(j.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="suggestions">
              {suggestionJobs.length === 0 ? <EmptyState title="No jobs" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Generated</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggestionJobs.map((j) => {
                      const profile = j.profiles as unknown as { full_name: string; email: string } | null
                      return (
                        <TableRow key={j.id}>
                          <TableCell>{profile?.full_name || profile?.email || "—"}</TableCell>
                          <TableCell><Badge variant={statusVariant(j.status)}>{j.status}</Badge></TableCell>
                          <TableCell>{j.suggestions_requested ?? 0}</TableCell>
                          <TableCell>{j.suggestions_generated ?? 0}</TableCell>
                          <TableCell className="max-w-xs truncate text-destructive">{j.error_message || "—"}</TableCell>
                          <TableCell>{new Date(j.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Add `tabs` shadcn component if not present**

Check if `components/ui/tabs.tsx` exists. If not:

```bash
npx shadcn@latest add tabs
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/system/jobs/page.tsx
git commit -m "feat: add background jobs monitoring page"
```

---

### Task 28: Build Prompts Management page

**Files:**
- Create: `app/dashboard/system/prompts/page.tsx`
- Create: `app/api/admin/prompts/[id]/route.ts`

- [ ] **Step 1: Create prompts update API route**

```typescript
// app/api/admin/prompts/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/client"
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = await verifySessionToken(token)
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { is_active, is_default } = body

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (is_active !== undefined) update.is_active = is_active
  if (is_default !== undefined) update.is_default = is_default

  const { error } = await supabaseAdmin.from("system_prompts").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  auditLog("prompt.update", { adminId: admin.sub, promptId: id, changes: update })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Create the prompts management page**

```tsx
// app/dashboard/system/prompts/page.tsx
import { supabaseAdmin } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"

export default async function PromptsPage() {
  const { data: prompts } = await supabaseAdmin
    .from("system_prompts")
    .select("id, type, name, description, version, is_active, is_default, updated_at")
    .order("name")

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>System Prompts ({prompts?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!prompts?.length ? (
            <EmptyState title="No prompts" description="No system prompts configured." />
          ) : (
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
                {prompts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{String(p.type)}</TableCell>
                    <TableCell>v{p.version}</TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? "default" : "secondary"}>
                        {p.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.is_default && <Badge variant="outline">Default</Badge>}
                    </TableCell>
                    <TableCell>
                      {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/system/prompts/page.tsx app/api/admin/prompts/\[id\]/route.ts
git commit -m "feat: add prompts management page and update API"
```

---

### Task 29: Build Feature Flags page (with DB migration)

**Files:**
- Create: `app/dashboard/system/flags/page.tsx`
- Create: `app/api/admin/flags/route.ts`
- Create: `app/api/admin/flags/[id]/route.ts`

- [ ] **Step 1: Create feature_flags table via Supabase migration**

Run via Supabase MCP `apply_migration`:

```sql
CREATE TABLE feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  enabled boolean DEFAULT false,
  user_overrides jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Create flags API routes**

```typescript
// app/api/admin/flags/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/client"
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const admin = await verifySessionToken(token)
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabaseAdmin.from("feature_flags").select("*").order("name")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const admin = await verifySessionToken(token)
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { name, description } = body

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from("feature_flags")
    .insert({ name, description })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  auditLog("flag.create", { adminId: admin.sub, flagId: data.id, name })
  return NextResponse.json(data, { status: 201 })
}
```

```typescript
// app/api/admin/flags/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/client"
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const admin = await verifySessionToken(token)
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const { error } = await supabaseAdmin
    .from("feature_flags")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  auditLog("flag.update", { adminId: admin.sub, flagId: id, changes: body })
  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const admin = await verifySessionToken(token)
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { error } = await supabaseAdmin.from("feature_flags").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  auditLog("flag.delete", { adminId: admin.sub, flagId: id })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Create the feature flags page (client component for interactivity)**

```tsx
// app/dashboard/system/flags/page.tsx
import { supabaseAdmin } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FlagsManager } from "./flags-manager"

export default async function FeatureFlagsPage() {
  const { data: flags } = await supabaseAdmin
    .from("feature_flags")
    .select("*")
    .order("name")

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>Toggle features globally or per-user</CardDescription>
        </CardHeader>
        <CardContent>
          <FlagsManager initialFlags={flags || []} />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Create the flags manager client component**

```tsx
// app/dashboard/system/flags/flags-manager.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { EmptyState } from "@/components/empty-state"

interface Flag {
  id: string
  name: string
  description: string | null
  enabled: boolean
  created_at: string
}

export function FlagsManager({ initialFlags }: { initialFlags: Flag[] }) {
  const router = useRouter()
  const [flags, setFlags] = useState(initialFlags)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")

  async function createFlag() {
    if (!newName.trim()) return
    const res = await fetch("/api/admin/flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error || "Failed to create flag")
      return
    }
    toast.success("Flag created")
    setNewName("")
    setNewDesc("")
    router.refresh()
  }

  async function toggleFlag(id: string, enabled: boolean) {
    const res = await fetch(`/api/admin/flags/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    })
    if (!res.ok) {
      toast.error("Failed to update flag")
      return
    }
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, enabled } : f)))
    toast.success(`Flag ${enabled ? "enabled" : "disabled"}`)
  }

  async function deleteFlag(id: string) {
    const res = await fetch(`/api/admin/flags/${id}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error("Failed to delete flag")
      return
    }
    setFlags((prev) => prev.filter((f) => f.id !== id))
    toast.success("Flag deleted")
  }

  return (
    <div className="space-y-6">
      {/* Create new flag */}
      <div className="flex items-end gap-4 rounded-lg border p-4">
        <div className="flex-1 space-y-1">
          <Label htmlFor="flag-name">Name</Label>
          <Input
            id="flag-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g., enable_carousel_v2"
          />
        </div>
        <div className="flex-1 space-y-1">
          <Label htmlFor="flag-desc">Description</Label>
          <Input
            id="flag-desc"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Optional description"
          />
        </div>
        <Button onClick={createFlag}>Add Flag</Button>
      </div>

      {/* Flags list */}
      {flags.length === 0 ? (
        <EmptyState title="No feature flags" description="Create your first feature flag above." />
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => (
            <div
              key={flag.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={flag.enabled}
                  onCheckedChange={(checked) => toggleFlag(flag.id, !!checked)}
                />
                <div>
                  <p className="font-medium font-mono text-sm">{flag.name}</p>
                  {flag.description && (
                    <p className="text-sm text-muted-foreground">{flag.description}</p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => deleteFlag(flag.id)}>
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/system/flags/ app/api/admin/flags/
git commit -m "feat: add feature flags page with CRUD operations"
```

---

## Chunk 7: Review Fixes — Missing Features from Spec

### Task 30: Add suspend/unsuspend to user APIs and UI

**Files:**
- Modify: `app/api/admin/users/[id]/route.ts`
- Modify: `app/dashboard/users/[id]/user-actions.tsx`

The spec requires suspend/unsuspend user actions. Since Supabase Auth supports banning users, we'll use `supabase.auth.admin.updateUserById()` with `ban_duration`.

- [ ] **Step 1: Add PATCH handler to user API route**

Add to `app/api/admin/users/[id]/route.ts`:

```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const admin = await verifySessionToken(token)
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { action } = await request.json()

  if (action === "suspend") {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      ban_duration: "876000h", // ~100 years
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    auditLog("user.suspend" as any, { adminId: admin.sub, targetUserId: id })
  } else if (action === "unsuspend") {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      ban_duration: "none",
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    auditLog("user.unsuspend" as any, { adminId: admin.sub, targetUserId: id })
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Update UserActions component to include suspend button**

Add suspend/unsuspend button alongside the delete button in `user-actions.tsx`. Use a simple `Button` that calls `PATCH /api/admin/users/[id]` with `{ action: "suspend" }` or `{ action: "unsuspend" }`.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/users/\[id\]/route.ts app/dashboard/users/\[id\]/user-actions.tsx
git commit -m "feat: add suspend/unsuspend user action"
```

---

### Task 31: Add dashboard overview charts (signups + token cost)

**Files:**
- Create: `components/signups-chart.tsx`
- Create: `components/token-cost-chart.tsx`
- Modify: `app/dashboard/page.tsx`

The spec requires two charts: user signups area chart (7d/30d/90d) and token cost bar chart (stacked by model).

- [ ] **Step 1: Create signups chart component**

```tsx
// components/signups-chart.tsx
"use client"

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import {
  Card, CardAction, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useState } from "react"

const chartConfig = {
  signups: { label: "Signups", color: "var(--primary)" },
} satisfies ChartConfig

interface SignupsChartProps {
  data: { date: string; signups: number }[]
}

export function SignupsChart({ data }: SignupsChartProps) {
  const [range, setRange] = useState("90d")

  const filtered = data.filter((item) => {
    const date = new Date(item.date)
    const now = new Date()
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    return date >= start
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>User Signups</CardTitle>
        <CardAction>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-36" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={filtered}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            />
            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
            <Area dataKey="signups" type="natural" fill="var(--color-signups)" fillOpacity={0.2} stroke="var(--color-signups)" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create token cost chart component**

```tsx
// components/token-cost-chart.tsx
"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  cost: { label: "Cost ($)", color: "var(--primary)" },
} satisfies ChartConfig

interface TokenCostChartProps {
  data: { date: string; cost: number }[]
}

export function TokenCostChart({ data }: TokenCostChartProps) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Daily Token Cost</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="cost" fill="var(--color-cost)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Update dashboard page to include charts**

Add to `app/dashboard/page.tsx`:

1. Add a `getSignupsData()` function that queries `profiles.created_at` for the last 90 days, groups by day.
2. Add a `getTokenCostData()` function that queries `prompt_usage_logs` grouped by day.
3. Add the charts between the metric cards and the activity/health panels:

```tsx
{/* Charts */}
<div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
  <SignupsChart data={signupsData} />
  <TokenCostChart data={tokenCostData} />
</div>
```

- [ ] **Step 4: Commit**

```bash
git add components/signups-chart.tsx components/token-cost-chart.tsx app/dashboard/page.tsx
git commit -m "feat: add signups and token cost charts to dashboard overview"
```

---

### Task 32: Fix dashboard Posts Published to include my_posts

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Add my_posts count to the overview metrics**

In `getOverviewMetrics()`, add:

```typescript
const { count: myPostsCount } = await supabaseAdmin
  .from("my_posts")
  .select("*", { count: "exact", head: true })
```

Update the Posts Published metric card to show `(postsPublished ?? 0) + (myPostsCount ?? 0)`.

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "fix: include my_posts in posts published count"
```

---

### Task 33: Add search and filters to Users page

**Files:**
- Modify: `app/dashboard/users/page.tsx`

- [ ] **Step 1: Convert to use searchParams for filtering**

The users page should accept URL search params: `?search=&onboarding=&linkedin=&team=`. Since this is a server component, read `searchParams` from the page props and filter the Supabase query accordingly.

Add filter UI as a row of `<Select>` and `<Input>` components above the table. Since these need interactivity, create a small `users-filters.tsx` client component that updates URL search params via `router.push`.

```tsx
// Key patterns:
// - Server component reads searchParams and applies to Supabase query
// - Client component for filter controls that updates URL
// - supabaseAdmin.from("profiles").ilike("full_name", `%${search}%`) for search
// - .eq("onboarding_completed", true) for onboarding filter
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/users/
git commit -m "feat: add search and filters to users page"
```

---

### Task 34: Fix User Detail to include my_posts and token chart

**Files:**
- Modify: `app/dashboard/users/[id]/page.tsx`

- [ ] **Step 1: Add my_posts query**

Add to `getUserData()`:

```typescript
const myPosts = await supabaseAdmin
  .from("my_posts")
  .select("*", { count: "exact", head: true })
  .eq("user_id", id)
```

Add a "Posts Published" MetricCard showing `myPosts.count`.

- [ ] **Step 2: Add a simple token usage chart**

Create a small client component that takes the token usage data and renders a Recharts BarChart grouped by feature:

```tsx
// app/dashboard/users/[id]/user-token-chart.tsx
"use client"
// ... BarChart showing tokens by feature
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/users/\[id\]/
git commit -m "feat: add posts published and token chart to user detail"
```

---

### Task 35: Fix Token Usage analytics to use Recharts

**Files:**
- Modify: `app/dashboard/analytics/tokens/page.tsx`

- [ ] **Step 1: Replace text lists with actual Recharts charts**

Create these as client components that receive data as props:

1. **Daily cost trend** — `AreaChart` with 7d/30d/90d filter (same pattern as SignupsChart)
2. **Cost by model** — `PieChart` from Recharts using `Pie` + `Cell` components
3. **Cost by feature** — horizontal `BarChart`
4. **Avg response time** — `LineChart` from `prompt_usage_logs.response_time_ms` grouped by day

Server component fetches all data and passes to these client chart components.

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/analytics/tokens/
git commit -m "feat: replace token analytics text lists with Recharts charts"
```

---

### Task 36: Create PostHog API client and add metric cards

**Files:**
- Create: `lib/posthog.ts`
- Modify: `app/dashboard/analytics/posthog/page.tsx`

- [ ] **Step 1: Create PostHog API client**

```typescript
// lib/posthog.ts
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID
const POSTHOG_HOST = "https://app.posthog.com" // or eu.posthog.com

export async function posthogQuery(query: string): Promise<unknown> {
  if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) return null

  const res = await fetch(
    `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${POSTHOG_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      next: { revalidate: 300 }, // cache for 5 minutes
    }
  )

  if (!res.ok) return null
  return res.json()
}
```

- [ ] **Step 2: Update PostHog page to include API-driven metric cards**

Make `app/dashboard/analytics/posthog/page.tsx` a server component that:
1. Calls `posthogQuery()` to fetch DAU/WAU/MAU counts
2. Shows metric cards at top (or "PostHog not configured" empty state if no API key)
3. Shows iframe embed below

- [ ] **Step 3: Commit**

```bash
git add lib/posthog.ts app/dashboard/analytics/posthog/page.tsx
git commit -m "feat: add PostHog API client and metric cards"
```

---

### Task 37: Fix Settings page env var access and add missing features

**Files:**
- Rewrite: `app/dashboard/settings/page.tsx`

- [ ] **Step 1: Split into server + client components**

The settings page must be a **server component** that reads env vars and passes them as props to a client component for the password form. Create:

```tsx
// app/dashboard/settings/page.tsx (server component — NO "use client")
import { SettingsClient } from "./settings-client"

export default function SettingsPage() {
  const envStatus = {
    supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    posthogDashboard: !!process.env.POSTHOG_DASHBOARD_URL,
    posthogApi: !!process.env.POSTHOG_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
  }

  return <SettingsClient envStatus={envStatus} />
}
```

```tsx
// app/dashboard/settings/settings-client.tsx
"use client"
// ... password change form + env status display (receives envStatus as props)
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/settings/
git commit -m "fix: settings page env var access and add config status"
```

---

### Task 38: Fix Moderation page to include scheduled posts and search

**Files:**
- Modify: `app/dashboard/content/moderation/page.tsx`

- [ ] **Step 1: Query both generated_posts and scheduled_posts**

Merge both queries, sort by created_at descending. Add a `type` badge ("generated" vs "scheduled") to distinguish.

- [ ] **Step 2: Add search via searchParams**

Accept `?search=` URL param. Use `.ilike("content", `%${search}%`)` on both queries. Add a search input client component that updates URL params.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/content/moderation/
git commit -m "feat: add scheduled posts and search to moderation page"
```

---

### Task 39: Add delete actions to Generated Posts and Templates pages

**Files:**
- Modify: `app/dashboard/content/generated/page.tsx`
- Modify: `app/dashboard/content/templates/page.tsx`

- [ ] **Step 1: Add delete buttons**

For each row, add a delete button in the Actions column. Create small client-component action cells that call `DELETE /api/admin/content/[id]?table=generated_posts` (or `templates`).

- [ ] **Step 2: Add expandable row or drawer for full content**

Use the existing `Drawer` component (from `vaul`) or a `Sheet` component to show full post content when clicking a row.

- [ ] **Step 3: Update the content delete API to support templates**

Add `"templates"` to the allowed table list in `app/api/admin/content/[id]/route.ts`.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/content/ app/api/admin/content/
git commit -m "feat: add delete and expand actions to content pages"
```

---

### Task 40: Add basic pagination to all table pages

**Files:**
- Create: `components/pagination-controls.tsx`
- Modify: All table pages to use searchParams for `page` and `pageSize`

- [ ] **Step 1: Create reusable pagination component**

```tsx
// components/pagination-controls.tsx
"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PaginationControlsProps {
  totalCount: number
  pageSize: number
  currentPage: number
}

export function PaginationControls({ totalCount, pageSize, currentPage }: PaginationControlsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const totalPages = Math.ceil(totalCount / pageSize)

  function navigate(page: number, size?: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(page))
    if (size) params.set("pageSize", String(size))
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex items-center justify-between pt-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Rows per page</span>
        <Select value={String(pageSize)} onValueChange={(v) => navigate(1, Number(v))}>
          <SelectTrigger className="w-16" size="sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
        <span>
          {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
        </span>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => navigate(currentPage - 1)}>
          Previous
        </Button>
        <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => navigate(currentPage + 1)}>
          Next
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update all table pages to read `page` and `pageSize` from searchParams**

In each table server component:

```typescript
const page = Number(searchParams?.page) || 1
const pageSize = Number(searchParams?.pageSize) || 20
const from = (page - 1) * pageSize
const to = from + pageSize - 1

const { data, count } = await supabaseAdmin
  .from("table")
  .select("...", { count: "exact" })
  .range(from, to)
```

Add `<PaginationControls totalCount={count} pageSize={pageSize} currentPage={page} />` below each table.

Apply to: Users, Generated Posts, Scheduled Posts, Templates, Moderation, Token Usage per-user table, Background Jobs tables.

- [ ] **Step 3: Commit**

```bash
git add components/pagination-controls.tsx app/dashboard/
git commit -m "feat: add server-side pagination to all table pages"
```

---

### Task 41: Enhance Prompts Management with detail view and editing

**Files:**
- Modify: `app/dashboard/system/prompts/page.tsx`
- Create: `app/dashboard/system/prompts/[id]/page.tsx`

- [ ] **Step 1: Make prompt names clickable to a detail page**

In the prompts table, wrap the name column in `<a href={`/dashboard/system/prompts/${p.id}`}>`.

- [ ] **Step 2: Create prompt detail page**

```tsx
// app/dashboard/system/prompts/[id]/page.tsx
// Server component that fetches:
// - system_prompts row by id (full content, variables)
// - prompt_versions for this prompt_id
// - prompt_usage_logs for this prompt_id (aggregated stats)
// - prompt_test_results for this prompt_id
//
// Renders:
// 1. Prompt header: name, type, version, active/default badges
// 2. Full prompt content in a <pre> block
// 3. Variables list
// 4. Toggle active/default buttons (client component calling PUT /api/admin/prompts/[id])
// 5. Version history table: version, change_notes, created_at
// 6. Usage stats: total uses, avg tokens, avg cost
// 7. Test results table: model, tokens_used, rating, created_at
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/system/prompts/
git commit -m "feat: add prompt detail page with version history and test results"
```

---

### Task 42: Add error handling to Feature Usage page

**Files:**
- Modify: `app/dashboard/analytics/features/page.tsx`

- [ ] **Step 1: Wrap each table count query in try/catch**

Replace the `Promise.all` in `getFeatureUsage()` with individual try/catch blocks so that if a table doesn't exist, it returns 0 instead of crashing the page.

```typescript
async function safeCount(table: string): Promise<{ count: number; users: number }> {
  try {
    const { count } = await supabaseAdmin.from(table).select("*", { count: "exact", head: true })
    const { data } = await supabaseAdmin.from(table).select("user_id")
    return {
      count: count ?? 0,
      users: new Set(data?.map((u: { user_id: string }) => u.user_id)).size,
    }
  } catch {
    return { count: 0, users: 0 }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/analytics/features/page.tsx
git commit -m "fix: add error handling for missing tables in feature usage"
```

---

## Chunk 8: Settings, Cleanup, and Final Verification

### Task 43: Clean up unused scaffold files

**Files:**
- Delete or modify files that are no longer used

- [ ] **Step 1: Remove old scaffold components no longer needed**

The following files contained placeholder/demo data and are now replaced:
- `components/data-table.tsx` — was demo table with drag-and-drop, not used in admin
- `components/nav-documents.tsx` — sidebar document nav, replaced
- `components/nav-secondary.tsx` — sidebar secondary nav, replaced
- `components/nav-user.tsx` — sidebar user menu, replaced by logout button
- `components/nav-main.tsx` — sidebar main nav, replaced
- `components/chart-area-interactive.tsx` — demo chart, replaced by real data
- `components/section-cards.tsx` — hardcoded cards, replaced by MetricCard
- `app/dashboard/data.json` — demo table data

Remove them:

```bash
rm components/data-table.tsx components/nav-documents.tsx components/nav-secondary.tsx components/nav-user.tsx components/nav-main.tsx components/chart-area-interactive.tsx components/section-cards.tsx app/dashboard/data.json
```

- [ ] **Step 2: Update root page to redirect to /dashboard**

Replace `app/page.tsx`:

```tsx
// app/page.tsx
import { redirect } from "next/navigation"

export default function Home() {
  redirect("/login")
}
```

- [ ] **Step 3: Update root layout metadata**

In `app/layout.tsx`, change the metadata:

```tsx
export const metadata: Metadata = {
  title: "ChainLinked Admin",
  description: "Admin dashboard for ChainLinked",
}
```

- [ ] **Step 4: Verify the app builds**

```bash
npm run build
```

Fix any TypeScript or import errors that arise from the cleanup.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: clean up scaffold files and update metadata"
```

---

### Task 44: Final verification

- [ ] **Step 1: Run dev server and test all pages**

```bash
npm run dev
```

Walk through each page:
1. `/login` — Login form renders
2. `/dashboard` — Metric cards show real data
3. `/dashboard/users` — Users table populated
4. `/dashboard/users/[id]` — User detail loads
5. `/dashboard/users/onboarding` — Funnel renders
6. `/dashboard/content/generated` — Posts table
7. `/dashboard/content/scheduled` — Scheduled posts
8. `/dashboard/content/templates` — Templates table
9. `/dashboard/content/moderation` — Moderation queue
10. `/dashboard/analytics/tokens` — Token analytics
11. `/dashboard/analytics/features` — Feature matrix
12. `/dashboard/analytics/posthog` — PostHog embed or empty state
13. `/dashboard/system/jobs` — Jobs monitor
14. `/dashboard/system/prompts` — Prompts table
15. `/dashboard/system/flags` — Feature flags CRUD
16. `/dashboard/settings` — Settings form

- [ ] **Step 2: Run build to ensure no errors**

```bash
npm run build
```

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete ChainLinked admin panel implementation"
```
