# API Reference

Detailed reference for all ChainLinked Admin Dashboard API endpoints.

---

## Authentication

### POST /api/auth/login

Admin user authentication. Validates credentials against the `admin_users` table and issues a JWT session cookie.

- **Auth Required:** No
- **Rate Limited:** Yes (5 attempts per 15 minutes per IP)

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response:** `200 OK`

```json
{
  "success": true
}
```

Sets an `admin-session` HTTP-only cookie (24-hour expiry, strict same-site, secure in production).

**Error Responses:**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "Username and password are required." }` | Missing username or password |
| 401 | `{ "error": "Invalid credentials." }` | User not found or wrong password |
| 429 | `{ "error": "Too many attempts. Try again later." }` | Rate limit exceeded (includes `Retry-After` header) |

**Side Effects:**
- Updates `last_login` timestamp on the `admin_users` record
- Writes an audit log entry (`login`)

---

### POST /api/auth/logout

Clears the admin session cookie.

- **Auth Required:** No
- **Rate Limited:** No

**Request Body:** None

**Success Response:** `200 OK`

```json
{
  "success": true
}
```

Clears the `admin-session` cookie by setting `maxAge: 0`.

**Side Effects:**
- Writes an audit log entry (`logout`)

---

## Content

### POST /api/admin/content/analyze

AI-powered LinkedIn content analysis via OpenRouter (GPT-4.1).

- **Auth Required:** Yes
- **Rate Limited:** No

**Request Body:**

```json
{
  "content": "string (required)",
  "postType": "string (optional)"
}
```

**Success Response:** `200 OK`

```json
{
  "engagementScore": 8,
  "readabilityScore": 7,
  "strengths": [
    "Strong opening hook",
    "Clear call to action",
    "Good use of whitespace"
  ],
  "suggestions": [
    "Add a relevant hashtag",
    "Shorten the second paragraph",
    "Include a personal anecdote"
  ],
  "summary": "Well-structured post with strong engagement potential."
}
```

**Error Responses:**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "Content is required" }` | Missing `content` field |
| 401 | `{ "error": "Unauthorized" }` | Missing or invalid session |
| 500 | `{ "error": "OpenRouter API key not configured" }` | Server missing `OPENROUTER_API_KEY` |
| 502 | `{ "error": "AI analysis failed" }` | OpenRouter returned a non-OK response |
| 502 | `{ "error": "Failed to parse AI response", "raw": "..." }` | AI response was not valid JSON |
| 502 | `{ "error": "Failed to reach OpenRouter" }` | Network error |

---

### DELETE /api/admin/content/[id]

Delete a content record by ID from a specified table.

- **Auth Required:** Yes
- **Rate Limited:** No

**Path Parameters:**

| Name | Type | Description |
|---|---|---|
| `id` | string | Record ID (UUID) |

**Query Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `table` | string | Yes | One of: `generated_posts`, `scheduled_posts`, `templates` |

**Example Request:**

```
DELETE /api/admin/content/abc-123?table=generated_posts
```

**Success Response:** `200 OK`

```json
{
  "success": true
}
```

**Error Responses:**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "Invalid table. Must be one of: generated_posts, scheduled_posts, templates" }` | Missing or disallowed table name |
| 401 | `{ "error": "Unauthorized" }` | Missing or invalid session |
| 500 | `{ "error": "..." }` | Supabase delete failed |

**Side Effects:**
- Writes an audit log entry (`content.delete`) with table name and content ID

---

## Conversations

### GET /api/admin/conversations/[id]

Fetch a compose conversation and its messages.

- **Auth Required:** Yes
- **Rate Limited:** No

**Path Parameters:**

| Name | Type | Description |
|---|---|---|
| `id` | string | Conversation ID (UUID) |

**Success Response:** `200 OK`

```json
{
  "id": "uuid",
  "messages": [],
  "created_at": "2026-03-30T12:00:00Z",
  "updated_at": "2026-03-30T12:30:00Z"
}
```

**Error Responses:**

| Status | Body | Condition |
|---|---|---|
| 401 | `{ "error": "Unauthorized" }` | Missing or invalid session |
| 404 | `{ "error": "Conversation not found" }` | No conversation with this ID |

---

## Prompts

### PUT /api/admin/prompts/[id]

Update a system prompt's active and default status.

- **Auth Required:** Yes
- **Rate Limited:** No

**Path Parameters:**

| Name | Type | Description |
|---|---|---|
| `id` | string | Prompt ID (UUID) |

**Request Body (all fields optional, at least one required):**

```json
{
  "is_active": true,
  "is_default": false
}
```

**Success Response:** `200 OK`

```json
{
  "success": true
}
```

**Error Responses:**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "No valid fields to update" }` | No recognized boolean fields provided |
| 401 | `{ "error": "Unauthorized" }` | Missing or invalid session |
| 500 | `{ "error": "..." }` | Supabase update failed |

