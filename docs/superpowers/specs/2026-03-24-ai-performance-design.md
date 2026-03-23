# AI Performance Dashboard + PostHog Integration — Design Spec

## Overview

Build an AI Performance page in the admin panel that shows how well each prompt performs, model comparison, real cost analytics, and embeds PostHog analytics for heatmaps and user behavior. Also add AI tracking events to the main ChainLinked app.

## Data Available

### From Supabase (existing, no changes needed)

**prompt_usage_logs (24 rows):**
- Per-call: prompt_type, feature, model, input_tokens, output_tokens, response_time_ms, success, metadata (tone, topic, length), user_id, created_at

**system_prompts (18 prompts):**
| Type | Name | Category |
|------|------|----------|
| base_rules | LinkedIn Quality Base Rules | Foundation |
| remix_professional | Professional Tone Remix | Remix |
| remix_casual | Casual Tone Remix | Remix |
| remix_inspiring | Inspiring Tone Remix | Remix |
| remix_educational | Educational Tone Remix | Remix |
| remix_thought_provoking | Thought-Provoking Tone Remix | Remix |
| remix_match_style | Match My Style Remix | Remix |
| post_story | Story Post Generator | Post Type |
| post_listicle | Listicle Post Generator | Post Type |
| post_how_to | How-To Post Generator | Post Type |
| post_contrarian | Contrarian Post Generator | Post Type |
| post_case_study | Case Study Post Generator | Post Type |
| post_reflection | Reflection Post Generator | Post Type |
| post_data_driven | Data-Driven Post Generator | Post Type |
| post_question | Question Post Generator | Post Type |
| post_carousel | Carousel Post Generator | Post Type |
| carousel_system | Carousel Generation System Prompt | Carousel |
| carousel_user_template | Carousel User Message Template | Carousel |

**generated_posts (137 rows):** Output content, post_type, word_count, source, quality scores
**compose_conversations (10 rows):** Full chat threads

### From OpenRouter API (live)
- Account balance/usage via `/api/v1/auth/key`
- Real per-token pricing: gpt-4.1 ($0.002/1K input, $0.008/1K output), gpt-4o ($0.0025/1K input, $0.01/1K output)

### From PostHog (collecting now)
- Pageviews, autocapture events on both admin and main app
- Session data, user flows
- Heatmaps available via shared dashboard

## Part 1: AI Performance Page (Admin Panel)

### Route: `/dashboard/analytics/ai-performance`

### Section 1: Prompt Performance Table
Show each of the 18 system prompts with their usage stats from `prompt_usage_logs`:

| Prompt Name | Type | Calls | Avg Input Tokens | Avg Output Tokens | Avg Response Time | Avg Cost/Call | Success Rate |
|-------------|------|-------|------------------|-------------------|-------------------|---------------|-------------|

Join `system_prompts.type` with `prompt_usage_logs.prompt_type` to get the human-readable prompt name instead of the raw type string.

Prompts with 0 calls should still appear (grayed out) so admin can see which prompts are unused.

### Section 2: Model Comparison
Side-by-side cards comparing the models used:

For each model (gpt-4.1, gpt-4.1-2025-04-14, gpt-4o):
- Total calls
- Avg response time
- Avg input/output tokens
- Total cost
- Cost per call
- Features used with this model

### Section 3: Cost Breakdown
- **Daily cost chart** — bar chart showing cost per day over last 30 days (from prompt_usage_logs grouped by date)
- **Cost by prompt type** — which prompts cost the most
- **Cost by user** — who's spending the most on AI

### Section 4: Output Quality Distribution
From the `generated_posts` quality scores (computed by `lib/quality-score.ts`):
- Distribution chart: how many posts score Low / Medium / High
- Average quality by source (compose vs remix vs carousel vs swipe)
- Average quality by post type

## Part 2: Enhanced PostHog Page

### Route: `/dashboard/analytics/posthog` (existing, enhance)

Currently shows just an iframe. Enhance to:
- Show the embedded PostHog dashboard (already configured with URL)
- Add a "Heatmaps" section explaining how to access PostHog toolbar
- Add a "Session Replay" section with link to PostHog replays

## Part 3: AI Event Tracking in Main ChainLinked App

Add PostHog custom events to the main app's AI routes so we can track:

**Events to add (in ChainLinked's API routes):**
- `ai_generation_started` — when user initiates any AI generation
- `ai_generation_completed` — with tokens, model, cost, response_time
- `ai_generation_failed` — with error type

These events will appear in PostHog and can be queried via the API for the admin panel.

**Files to modify in `/Volumes/Crucial X9/AgiNotReady/ChainLinked/`:**
- `app/api/ai/generate/route.ts`
- `app/api/ai/remix/route.ts`
- `app/api/ai/carousel/generate/route.ts`
- `app/api/ai/compose-chat/route.ts`

Use `posthog-node` (server-side PostHog client) since these are API routes.

## Part 4: Sidebar Update

Add "AI Performance" to the Analytics section in the admin sidebar, between "Token Usage" and "Feature Usage".

## Files

### Admin Panel — Create:
- `app/dashboard/analytics/ai-performance/page.tsx` — Main AI performance page

### Admin Panel — Modify:
- `components/app-sidebar.tsx` — Add AI Performance nav item
- `app/dashboard/analytics/posthog/page.tsx` — Enhance with sections

### Main ChainLinked App — Create:
- `lib/posthog-server.ts` — Server-side PostHog client for API routes

### Main ChainLinked App — Modify:
- `app/api/ai/generate/route.ts` — Add PostHog tracking
- `app/api/ai/remix/route.ts` — Add PostHog tracking
- `app/api/ai/carousel/generate/route.ts` — Add PostHog tracking
- `app/api/ai/compose-chat/route.ts` — Add PostHog tracking

## Out of Scope
- User feedback on AI output (thumbs up/down) — needs main app UI work
- Linking generated posts to LinkedIn engagement metrics
- Prompt A/B testing framework
- OpenMeter integration
