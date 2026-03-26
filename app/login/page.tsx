import { LoginForm } from "@/components/login-form"
import Image from "next/image"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-background via-background to-primary/5">
      <Image src="/logo.png" alt="ChainLinked" width={48} height={48} className="rounded-lg" />
      <LoginForm />
    </div>
  )
}
