# Theme Sync + PostHog + OpenRouter Integration — Design Spec

## Overview

Align the admin panel's visual theme with the main ChainLinked app, add PostHog tracking to both apps, and integrate OpenRouter's balance API into the admin panel.

## Part 1: Theme Sync (Admin Panel Only)

### Colors
Replace the admin panel's monochrome neutral CSS custom properties with the ChainLinked color system from `/Volumes/Crucial X9/AgiNotReady/ChainLinked/app/globals.css`:

- **Primary:** LinkedIn Blue `oklch(0.47 0.13 230)` (was: `oklch(0.205 0 0)`)
- **Secondary:** Terracotta `oklch(0.65 0.12 45)` (was: same as accent)
- **Background:** Warm neutral `oklch(0.965 0.008 90)` (was: pure white)
- **Card:** `oklch(0.995 0.002 90)` (was: pure white)
- **Border:** `oklch(0.87 0.012 90)` (was: `oklch(0.922 0 0)`)
- **Muted foreground:** `oklch(0.45 0.01 90)` (was: `oklch(0.556 0 0)`)
- **Destructive:** `oklch(0.55 0.18 25)` (was: `oklch(0.577 0.245 27.325)`)
- **Success:** `oklch(0.45 0.1 145)` (new)
- **Warning:** `oklch(0.65 0.15 85)` (new)

Copy the full color system including: primary scale (50-900), secondary scale, sidebar colors, chart colors (5 branded colors), and all dark mode overrides.

Add custom shadow variables: `--shadow-xs` through `--shadow-xl`, `--shadow-primary`, `--shadow-secondary`.

Add animation timing: `--ease-smooth`, `--ease-bounce`, `--ease-in-out`, `--duration-fast/normal/slow/entrance`.

### Border Radius
Change `--radius` from `0.625rem` to `0.75rem`. Update derived values:
- `--radius-sm: calc(var(--radius) - 4px)`
- `--radius-md: calc(var(--radius) - 2px)`
- `--radius-lg: var(--radius)`
- `--radius-xl` through `--radius-4xl`: additive `+4px` increments

### Font
Revert from Inter/JetBrains_Mono back to Geist/Geist_Mono to match main app:
- `app/layout.tsx`: Import `Geist, Geist_Mono` from `next/font/google`
- CSS variables: `--font-geist-sans`, `--font-geist-mono`
- `globals.css`: `--font-sans: var(--font-geist-sans)`, `--font-mono: var(--font-geist-mono)`

### Logo
- Copy `logo.png`, `logo-icon.svg`, `logo-icon.png` from ChainLinked `/public/` to admin `/public/`
- Update `components/app-sidebar.tsx`: replace `<LinkIcon>` with `<Image src="/logo.png" alt="ChainLinked" width={20} height={20} className="size-5 rounded-sm object-contain" />`
- Update `app/login/page.tsx`: add logo above the login form

### Spacing
The main app uses `p-4 md:p-6` and `gap-4 md:gap-6` consistently. Admin pages currently use `px-4 lg:px-6` with various gap values. Standardize to match the main app pattern.

### Files Modified
- `app/globals.css` — full CSS custom property replacement
- `app/layout.tsx` — font change back to Geist
- `components/app-sidebar.tsx` — logo image
- `app/login/page.tsx` — add logo
- `public/logo.png`, `public/logo-icon.svg`, `public/logo-icon.png` — copy from main app

## Part 2: PostHog Setup

### Main ChainLinked App (minimal changes)
The app already has complete PostHog integration code:
- `components/posthog-provider.tsx` — Provider with init, session replay, network recording
- `components/providers.tsx` — Provider wrapping
- `hooks/use-posthog.ts` — Hook with capture, featureFlags, sessionReplay, performance tracking
- `lib/analytics.ts` — 30+ custom events

**Only needed:** Set the env vars in `.env.local`:
```
NEXT_PUBLIC_POSTHOG_KEY=<user's key>
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### Admin Panel (new integration)

**Install:** `posthog-js` package

**Create:** `components/posthog-provider.tsx`
- "use client" component
- Init posthog-js with `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST`
- `capture_pageview: false` (manual SPA tracking)
- `autocapture: true`
- `disable_session_recording: true` (not needed for admin)
- Manual pageview tracking on route changes via `usePathname`

**Modify:** `app/layout.tsx`
- Wrap `{children}` with `<PostHogProvider>`

**Create:** `lib/analytics.ts`
- `trackAdminEvent(name, properties)` helper
- Events: `admin_login`, `admin_logout`, `admin_user_delete`, `admin_user_suspend`, `admin_content_delete`, `admin_flag_toggle`, `admin_prompt_update`

**Modify:** Existing API routes to call `trackAdminEvent` where relevant (login, user actions, content actions)

**Modify:** `app/dashboard/analytics/posthog/page.tsx`
- Use `lib/posthog.ts` server-side client to query PostHog API for DAU/WAU/MAU
- Display as MetricCards above the iframe embed

**Env vars (admin `.env.local`):**
```
NEXT_PUBLIC_POSTHOG_KEY=<same key as main app>
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Both apps share the same PostHog project so all data appears in one dashboard.

## Part 3: OpenRouter Balance API (Admin Panel)

**Create:** `lib/openrouter.ts`
```typescript
// Calls GET https://openrouter.ai/api/v1/auth/key
// Returns: { usage, limit, is_free_tier, rate_limit }
```

**Modify:** `app/dashboard/analytics/tokens/page.tsx`
- Add a "OpenRouter Account" card at the top showing:
  - Account balance / remaining credits
  - Usage this period
  - Rate limit info
  - Free tier indicator
- Falls back gracefully if `OPENROUTER_API_KEY` is not set

**Env var:** `OPENROUTER_API_KEY` (already in `.env.local`)

## Out of Scope
- Dark mode toggle in admin (can add later)
- Custom PostHog dashboards (uses existing shared dashboard)
- OpenRouter model management from admin
- Modifying the main app's PostHog event code (already comprehensive)
