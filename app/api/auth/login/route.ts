import { NextResponse, type NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/client"
import { verifyPassword, createSessionToken, COOKIE_NAME } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { auditLog } from "@/lib/audit"

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown"

  const { allowed, retryAfterMs } = checkRateLimit(ip)
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    )
  }

  const body = await request.json()
  const { username, password } = body

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 }
    )
  }

  const { data: admin, error } = await supabaseAdmin
    .from("admin_users")
    .select("id, username, password_hash")
    .eq("username", username)
    .single()

  if (error || !admin) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 })
  }

  const valid = await verifyPassword(password, admin.password_hash)
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 })
  }

  const token = await createSessionToken({
    sub: admin.id,
    username: admin.username,
  })

  await supabaseAdmin
    .from("admin_users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", admin.id)

  auditLog("login", { adminId: admin.id, username: admin.username, ip })

  const response = NextResponse.json({ success: true })
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24,
  })

  return response
}
