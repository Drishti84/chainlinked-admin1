"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import posthog from "posthog-js"
import { PostHogProvider as PostHogProviderBase } from "posthog-js/react"

interface PostHogProviderProps {
  children: React.ReactNode
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const [mounted, setMounted] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!apiKey) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[PostHog] NEXT_PUBLIC_POSTHOG_KEY not set — analytics disabled")
      }
      return
    }

    if (posthog.__loaded) {
      setIsReady(true)
      return
    }

    posthog.init(apiKey, {
      api_host: apiHost,
      ui_host: "https://us.posthog.com",
      autocapture: true,
      capture_pageview: false,
      capture_pageleave: true,
      disable_session_recording: true,
      persistence: "localStorage+cookie",
      debug: process.env.NODE_ENV === "development",
    })

    setIsReady(true)
  }, [mounted, apiKey, apiHost])

  // Render children directly during SSR — wrap with PostHog only on client
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <PostHogProviderBase client={posthog}>
      {isReady ? (
        <Suspense fallback={null}>
          <PostHogPageview />
        </Suspense>
      ) : null}
      {children}
    </PostHogProviderBase>
  )
}

function PostHogPageview(): null {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const url = useMemo(() => {
    const search = searchParams?.toString()
    return search ? `${pathname}?${search}` : pathname
  }, [pathname, searchParams])

  const section = useMemo(() => {
    if (!pathname) return null
    const match = pathname.match(/^\/dashboard\/(.+?)(?:\/|$)/)
    return match ? match[1] : pathname === "/dashboard" ? "overview" : null
  }, [pathname])

  useEffect(() => {
    posthog.capture("$pageview", {
      $current_url: url,
      page_title: typeof document !== "undefined" ? document.title : undefined,
      admin_section: section,
      app: "admin",
    })
  }, [url, section])

  return null
}
