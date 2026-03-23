import { NextResponse } from "next/server"
import { COOKIE_NAME } from "@/lib/auth"
import { auditLog } from "@/lib/audit"

export async function POST() {
  auditLog("logout", {})

  const response = NextResponse.json({ success: true })
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  })

  return response
}
