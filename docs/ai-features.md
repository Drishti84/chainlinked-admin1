# AI Features

## AI Architecture

```mermaid
graph TD
    subgraph Admin Dashboard
        A[Content Analysis UI] -->|POST /api/admin/content/analyze| B[Admin API Route]
        M[AI Performance Dashboard] -->|Read metrics| DB[(Supabase)]
        N[Prompt Management] -->|CRUD| DB
    end

    subgraph OpenRouter
        B -->|POST /chat/completions| C[OpenRouter API]
        C --> D[GPT-4.1]
        D --> E[Analysis Response]
        E --> B
    end

    subgraph Main App
        F[User Content Generation] --> G[Multiple AI Models]
        G --> H[Generated Content]
        H -->|Stored| DB
        DB -->|Monitoring| M
    end

    style A fill:#1a1a2e,stroke:#e94560,color:#fff
    style D fill:#6366f1,stroke:#4f46e5,color:#fff
    style DB fill:#3ecf8e,stroke:#2b9f6f,color:#fff
```

---

## Content Quality Analysis

- **Endpoint:** `POST /api/admin/content/analyze`
- **Model:** OpenAI GPT-4.1 (via OpenRouter)
- **Temperature:** 0.3 (deterministic)
- **Max Tokens:** 500
- **System Prompt:** Custom LinkedIn content analyst persona
- **Input:** Post content + optional post type
- **Output:**

```json
{
  "engagementScore": 1-10,
  "readabilityScore": 1-10,
  "strengths": ["2-3 positive points"],
  "suggestions": ["2-3 improvements"],
  "summary": "Overall assessment"
}
```

---

## Local Content Quality Scoring

- **File:** `lib/quality-score.ts`
- **Algorithm:** Rule-based scoring (no AI)
- **Metrics (total 0-100 scale):**

| Metric | Points | Details |
|--------|--------|---------|
| Word Count | 0-25 | Optimal 50-600 words |
| Hook Quality | 0-20 | First line analysis: length, questions, numbers, caps |
| Call-to-Action | 0-15 | Questions, action verbs detection |
| Formatting | 0-15 | Line breaks, word distribution |
| Hashtags | 0-10 | Sweet spot 1-5 hashtags |
| Length Fit | 0-15 | 30-3000 character range |

- **Grades:** Low (0-40), Medium (41-70), High (71-100)

### Scoring Algorithm Flow

```mermaid
flowchart TD
    A[Input: Post Content] --> B[Word Count Analysis]
    A --> C[Hook Quality Analysis]
    A --> D[CTA Detection]
    A --> E[Formatting Check]
    A --> F[Hashtag Count]
    A --> G[Length Fit Check]

    B --> |0-25 pts| H[Sum Scores]
    C --> |0-20 pts| H
    D --> |0-15 pts| H
    E --> |0-15 pts| H
    F --> |0-10 pts| H
    G --> |0-15 pts| H

    H --> I{Total Score}
    I -->|0-40| J[Low Quality]
    I -->|41-70| K[Medium Quality]
    I -->|71-100| L[High Quality]

    style J fill:#ef4444,stroke:#dc2626,color:#fff
    style K fill:#f59e0b,stroke:#d97706,color:#fff
    style L fill:#22c55e,stroke:#16a34a,color:#fff
```

---

## AI Performance Monitoring

- **Dashboard:** `/dashboard/analytics/ai-performance`
- **Metrics:**
  - Total requests, avg tokens (input/output), avg response time, avg cost/call, success rate
  - Daily cost trend (30-day line chart)
  - Cost by model (bar chart)
  - Daily token usage (line chart)
  - Usage by feature (bar chart)
  - Feature x Time heatmap (8 weeks)
- **Prompt Analytics:**
  - All system prompts listed with type, category, active status
  - Categories: Remix, Post Type, Carousel, Foundation, Other

---

## Token Usage Analytics

- **Dashboard:** `/dashboard/analytics/tokens`
- **Tracked per API call:**
  - `input_tokens`
  - `output_tokens`
  - `total_tokens`
  - `model`
  - `estimated_cost`
  - `response_time_ms`
  - `success`

---

## Cost Analytics

- **Dashboard:** `/dashboard/analytics/costs`
- **Metrics:** Total spend, MTD, WTD, daily
- **Breakdowns:** By model, by feature, by user (top 20), monthly trends

---

## AI Activity Monitoring

- **Dashboard:** `/dashboard/content/ai-activity`
- **Tabs:**
  - **Requests:** Individual API calls
  - **Conversations:** Multi-turn chat sessions with message viewer
  - **Output:** Generated content results

---

## Prompt Management

- System prompts stored in `system_prompts` table
- Admin can activate/deactivate prompts
- Admin can set default prompts
- Changes audit-logged

### AI Workflow

```mermaid
flowchart TD
    A[Admin Triggers Analysis] --> B[Fetch Active System Prompt]
    B --> C[Build Request Payload]
    C --> D{OpenRouter API}
    D -->|Success| E[Parse AI Response]
    D -->|Failure| F[Log Error to Sentry]
    E --> G[Store Results in Supabase]
    G --> H[Log Token Usage]
    H --> I[Return Analysis to UI]
    F --> J[Return Error to UI]

    subgraph Monitoring
        H --> K[AI Performance Dashboard]
        H --> L[Cost Analytics]
        H --> M[Token Usage Dashboard]
    end

    style D fill:#6366f1,stroke:#4f46e5,color:#fff
    style F fill:#ef4444,stroke:#dc2626,color:#fff
    style I fill:#22c55e,stroke:#16a34a,color:#fff
```
