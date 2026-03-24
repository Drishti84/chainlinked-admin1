import { NextResponse, type NextRequest } from "next/server"
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth"

async function authenticate(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export async function GET(request: NextRequest) {
  const admin = await authenticate(request)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.POSTHOG_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID

  if (!apiKey || !projectId) {
    return NextResponse.json(
      { error: "PostHog configuration missing" },
      { status: 500 }
    )
  }

  const { searchParams } = request.nextUrl
  const limit = searchParams.get("limit") || "20"

  try {
    const response = await fetch(
      `https://us.posthog.com/api/projects/${projectId}/session_recordings?limit=${limit}&ordering=-start_time`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        next: { revalidate: 60 },
      }
    )

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json(
        { error: `PostHog API error: ${response.status}`, details: text },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch from PostHog", details: String(err) },
      { status: 500 }
    )
  }
}
