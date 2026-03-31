# ChainLinked Admin Dashboard

<div align="center">

**The command center for ChainLinked** — a comprehensive admin dashboard for managing an AI-powered LinkedIn content platform.

Monitor users, AI-generated content, analytics, costs, and system health from a unified panel.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Dashboard Pages](#dashboard-pages)
- [Workflows](#workflows)
- [Integrations](#integrations)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Documentation](#documentation)

---

## Overview

ChainLinked Admin is a **Next.js 16** admin dashboard built with the App Router, Server Components, and a modern React 19 stack. It serves as the management interface for the ChainLinked platform — an AI-powered LinkedIn content creation and scheduling tool.

The dashboard provides:
- Real-time monitoring of platform metrics and KPIs
- User and team management with full lifecycle controls
- AI content quality analysis and performance tracking
- Cost and token usage analytics across AI models
- System health monitoring with error tracking integration
- Feature flag and sidebar configuration management

```mermaid
graph TB
    subgraph "ChainLinked Ecosystem"
        EXT["Chrome Extension<br/>(Main App)"]
        ADMIN["Admin Dashboard<br/>(This Repo)"]
        DB[(Supabase<br/>PostgreSQL)]
    end

    subgraph "External Services"
        OR["OpenRouter<br/>(GPT-4.1)"]
        PH["PostHog<br/>(Analytics)"]
        SE["Sentry<br/>(Errors)"]
        LI["LinkedIn<br/>(Publishing)"]
    end

    EXT -->|"Creates content,<br/>manages users"| DB
    ADMIN -->|"Monitors &<br/>manages"| DB
    ADMIN --> OR
    ADMIN --> PH
    ADMIN --> SE
    EXT --> LI
    EXT --> OR

    style ADMIN fill:#0077B5,color:#fff,stroke:#005885
    style EXT fill:#f97316,color:#fff,stroke:#c2410c
    style DB fill:#3ECF8E,color:#fff,stroke:#2da572
```

---

## Key Features

### Dashboard & Analytics
| Feature | Description |
|---------|-------------|
| **Overview Dashboard** | 8 KPI cards, activity timeline, system health monitor, onboarding funnel, top users leaderboard |
| **AI Performance** | Model comparison, daily cost/token charts, feature usage heatmap, prompt analytics |
| **Cost Analytics** | Total/MTD/WTD/daily spend, breakdowns by model, feature, and user |
| **Token Usage** | Consumption metrics, cost per token, usage trends |
| **Feature Adoption** | Feature usage metrics and engagement tracking |
| **PostHog Analytics** | Embedded dashboards, session replays, heatmaps |
| **LinkedIn Metrics** | Engagement data and publishing analytics |

### User & Team Management
| Feature | Description |
|---------|-------------|
| **User Management** | Search, filter, sort, CSV export, suspend/delete actions |
| **User Profiles** | Detailed view with posts, templates, tokens, cost breakdown |
| **Onboarding Funnel** | Signup → Onboarded → LinkedIn → Generated → Scheduled |
| **Team Management** | Team listing, member tables, activity breakdown |

### Content Management
| Feature | Description |
|---------|-------------|
| **Generated Posts** | Quality scores, word count, post type, token/cost tracking |
| **Scheduled Posts** | Status tracking (pending/posted/failed), timezone support |
| **Templates** | Categories, public/private, usage counts, copy-to-clipboard |
| **AI Activity** | Request logs, conversation viewer, output inspection |

### System Administration
| Feature | Description |
|---------|-------------|
| **Background Jobs** | Monitor company research, content research, suggestion generation |
| **Error Tracking** | Sentry integration with severity, affected users, timestamps |
| **Sidebar Control** | Drag-and-drop reordering, enable/disable sections |
| **Settings** | Admin profile, password management, environment status |

### Security
| Feature | Description |
|---------|-------------|
| **JWT Authentication** | HTTP-only cookies, 24h expiry, HS256 signing |
| **Rate Limiting** | 5 login attempts per 15 minutes per IP |
| **Audit Logging** | All admin actions logged with timestamps and context |
| **Middleware Protection** | All `/dashboard/*` routes require valid session |
| **Confirmation Dialogs** | Text-input confirmation for destructive actions |

---

## Tech Stack

```mermaid
graph LR
    subgraph "Frontend"
        NEXT["Next.js 16"]
        REACT["React 19"]
        TS["TypeScript 5"]
        TW["Tailwind CSS 4"]
        SHADCN["shadcn/ui"]
        RECHARTS["Recharts"]
        TANSTACK["TanStack Table"]
        DND["@dnd-kit"]
    end

    subgraph "Backend"
        API["API Routes"]
        MW["Middleware"]
        JWT["jose (JWT)"]
        BCRYPT["bcryptjs"]
    end

    subgraph "Services"
        SUPA["Supabase"]
        OPENR["OpenRouter"]
        POSTH["PostHog"]
        SENTR["Sentry"]
    end

    NEXT --> API
    NEXT --> MW
    API --> SUPA
    API --> OPENR
    API --> POSTH
    API --> SENTR

    style NEXT fill:#000,color:#fff
    style REACT fill:#61DAFB,color:#000
    style SUPA fill:#3ECF8E,color:#fff
```

| Category | Technology | Version |
|----------|-----------|---------|
| **Framework** | Next.js (App Router) | 16.2.1 |
| **Language** | TypeScript | 5 |
| **UI Framework** | React | 19.2.4 |
| **Styling** | Tailwind CSS | 4 |
| **Component Library** | shadcn/ui + Radix UI | 4.1.0 / 1.4.3 |
| **Icons** | Lucide React | 0.577.0 |
| **Database** | Supabase (PostgreSQL) | 2.100.0 |
| **Authentication** | jose (JWT) + bcryptjs | 6.2.2 / 3.0.3 |
| **AI Integration** | OpenRouter API | GPT-4.1 |
| **Analytics** | PostHog | 1.363.2 |
| **Error Tracking** | Sentry REST API | - |
| **Charts** | Recharts | 3.8.0 |
| **Data Tables** | TanStack React Table | 8.21.3 |
| **Drag & Drop** | @dnd-kit | 6.3.1 |
| **Validation** | Zod | 4.3.6 |
| **Toast** | Sonner | 2.0.7 |
| **Theme** | next-themes | 0.4.6 |

---

## System Architecture

```mermaid
flowchart TB
    subgraph Browser["Browser"]
        LOGIN["Login Page"]
        DASH["Dashboard Pages"]
    end

    subgraph NextJS["Next.js 16 Application"]
        MW["Middleware<br/>(JWT Validation)"]

        subgraph Pages["Server Components"]
            P1["Dashboard Overview"]
            P2["User Management"]
            P3["Content Management"]
            P4["Analytics Suite"]
            P5["System Admin"]
        end

        subgraph APIRoutes["API Routes"]
            AUTH["Auth<br/>/api/auth/*"]
            ADMIN["Admin<br/>/api/admin/*"]
        end

        subgraph Libraries["Libraries"]
            LIB_AUTH["auth.ts"]
            LIB_RL["rate-limit.ts"]
            LIB_AUDIT["audit.ts"]
            LIB_QS["quality-score.ts"]
            LIB_OR["openrouter.ts"]
            LIB_PH["posthog.ts"]
        end
    end

    subgraph External["External Services"]
        SUPA[(Supabase<br/>PostgreSQL)]
        OPENR["OpenRouter<br/>GPT-4.1"]
        POSTH["PostHog"]
        SENTR["Sentry"]
    end

    LOGIN -->|"POST /api/auth/login"| AUTH
    DASH -->|"HTTP Requests"| MW
    MW -->|"Valid JWT"| Pages
    MW -->|"Invalid"| LOGIN
    Pages --> SUPA
    ADMIN --> SUPA
    ADMIN --> OPENR
    ADMIN --> POSTH
    ADMIN --> SENTR
    AUTH --> LIB_AUTH
    AUTH --> LIB_RL
    ADMIN --> LIB_AUDIT

    style Browser fill:#f8fafc,stroke:#e2e8f0
    style NextJS fill:#fefce8,stroke:#fde047
    style External fill:#f0fdf4,stroke:#86efac
```

---

## Project Structure

```
chainlinked-admin1/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout (ThemeProvider, Toaster)
│   ├── page.tsx                      # Home redirect
│   ├── globals.css                   # Tailwind CSS + design tokens
│   │
│   ├── api/                          # API Route Handlers
│   │   ├── auth/
│   │   │   ├── login/route.ts        # POST - Admin login (JWT + rate limit)
│   │   │   └── logout/route.ts       # POST - Clear session
│   │   └── admin/
│   │       ├── content/
│   │       │   ├── analyze/route.ts  # POST - AI content analysis
│   │       │   └── [id]/route.ts     # DELETE - Remove content
│   │       ├── conversations/
│   │       │   └── [id]/route.ts     # GET - Compose conversations
│   │       ├── posthog/
│   │       │   └── recordings/route.ts # GET - Session recordings
│   │       ├── prompts/
│   │       │   └── [id]/route.ts     # PUT - Update system prompts
│   │       ├── sentry/
│   │       │   └── issues/route.ts   # GET - Error issues
│   │       ├── sidebar-sections/
│   │       │   ├── route.ts          # GET/POST - List/create sections
│   │       │   └── [id]/route.ts     # PUT/DELETE - Update/remove sections
│   │       └── users/
│   │           └── [id]/route.ts     # DELETE/PATCH - Delete/suspend users
│   │
│   ├── login/
│   │   └── page.tsx                  # Admin login form
│   │
│   └── dashboard/                    # Protected admin pages
│       ├── layout.tsx                # Dashboard layout (sidebar + header)
│       ├── page.tsx                  # Overview with KPIs
│       ├── users/                    # User management
│       │   ├── page.tsx              # User list + metrics
│       │   ├── [id]/page.tsx         # User detail
│       │   └── onboarding/page.tsx   # Onboarding funnel
│       ├── teams/                    # Team management
│       │   ├── page.tsx              # Teams list
│       │   └── [id]/page.tsx         # Team detail + members
│       ├── content/                  # Content management
│       │   ├── generated/page.tsx    # AI-generated posts
│       │   ├── scheduled/page.tsx    # Scheduled posts
│       │   ├── templates/page.tsx    # Content templates
│       │   └── ai-activity/page.tsx  # AI activity logs
│       ├── analytics/                # Analytics dashboards
│       │   ├── ai-performance/page.tsx # AI model metrics
│       │   ├── tokens/page.tsx       # Token usage
│       │   ├── costs/page.tsx        # Cost analysis
│       │   ├── features/page.tsx     # Feature adoption
│       │   ├── posthog/page.tsx      # PostHog embeds
│       │   └── linkedin/page.tsx     # LinkedIn metrics
│       ├── system/                   # System administration
│       │   ├── jobs/page.tsx         # Background jobs
│       │   ├── flags/page.tsx        # Sidebar control
│       │   └── errors/page.tsx       # Sentry errors
│       └── settings/page.tsx         # Admin settings
│
├── components/                       # React components
│   ├── app-sidebar.tsx               # Main navigation sidebar
│   ├── site-header.tsx               # Top header bar
│   ├── theme-provider.tsx            # Dark/light theme
│   ├── theme-toggle.tsx              # Animated theme switch
│   ├── login-form.tsx                # Login form
│   ├── metric-card.tsx               # KPI metric card
│   ├── confirmation-dialog.tsx       # Destructive action confirm
│   ├── empty-state.tsx               # Empty list placeholder
│   ├── info-tooltip.tsx              # Info tooltips
│   ├── posthog-provider.tsx          # Analytics provider
│   ├── charts/                       # Data visualizations
│   │   ├── ai-performance-charts.tsx # AI metrics charts
│   │   ├── cost-charts.tsx           # Cost trend charts
│   │   ├── feature-charts.tsx        # Feature heatmaps
│   │   ├── token-charts.tsx          # Token usage charts
│   │   └── heatmap-cell.tsx          # Heatmap cell
│   └── ui/                           # shadcn/ui primitives (25+ components)
│
├── lib/                              # Shared utilities
│   ├── auth.ts                       # JWT + bcrypt authentication
│   ├── audit.ts                      # Audit logging
│   ├── analytics.ts                  # PostHog event tracking
│   ├── rate-limit.ts                 # IP-based rate limiter
│   ├── quality-score.ts              # Content quality scoring
│   ├── openrouter.ts                 # OpenRouter API client
│   ├── posthog.ts                    # PostHog query client
│   ├── utils.ts                      # Utility functions
│   └── supabase/
│       └── client.ts                 # Supabase admin client
│
├── hooks/
│   └── use-mobile.ts                 # Mobile breakpoint hook
│
├── scripts/
│   └── seed-admin.ts                 # Admin user seeder
│
├── middleware.ts                      # Route protection (JWT)
├── next.config.ts                    # Next.js configuration
├── tsconfig.json                     # TypeScript configuration
├── components.json                   # shadcn/ui configuration
├── postcss.config.mjs                # PostCSS + Tailwind
└── package.json                      # Dependencies & scripts
```

---

## Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **npm** (comes with Node.js)
- A **Supabase** project with the required tables
- (Optional) **OpenRouter**, **PostHog**, and **Sentry** accounts

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd chainlinked-admin1

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Create an admin user
npx tsx scripts/seed-admin.ts admin yourpassword

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with your admin credentials.

### Development Workflow

```mermaid
flowchart LR
    A["npm install"] --> B["Configure .env.local"]
    B --> C["Seed admin user"]
    C --> D["npm run dev"]
    D --> E["Open localhost:3000"]
    E --> F["Login as admin"]

    style A fill:#e0f2fe,stroke:#0284c7
    style D fill:#dcfce7,stroke:#16a34a
    style F fill:#fef3c7,stroke:#d97706
```

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
# ============================================
# REQUIRED
# ============================================

# Supabase - Database & Auth
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Secret - Used for admin session tokens
# If not set, auth is BYPASSED for local development
ADMIN_JWT_SECRET=your-secret-key-minimum-32-characters

# ============================================
# OPTIONAL - AI Integration
# ============================================

# OpenRouter - AI content analysis (GPT-4.1)
OPENROUTER_API_KEY=sk-or-v1-...

# ============================================
# OPTIONAL - Analytics
# ============================================

# PostHog - Product analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_API_KEY=phx_...
POSTHOG_PROJECT_ID=12345

# ============================================
# OPTIONAL - Error Tracking
# ============================================

# Sentry - Error monitoring
SENTRY_API_TOKEN=sntrys_...
SENTRY_ORG=your-organization
SENTRY_PROJECT=your-project
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (admin access) |
| `ADMIN_JWT_SECRET` | Yes* | JWT signing secret (*bypassed in dev if unset) |
| `OPENROUTER_API_KEY` | No | OpenRouter API key for AI analysis |
| `NEXT_PUBLIC_POSTHOG_KEY` | No | PostHog frontend tracking key |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | PostHog API host (defaults to us.i.posthog.com) |
| `POSTHOG_API_KEY` | No | PostHog server-side API key |
| `POSTHOG_PROJECT_ID` | No | PostHog project identifier |
| `SENTRY_API_TOKEN` | No | Sentry API bearer token |
| `SENTRY_ORG` | No | Sentry organization slug |
| `SENTRY_PROJECT` | No | Sentry project slug |

---

## Database

The application uses **Supabase PostgreSQL** as its database. The admin client connects with a service role key that bypasses Row Level Security for full admin access.

### Key Tables

```mermaid
erDiagram
    admin_users {
        uuid id PK
        text username
        text password_hash
        timestamp last_login
    }

    profiles {
        uuid id PK
        text full_name
        text email
        timestamp created_at
        boolean onboarding_completed
        text linkedin_user_id
    }

    generated_posts {
        uuid id PK
        uuid user_id FK
        text content
        text post_type
        integer total_tokens
        decimal estimated_cost
        text model
    }

    scheduled_posts {
        uuid id PK
        uuid user_id FK
        text content
        timestamp scheduled_for
        text status
    }

    teams {
        uuid id PK
        text name
    }

    team_members {
        uuid user_id FK
        uuid team_id FK
    }

    prompt_usage_logs {
        uuid id PK
        uuid user_id FK
        text model
        text feature
        integer total_tokens
        decimal estimated_cost
    }

    system_prompts {
        uuid id PK
        text name
        text type
        boolean is_active
        boolean is_default
    }

    sidebar_sections {
        uuid id PK
        text key
        text label
        boolean enabled
        integer sort_order
    }

    profiles ||--o{ generated_posts : "creates"
    profiles ||--o{ scheduled_posts : "schedules"
    profiles ||--o{ prompt_usage_logs : "uses"
    profiles ||--o{ team_members : "belongs to"
    teams ||--o{ team_members : "has"
```

### Database Setup

Tables are managed through the Supabase dashboard. The admin dashboard reads from 23+ tables including:

- **User tables:** `profiles`, `admin_users`, `linkedin_tokens`
- **Content tables:** `generated_posts`, `scheduled_posts`, `my_posts`, `templates`
- **AI tables:** `prompt_usage_logs`, `compose_conversations`, `system_prompts`, `generated_suggestions`
- **Team tables:** `teams`, `team_members`, `companies`
- **Job tables:** `company_context`, `research_sessions`, `suggestion_generation_runs`
- **Analytics tables:** `post_analytics`, `post_analytics_accumulative`, `profile_analytics_accumulative`
- **System tables:** `sidebar_sections`, `swipe_wishlist`

> See [docs/DATABASE.md](./docs/DATABASE.md) for full schema documentation.

---

## Authentication

```mermaid
sequenceDiagram
    actor Admin
    participant Login as Login Page
    participant API as /api/auth/login
    participant RL as Rate Limiter
    participant DB as Supabase
    participant MW as Middleware

    Admin->>Login: Enter credentials
    Login->>API: POST {username, password}
    API->>RL: Check rate limit (5/15min per IP)
    alt Rate limited
        RL-->>API: 429 Too Many Requests
        API-->>Login: Show retry timer
    else Allowed
        API->>DB: Lookup admin_users
        DB-->>API: User record
        API->>API: bcrypt.compare(password, hash)
        alt Valid
            API->>API: Create JWT (24h expiry)
            API-->>Login: Set HTTP-only cookie
            Login->>Admin: Redirect to /dashboard
        else Invalid
            API-->>Login: 401 Invalid credentials
        end
    end

    Note over Admin, MW: Subsequent requests
    Admin->>MW: GET /dashboard/*
    MW->>MW: Verify JWT from cookie
    alt Valid token
        MW-->>Admin: Allow access
    else Invalid/expired
        MW-->>Admin: Redirect to /login
    end
```

### Key Details
- **Hashing:** bcryptjs with 12 salt rounds
- **Tokens:** JWT (HS256) via jose library, 24-hour expiry
- **Storage:** HTTP-only, Secure, SameSite=Strict cookies
- **Rate Limiting:** 5 attempts per 15 minutes per IP (in-memory)
- **Dev Mode:** Auth bypassed when `ADMIN_JWT_SECRET` is not set
- **Seeding:** `npx tsx scripts/seed-admin.ts <username> <password>`

> See [docs/authentication-flow.md](./docs/authentication-flow.md) for detailed auth documentation.

---

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/login` | POST | No | Admin login (rate limited) |
| `/api/auth/logout` | POST | No | Clear session |
| `/api/admin/content/analyze` | POST | JWT | AI content quality analysis |
| `/api/admin/content/[id]` | DELETE | JWT | Delete posts/templates |
| `/api/admin/conversations/[id]` | GET | JWT | Get compose conversation |
| `/api/admin/prompts/[id]` | PUT | JWT | Update system prompts |
| `/api/admin/users/[id]` | DELETE | JWT | Delete user permanently |
| `/api/admin/users/[id]` | PATCH | JWT | Suspend/unsuspend user |
| `/api/admin/posthog/recordings` | GET | JWT | PostHog session recordings |
| `/api/admin/sentry/issues` | GET | JWT | Sentry error issues |
| `/api/admin/sidebar-sections` | GET/POST | JWT | List/create sidebar sections |
| `/api/admin/sidebar-sections/[id]` | PUT/DELETE | JWT | Update/delete sections |

> See [docs/api-reference.md](./docs/api-reference.md) for detailed request/response documentation.

---

## Dashboard Pages

```mermaid
graph TB
    subgraph Public
        LOGIN["/login"]
    end

    subgraph Dashboard["/dashboard"]
        OVERVIEW["Overview<br/>KPIs, Activity, Health"]

        subgraph Users["/users"]
            UL["User List"]
            UD["User Detail"]
            UO["Onboarding Funnel"]
        end

        subgraph Teams["/teams"]
            TL["Teams List"]
            TD["Team Detail"]
        end

        subgraph Content["/content"]
            CG["Generated Posts"]
            CS["Scheduled Posts"]
            CT["Templates"]
            CA["AI Activity"]
        end

        subgraph Analytics["/analytics"]
            AAI["AI Performance"]
            AT["Token Usage"]
            AC["Costs"]
            AF["Features"]
            AP["PostHog"]
            AL["LinkedIn"]
        end

        subgraph System["/system"]
            SJ["Jobs Monitor"]
            SF["Sidebar Control"]
            SE["Error Tracking"]
        end

        SETTINGS["Settings"]
    end

    LOGIN -->|"Auth"| OVERVIEW

    style Public fill:#fee2e2,stroke:#ef4444
    style Dashboard fill:#f0fdf4,stroke:#22c55e
    style Users fill:#eff6ff,stroke:#3b82f6
    style Content fill:#fef3c7,stroke:#f59e0b
    style Analytics fill:#f5f3ff,stroke:#8b5cf6
    style System fill:#fdf2f8,stroke:#ec4899
```

### Page Count: 21 unique dashboard pages

---

## Workflows

### Admin Login Flow

```mermaid
flowchart TD
    A["Visit /dashboard"] --> B{Authenticated?}
    B -->|No| C["Redirect to /login"]
    C --> D["Enter credentials"]
    D --> E{Rate limited?}
    E -->|Yes| F["Show retry timer"]
    E -->|No| G{Valid credentials?}
    G -->|No| H["Show error"]
    G -->|Yes| I["Set JWT cookie"]
    I --> J["Redirect to /dashboard"]
    B -->|Yes| J
```

### User Management Workflow

```mermaid
flowchart LR
    A["View Users List"] --> B["Search/Filter/Sort"]
    B --> C["Select User"]
    C --> D["View Profile Detail"]
    D --> E{Action}
    E -->|Suspend| F["Confirm Dialog"]
    E -->|Delete| G["Type-to-Confirm"]
    E -->|Export| H["CSV Download"]
    F --> I["PATCH /api/admin/users/[id]"]
    G --> J["DELETE /api/admin/users/[id]"]
    I --> K["Audit Log + Toast"]
    J --> K
```

### Content Analysis Workflow

```mermaid
flowchart LR
    A["View Generated Posts"] --> B["Select Post"]
    B --> C["View Quality Score"]
    C --> D{AI Analysis?}
    D -->|Yes| E["POST /api/admin/content/analyze"]
    E --> F["GPT-4.1 Analysis"]
    F --> G["Engagement Score<br/>Readability Score<br/>Strengths<br/>Suggestions"]
    D -->|Local| H["quality-score.ts"]
    H --> I["Word Count<br/>Hook Quality<br/>CTA<br/>Formatting<br/>Hashtags"]
```

### Audit Logging Pipeline

```mermaid
flowchart LR
    A["Admin Action"] --> B["API Route Handler"]
    B --> C["auditLog()"]
    C --> D["Console JSON Output"]
    B --> E["trackAdminEvent()"]
    E --> F["PostHog Event"]

    style D fill:#e0f2fe,stroke:#0284c7
    style F fill:#dcfce7,stroke:#16a34a
```

All admin mutations are dual-logged:
1. **Audit Log** (server-side JSON to console) — for compliance
2. **PostHog Event** (analytics) — for behavior tracking

### Tracked Audit Events
| Event | Trigger |
|-------|---------|
| `login` | Admin login with IP |
| `logout` | Admin logout |
| `user.delete` | User permanently deleted |
| `user.suspend` | User suspended |
| `user.unsuspend` | User unsuspended |
| `content.delete` | Post/template deleted |
| `prompt.update` | System prompt modified |
| `flag.create` | Sidebar section created |
| `flag.update` | Sidebar section updated |
| `flag.delete` | Sidebar section deleted |
| `password.change` | Admin password changed |

---

## Integrations

```mermaid
graph TB
    ADMIN["ChainLinked<br/>Admin Dashboard"]

    ADMIN -->|"Database queries<br/>User management"| SUPA["Supabase<br/>PostgreSQL + Auth"]
    ADMIN -->|"Content analysis<br/>Cost/usage data"| OPENR["OpenRouter<br/>GPT-4.1"]
    ADMIN -->|"Event tracking<br/>Session replays<br/>HogQL queries"| PH["PostHog<br/>Analytics"]
    ADMIN -->|"Error issues<br/>Severity data"| SENTRY["Sentry<br/>Error Tracking"]
    ADMIN -.->|"Indirect<br/>(via database)"| LI["LinkedIn<br/>Engagement Data"]

    style ADMIN fill:#0077B5,color:#fff
    style SUPA fill:#3ECF8E,color:#fff
    style OPENR fill:#6366f1,color:#fff
    style PH fill:#1d4ed8,color:#fff
    style SENTRY fill:#362d59,color:#fff
    style LI fill:#0A66C2,color:#fff
```

| Integration | Purpose | Configuration |
|-------------|---------|---------------|
| **Supabase** | Database, user auth management | `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` |
| **OpenRouter** | AI content analysis (GPT-4.1) | `OPENROUTER_API_KEY` |
| **PostHog** | Analytics, session replays, events | 4 env vars (key, host, API key, project ID) |
| **Sentry** | Error tracking and monitoring | `SENTRY_API_TOKEN` + org + project |
| **LinkedIn** | Engagement data (indirect, via DB) | No direct config needed |

> See [docs/INTEGRATIONS.md](./docs/INTEGRATIONS.md) for detailed integration documentation.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (localhost:3000) |
| `npm run build` | Create production build |
| `npm start` | Run production server |
| `npm run lint` | Run ESLint checks |
| `npx tsx scripts/seed-admin.ts <user> <pass>` | Create admin user |

---

## Deployment

### Vercel (Recommended)

1. Push repository to GitHub
2. Connect to Vercel
3. Set all environment variables in Vercel dashboard
4. Deploy

### Manual Deployment

```bash
# Build
npm run build

# Start production server
npm start
```

### Requirements
- Node.js 18+
- All required environment variables set
- Supabase project with tables created
- Admin user seeded

---

## Documentation

Comprehensive documentation (20 docs, 8,400+ lines) is available in the [`docs/`](./docs/) folder:

### Core Architecture & Setup
| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture, tech stack, project structure |
| [environment-setup.md](./docs/environment-setup.md) | Step-by-step local development setup guide |
| [deployment.md](./docs/deployment.md) | Deployment guide (Vercel, Docker, self-hosted) |
| [SECURITY.md](./docs/SECURITY.md) | Security architecture, OWASP mitigations, production checklist |

### Database & API
| Document | Description |
|----------|-------------|
| [DATABASE.md](./docs/DATABASE.md) | Database overview, ER diagrams, table relationships |
| [database-schema.md](./docs/database-schema.md) | Detailed schema with columns, types, and query examples |
| [API.md](./docs/API.md) | API overview, authentication, error handling |
| [api-reference.md](./docs/api-reference.md) | Detailed endpoint reference with request/response examples |

### Features & Guides
| Document | Description |
|----------|-------------|
| [FEATURES.md](./docs/FEATURES.md) | Complete feature documentation |
| [ADMIN-GUIDE.md](./docs/ADMIN-GUIDE.md) | Operational guide for dashboard administrators |
| [onboarding-flow.md](./docs/onboarding-flow.md) | User onboarding funnel stages and monitoring |
| [ai-features.md](./docs/ai-features.md) | AI capabilities, content analysis, quality scoring |

### Technical Reference
| Document | Description |
|----------|-------------|
| [components.md](./docs/components.md) | React component library and hierarchy |
| [STYLING.md](./docs/STYLING.md) | Design system, color palette, theming, CSS patterns |
| [state-management.md](./docs/state-management.md) | Data fetching patterns, context providers, hooks |
| [authentication-flow.md](./docs/authentication-flow.md) | Auth system, JWT, middleware, rate limiting |

### Integrations & Developer Resources
| Document | Description |
|----------|-------------|
| [INTEGRATIONS.md](./docs/INTEGRATIONS.md) | External services (Supabase, OpenRouter, PostHog, Sentry) |
| [chrome-extension.md](./docs/chrome-extension.md) | Chrome extension integration and shared data |
| [CONTRIBUTING.md](./docs/CONTRIBUTING.md) | Code conventions, patterns, git workflow |
| [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) | Common issues, diagnostic flowchart, error reference |

---

<div align="center">

Built with Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui

</div>
