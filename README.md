# ChainLinked Admin

Admin dashboard for **ChainLinked** — a LinkedIn content management platform. Monitor users, AI-generated content, analytics, costs, and system health from a unified panel.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **Auth:** JWT with HTTP-only cookies
- **AI:** OpenRouter API
- **Analytics:** PostHog
- **Error Tracking:** Sentry
- **Charts:** Recharts

## Features

- **Dashboard** — Overview metrics, recent activity, system status
- **User Management** — User list, profiles, onboarding funnel analytics
- **Content Management** — Generated posts, scheduled posts, templates, AI activity logs
- **Analytics** — Token usage, costs, feature adoption, AI model performance, LinkedIn metrics, PostHog embeds
- **System** — Background jobs monitor, Sentry error viewer, feature flags
- **Settings** — Admin password management, environment status

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- (Optional) OpenRouter, PostHog, and Sentry accounts

### Environment Variables

Copy `.env.local.example` or create `.env.local` with:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_JWT_SECRET=your_jwt_secret

# AI (optional)
OPENROUTER_API_KEY=your_openrouter_key

# Analytics (optional)
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_API_KEY=your_posthog_api_key
POSTHOG_PROJECT_ID=your_project_id

# Error Tracking (optional)
SENTRY_API_TOKEN=your_sentry_token
SENTRY_ORG=your_org
SENTRY_PROJECT=your_project
```

> If `ADMIN_JWT_SECRET` is not set, auth is bypassed for local development.

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Create an Admin User

```bash
npx tsx scripts/seed-admin.ts <username> <password>
```

## Project Structure

```
app/
  api/            # Auth & admin API routes
  dashboard/      # All dashboard pages
  login/          # Login page
components/
  ui/             # shadcn/ui components
  charts/         # Recharts wrapper components
lib/
  auth.ts         # JWT + bcrypt authentication
  openrouter.ts   # OpenRouter API client
  posthog.ts      # PostHog API queries
  quality-score.ts # Content quality scoring
  rate-limit.ts   # Rate limiter
  supabase/       # Supabase client
scripts/
  seed-admin.ts   # Admin user seeder
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `npm run lint` | Run ESLint |