**Side Effects:**
- Writes an audit log entry (`prompt.update`) with the applied updates

---

## Users

### DELETE /api/admin/users/[id]

Permanently delete a user from Supabase Auth.

- **Auth Required:** Yes
- **Rate Limited:** No

**Path Parameters:**

| Name | Type | Description |
|---|---|---|
| `id` | string | User ID (UUID) |

**Success Response:** `200 OK`

```json
{
  "success": true
}
```

**Error Responses:**

| Status | Body | Condition |
|---|---|---|
| 401 | `{ "error": "Unauthorized" }` | Missing or invalid session |
| 500 | `{ "error": "..." }` | Supabase Auth delete failed |

**Side Effects:**
- Writes an audit log entry (`user.delete`) with the target user ID

---

### PATCH /api/admin/users/[id]

Suspend or unsuspend a user. Suspension is implemented by setting a Supabase Auth ban duration.

- **Auth Required:** Yes
- **Rate Limited:** No

**Path Parameters:**

| Name | Type | Description |
|---|---|---|
| `id` | string | User ID (UUID) |

**Request Body:**

```json
{
  "action": "suspend" | "unsuspend"
}
```

- `"suspend"` sets `ban_duration` to `"876000h"` (approximately 100 years)
- `"unsuspend"` sets `ban_duration` to `"none"`

**Success Response:** `200 OK`

```json
{
  "success": true
}
```

