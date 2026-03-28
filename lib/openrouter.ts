interface OpenRouterKeyInfo {
  usage: number
  usage_daily: number
  usage_weekly: number
  usage_monthly: number
  limit: number | null
  is_free_tier: boolean
  rate_limit: {
    requests: number
    interval: string
  }
}

interface OpenRouterActivityEntry {
  date: string
  model: string
  model_permaslug?: string
  provider_name?: string
  usage: number
  requests: number
  prompt_tokens: number
  completion_tokens: number
  reasoning_tokens?: number
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

export async function getOpenRouterActivity(): Promise<OpenRouterActivityEntry[] | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch("https://openrouter.ai/api/v1/activity", {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      console.log("OpenRouter /activity status:", res.status)
      return null
    }

    const data = await res.json()
    return (data.data ?? data) as OpenRouterActivityEntry[]
  } catch {
    return null
  }
}

export async function getOpenRouterCredits(): Promise<{ total_credits: number; total_usage: number } | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch("https://openrouter.ai/api/v1/credits", {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 300 },
    })

    if (!res.ok) return null

    const data = await res.json()
    return data.data ?? data
  } catch {
    return null
  }
}
