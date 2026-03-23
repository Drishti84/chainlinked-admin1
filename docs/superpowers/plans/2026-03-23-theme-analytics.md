# Theme Sync + PostHog + OpenRouter Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align admin panel theme with ChainLinked's LinkedIn Blue + Terracotta design system, add PostHog tracking to both apps, and show OpenRouter account balance in admin.

**Architecture:** Copy the full CSS custom property set from ChainLinked to admin panel. Add posthog-js client-side tracking in admin. Use OpenRouter's `/api/v1/auth/key` endpoint for balance display.

**Tech Stack:** Tailwind CSS v4, posthog-js, posthog-js/react, OpenRouter REST API

**Spec:** `docs/superpowers/specs/2026-03-23-theme-analytics-design.md`

**Two projects involved:**
- Admin panel: `/Volumes/Crucial X9/AgiNotReady/chainlinked-admin`
- Main app: `/Volumes/Crucial X9/AgiNotReady/ChainLinked`

---

## Chunk 1: Theme Sync

### Task 1: Replace admin globals.css with ChainLinked theme

**Files:**
- Modify: `/Volumes/Crucial X9/AgiNotReady/chainlinked-admin/app/globals.css`

- [ ] **Step 1: Replace the entire globals.css**

Copy the FULL contents of `/Volumes/Crucial X9/AgiNotReady/ChainLinked/app/globals.css` to the admin panel's `app/globals.css`, but:
1. Keep the `@import "shadcn/tailwind.css";` line (ChainLinked doesn't have this — admin needs it for shadcn)
2. Keep the `@custom-variant dark (&:is(.dark *));` line
3. Add `--font-heading: var(--font-geist-sans);` to the `@theme inline` block (used by admin's shadcn components)

The final file should start with:
```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-geist-sans);
  /* ... rest of the theme inline mappings from ChainLinked ... */
  /* IMPORTANT: Include --color-success, --color-success-foreground, --color-warning, --color-warning-foreground, --color-destructive-foreground mappings */
}
```

Then include ALL `:root { ... }` and `.dark { ... }` blocks from ChainLinked including:
- Primary scale (50-900)
- Secondary scale (50-900)
- All semantic colors (success, warning, destructive with foregrounds)
- All shadows
- All animation timing vars
- All sidebar colors
- All chart colors

Then include ALL `@layer base`, `@layer utilities`, and `@keyframes` sections from ChainLinked.

- [ ] **Step 2: Verify no build errors**

```bash
cd "/Volumes/Crucial X9/AgiNotReady/chainlinked-admin" && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: sync admin theme with ChainLinked design system"
```

---

### Task 2: Revert font from Inter back to Geist

**Files:**
- Modify: `/Volumes/Crucial X9/AgiNotReady/chainlinked-admin/app/layout.tsx`

- [ ] **Step 1: Read the current layout.tsx, then change fonts**

Replace the font imports:
```tsx
// FROM:
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});
```

```tsx
// TO:
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

Update the className on `<html>`:
```tsx
// FROM:
className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
// TO:
className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
```

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: revert to Geist font to match ChainLinked"
```

---

### Task 3: Copy logo files and update sidebar

**Files:**
- Copy: `logo.png`, `logo-icon.svg`, `logo-icon.png` from ChainLinked `/public/` to admin `/public/`
- Modify: `/Volumes/Crucial X9/AgiNotReady/chainlinked-admin/components/app-sidebar.tsx`

- [ ] **Step 1: Copy logo files**

```bash
cp "/Volumes/Crucial X9/AgiNotReady/ChainLinked/public/logo.png" "/Volumes/Crucial X9/AgiNotReady/chainlinked-admin/public/logo.png"
cp "/Volumes/Crucial X9/AgiNotReady/ChainLinked/public/logo-icon.svg" "/Volumes/Crucial X9/AgiNotReady/chainlinked-admin/public/logo-icon.svg"
cp "/Volumes/Crucial X9/AgiNotReady/ChainLinked/public/logo-icon.png" "/Volumes/Crucial X9/AgiNotReady/chainlinked-admin/public/logo-icon.png"
```

- [ ] **Step 2: Update sidebar to use logo image**

Read `components/app-sidebar.tsx`. Find the `SidebarHeader` section and replace:

```tsx
// FROM:
import { LinkIcon, ... } from "lucide-react"
// ...
<a href="/dashboard">
  <LinkIcon className="size-5!" />
  <span className="text-base font-semibold">ChainLinked Admin</span>
</a>
```

```tsx
// TO:
import Image from "next/image"
// ... (remove LinkIcon from lucide imports if no longer used)
<a href="/dashboard">
  <Image src="/logo.png" alt="ChainLinked" width={20} height={20} className="size-5 rounded-sm object-contain" />
  <span className="text-base font-semibold">ChainLinked Admin</span>
</a>
```

- [ ] **Step 3: Update login page to show logo**

Read `app/login/page.tsx`. Add logo above the LoginForm:

```tsx
import Image from "next/image"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <Image src="/logo.png" alt="ChainLinked" width={48} height={48} className="rounded-lg" />
      <LoginForm />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add public/logo.png public/logo-icon.svg public/logo-icon.png components/app-sidebar.tsx app/login/page.tsx
git commit -m "feat: add ChainLinked logo to sidebar and login page"
```

---

## Chunk 2: PostHog Integration

### Task 4: Install posthog-js in admin panel

**Files:**
- Modify: `/Volumes/Crucial X9/AgiNotReady/chainlinked-admin/package.json`

- [ ] **Step 1: Install posthog packages**

```bash
cd "/Volumes/Crucial X9/AgiNotReady/chainlinked-admin"
npm install posthog-js
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add posthog-js dependency"
```

---

### Task 5: Create PostHog provider for admin panel

**Files:**
- Create: `/Volumes/Crucial X9/AgiNotReady/chainlinked-admin/components/posthog-provider.tsx`

- [ ] **Step 1: Create the provider**

```tsx
// components/posthog-provider.tsx
"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import posthog from "posthog-js"
import { PostHogProvider as PostHogProviderBase } from "posthog-js/react"

interface PostHogProviderProps {
  children: React.ReactNode
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const [isReady, setIsReady] = useState(false)
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"

  useEffect(() => {
    if (!apiKey) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[PostHog] NEXT_PUBLIC_POSTHOG_KEY not set — analytics disabled")
      }
      return
    }

    if (posthog.__loaded) {
      setIsReady(true)
      return
    }

    posthog.init(apiKey, {
      api_host: apiHost,
      ui_host: "https://us.posthog.com",
      autocapture: true,
      capture_pageview: false,
      capture_pageleave: true,
      disable_session_recording: true,
      persistence: "localStorage+cookie",
      debug: process.env.NODE_ENV === "development",
    })

    setIsReady(true)
  }, [apiKey, apiHost])

  return (
    <PostHogProviderBase client={posthog}>
      {isReady ? (
        <Suspense fallback={null}>
          <PostHogPageview />
        </Suspense>
      ) : null}
      {children}
    </PostHogProviderBase>
  )
}

function PostHogPageview(): null {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const url = useMemo(() => {
    const search = searchParams?.toString()
    return search ? `${pathname}?${search}` : pathname
  }, [pathname, searchParams])

  const section = useMemo(() => {
    if (!pathname) return null
    const match = pathname.match(/^\/dashboard\/(.+?)(?:\/|$)/)
    return match ? match[1] : pathname === "/dashboard" ? "overview" : null
  }, [pathname])

  useEffect(() => {
    posthog.capture("$pageview", {
      $current_url: url,
      page_title: typeof document !== "undefined" ? document.title : undefined,
      admin_section: section,
      app: "admin",
    })
  }, [url, section])

  return null
}
```

- [ ] **Step 2: Commit**

```bash
git add components/posthog-provider.tsx
git commit -m "feat: add PostHog provider for admin panel"
```

---

### Task 6: Create admin analytics helper

**Files:**
- Create: `/Volumes/Crucial X9/AgiNotReady/chainlinked-admin/lib/analytics.ts`

- [ ] **Step 1: Create the helper**

```typescript
// lib/analytics.ts
import posthog from "posthog-js"

type AdminEvent =
  | "admin_login"
  | "admin_logout"
  | "admin_user_delete"
  | "admin_user_suspend"
  | "admin_user_unsuspend"
  | "admin_content_delete"
  | "admin_flag_toggle"
  | "admin_flag_create"
  | "admin_flag_delete"
  | "admin_prompt_update"

export function trackAdminEvent(
  event: AdminEvent,
  properties?: Record<string, unknown>
) {
  try {
    if (typeof window !== "undefined" && posthog.__loaded) {
      posthog.capture(event, { app: "admin", ...properties })
    }
  } catch {
    // Silently fail — analytics should never break the app
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/analytics.ts
git commit -m "feat: add admin event tracking helper"
```

---

### Task 7: Wrap admin layout with PostHog provider

**Files:**
- Modify: `/Volumes/Crucial X9/AgiNotReady/chainlinked-admin/app/layout.tsx`

- [ ] **Step 1: Read layout.tsx, add PostHogProvider**

Add import and wrap `{children}`:

```tsx
import { PostHogProvider } from "@/components/posthog-provider"
```

Wrap the body contents:
```tsx
<body className="min-h-full flex flex-col">
  <PostHogProvider>
    {children}
  </PostHogProvider>
</body>
```

- [ ] **Step 2: Add NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_POSTHOG_HOST to .env.local**

Read `.env.local`. Add these two lines (the user will provide their actual key):

```
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: wrap admin layout with PostHog provider"
```

---

### Task 8: Set PostHog env vars in main ChainLinked app

**Files:**
- Modify: `/Volumes/Crucial X9/AgiNotReady/ChainLinked/.env.local`

- [ ] **Step 1: Read the current .env.local**

Check if `NEXT_PUBLIC_POSTHOG_KEY` is already present but empty. If so, leave it — the user will fill in their key.

This task is informational — the main app already has all PostHog code. It just needs the env vars populated by the user.

- [ ] **Step 2: No commit needed — .env.local is gitignored**

---

## Chunk 3: OpenRouter Balance API

### Task 9: Create OpenRouter API client

**Files:**
- Create: `/Volumes/Crucial X9/AgiNotReady/chainlinked-admin/lib/openrouter.ts`

- [ ] **Step 1: Create the client**

```typescript
// lib/openrouter.ts

interface OpenRouterKeyInfo {
  usage: number          // credits used
  limit: number | null   // credit limit (null = unlimited)
  is_free_tier: boolean
  rate_limit: {
    requests: number     // requests per interval
    interval: string     // e.g. "10s"
  }
}

export async function getOpenRouterBalance(): Promise<OpenRouterKeyInfo | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 300 },
    })

    if (!res.ok) return null

    const data = await res.json()
    return data.data as OpenRouterKeyInfo
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/openrouter.ts
git commit -m "feat: add OpenRouter balance API client"
```

---

### Task 10: Add OpenRouter balance card to Token Usage page

**Files:**
- Modify: `/Volumes/Crucial X9/AgiNotReady/chainlinked-admin/app/dashboard/analytics/tokens/page.tsx`

- [ ] **Step 1: Read the current page, then add OpenRouter balance**

At the top of the file, add import:
```typescript
import { getOpenRouterBalance } from "@/lib/openrouter"
```

In the page component, call it alongside existing data:
```typescript
const [m, openRouterBalance] = await Promise.all([
  getTokenMetrics(),
  getOpenRouterBalance(),
])
```

Add an "OpenRouter Account" card section at the very top of the page (before the 6 MetricCards), only rendered if `openRouterBalance` is not null:

```tsx
{openRouterBalance && (
  <div className="px-4 lg:px-6">
    <Card>
      <CardHeader>
        <CardTitle>OpenRouter Account</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Credits Used</p>
            <p className="text-xl font-semibold">${openRouterBalance.usage.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Credit Limit</p>
            <p className="text-xl font-semibold">
              {openRouterBalance.limit ? `$${openRouterBalance.limit.toFixed(2)}` : "Unlimited"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tier</p>
            <p className="text-xl font-semibold">
              {openRouterBalance.is_free_tier ? "Free" : "Paid"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Rate Limit</p>
            <p className="text-xl font-semibold">
              {openRouterBalance.rate_limit.requests}/{openRouterBalance.rate_limit.interval}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/analytics/tokens/page.tsx lib/openrouter.ts
git commit -m "feat: show OpenRouter account balance on token usage page"
```

---

## Chunk 4: Build Verification

### Task 11: Verify build and visual check

- [ ] **Step 1: Run build**

```bash
cd "/Volumes/Crucial X9/AgiNotReady/chainlinked-admin" && npm run build
```

Fix any TypeScript errors or missing imports.

- [ ] **Step 2: Start dev server and visual check**

```bash
PORT=3001 npm run dev
```

Check:
1. `/login` — Logo above login form, LinkedIn Blue primary color on button
2. `/dashboard` — Sidebar has logo, cards use warm neutral background
3. `/dashboard/analytics/tokens` — OpenRouter balance card (if key set)
4. All pages — Correct font (Geist), correct border-radius, branded chart colors

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A && git commit -m "fix: resolve build issues from theme sync"
```