**Error Responses:**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "Invalid action. Must be 'suspend' or 'unsuspend'." }` | Missing or unrecognized action |
| 401 | `{ "error": "Unauthorized" }` | Missing or invalid session |
| 500 | `{ "error": "..." }` | Supabase Auth update failed |

**Side Effects:**
- Writes an audit log entry (`user.suspend` or `user.unsuspend`)

---

## External Integrations

### GET /api/admin/posthog/recordings

Retrieve PostHog session recordings, ordered by most recent.

- **Auth Required:** Yes
- **Rate Limited:** No
- **Cache:** 60-second revalidation

**Query Parameters:**

| Name | Type | Default | Description |
|---|---|---|---|
| `limit` | string | `"20"` | Number of recordings to return |

**Success Response:** `200 OK`

Returns the PostHog session recordings API response directly.

**Error Responses:**

| Status | Body | Condition |
|---|---|---|
| 401 | `{ "error": "Unauthorized" }` | Missing or invalid session |
| 500 | `{ "error": "PostHog configuration missing" }` | Missing `POSTHOG_API_KEY` or `POSTHOG_PROJECT_ID` env vars |
| 500 | `{ "error": "Failed to fetch from PostHog", "details": "..." }` | Network error |
| *varies* | `{ "error": "PostHog API error: {status}", "details": "..." }` | PostHog returned non-OK status (status code is forwarded) |

---

### GET /api/admin/sentry/issues

Retrieve Sentry project issues with pagination support.

- **Auth Required:** Yes
- **Rate Limited:** No
- **Cache:** 60-second revalidation

**Query Parameters:**

| Name | Type | Default | Description |
|---|---|---|---|
| `query` | string | `"is:unresolved"` | Sentry search query |
| `sort` | string | `"date"` | Sort field |
| `limit` | string | `"25"` | Number of issues to return |
| `cursor` | string | `""` | Pagination cursor |

**Success Response:** `200 OK`

```json
{
  "issues": [],
  "link": "Link header value for pagination"
}
```

**Error Responses:**

| Status | Body | Condition |
|---|---|---|
| 401 | `{ "error": "Unauthorized" }` | Missing or invalid session |
| 500 | `{ "error": "Sentry configuration missing" }` | Missing `SENTRY_API_TOKEN`, `SENTRY_ORG`, or `SENTRY_PROJECT` env vars |
| 500 | `{ "error": "Failed to fetch from Sentry", "details": "..." }` | Network error |
| *varies* | `{ "error": "Sentry API error: {status}", "details": "..." }` | Sentry returned non-OK status (status code is forwarded) |

---

## Sidebar Sections

### GET /api/admin/sidebar-sections

List all sidebar sections, ordered by `sort_order`.

- **Auth Required:** Yes
- **Rate Limited:** No

**Success Response:** `200 OK`

```json
[
  {
    "id": "uuid",
    "key": "getting-started",
    "label": "Getting Started",
    "description": "Onboarding section",
    "enabled": true,
    "sort_order": 0,
    "created_at": "2026-03-30T12:00:00Z",
    "updated_at": "2026-03-30T12:00:00Z"
  }
]
```

**Error Responses:**

| Status | Body | Condition |
|---|---|---|
| 401 | `{ "error": "Unauthorized" }` | Missing or invalid session |
| 500 | `{ "error": "..." }` | Supabase query failed |

---

### POST /api/admin/sidebar-sections

Create a new sidebar section.

- **Auth Required:** Yes
- **Rate Limited:** No

**Request Body:**

```json
{
  "key": "string (required)",
  "label": "string (required)",
  "description": "string (optional, defaults to null)",
  "enabled": "boolean (optional, defaults to true)",
  "sort_order": "number (optional, defaults to 0)"
}
```

**Success Response:** `201 Created`

Returns the created section object.

**Error Responses:**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "Key is required" }` | Missing or non-string `key` |
| 400 | `{ "error": "Label is required" }` | Missing or non-string `label` |
| 401 | `{ "error": "Unauthorized" }` | Missing or invalid session |
| 500 | `{ "error": "..." }` | Supabase insert failed |

**Side Effects:**
- Writes an audit log entry (`sidebar_section.create`)

---

### PUT /api/admin/sidebar-sections/[id]

Update an existing sidebar section.

- **Auth Required:** Yes
- **Rate Limited:** No

**Path Parameters:**

| Name | Type | Description |
|---|---|---|
| `id` | string | Section ID (UUID) |

**Request Body (all fields optional, at least one required):**

```json
{
  "label": "string",
  "description": "string",
  "enabled": true,
  "sort_order": 1
}
```

**Success Response:** `200 OK`

```json
{
  "success": true
}
```

**Error Responses:**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "No valid fields to update" }` | No recognized fields provided |
| 401 | `{ "error": "Unauthorized" }` | Missing or invalid session |
| 500 | `{ "error": "..." }` | Supabase update failed |

**Side Effects:**
- Sets `updated_at` to current timestamp
- Writes an audit log entry (`sidebar_section.update`)

---

### DELETE /api/admin/sidebar-sections/[id]

Delete a sidebar section.

- **Auth Required:** Yes
- **Rate Limited:** No

**Path Parameters:**

| Name | Type | Description |
|---|---|---|
| `id` | string | Section ID (UUID) |

**Success Response:** `200 OK`

```json
{
  "success": true
}
```

**Error Responses:**

| Status | Body | Condition |
|---|---|---|
| 401 | `{ "error": "Unauthorized" }` | Missing or invalid session |
| 500 | `{ "error": "..." }` | Supabase delete failed |

**Side Effects:**
- Writes an audit log entry (`sidebar_section.delete`)
