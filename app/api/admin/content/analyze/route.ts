import { NextResponse, type NextRequest } from "next/server"
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth"

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const admin = await verifySessionToken(token)
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 })
  }

  const { content, postType } = await request.json()
  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 })
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://chainlinked.ai",
        "X-Title": "ChainLinked Admin",
      },
      body: JSON.stringify({
        model: "openai/gpt-4.1",
        temperature: 0.3,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content: `You are a LinkedIn content quality analyst. Analyze the given LinkedIn post and return a JSON object with:
- engagementScore (1-10): predicted engagement potential
- readabilityScore (1-10): how easy it is to read
- strengths (array of 2-3 short bullet points)
- suggestions (array of 2-3 improvement suggestions)
- summary (one sentence overall assessment)

Return ONLY valid JSON, no markdown.`,
          },
          {
            role: "user",
            content: `Analyze this LinkedIn post${postType ? ` (type: ${postType})` : ""}:\n\n${content}`,
          },
        ],
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: "AI analysis failed" }, { status: 502 })
    }

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content || ""

    try {
      const analysis = JSON.parse(text)
      return NextResponse.json(analysis)
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response", raw: text }, { status: 502 })
    }
  } catch {
    return NextResponse.json({ error: "Failed to reach OpenRouter" }, { status: 502 })
  }
}
