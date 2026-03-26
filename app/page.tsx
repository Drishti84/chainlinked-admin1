import { redirect } from "next/navigation"

export default function Home() {
  // DEV BYPASS: go straight to dashboard when no auth is configured
  if (!process.env.ADMIN_JWT_SECRET) {
    redirect("/dashboard")
  }
  redirect("/login")
}
