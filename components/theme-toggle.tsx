"use client"

import { useState, useEffect, useRef } from "react"
import { MoonIcon, SunIcon } from "lucide-react"

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const [ripple, setRipple] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"))
  }, [])

  function toggle() {
    const next = !dark

    // Start ripple animation
    setRipple(true)

    // Apply theme change at the midpoint of animation
    requestAnimationFrame(() => {
      setTimeout(() => {
        setDark(next)
        document.documentElement.classList.toggle("dark", next)
        localStorage.setItem("theme", next ? "dark" : "light")
      }, 200)
    })

    // End ripple
    setTimeout(() => setRipple(false), 600)
  }

  return (
    <>
      {/* Ripple overlay */}
      {ripple && (
        <div
          className="fixed inset-0 z-[9999] pointer-events-none"
          style={{
            background: dark ? "var(--background)" : "oklch(0.15 0.01 90)",
            animation: "themeRipple 600ms ease-out forwards",
            transformOrigin: btnRef.current
              ? `${btnRef.current.getBoundingClientRect().left + btnRef.current.getBoundingClientRect().width / 2}px ${btnRef.current.getBoundingClientRect().top + btnRef.current.getBoundingClientRect().height / 2}px`
              : "top right",
          }}
        />
      )}

      <button
        ref={btnRef}
        onClick={toggle}
        className="relative flex size-8 items-center justify-center rounded-lg border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        <SunIcon className={`size-4 absolute transition-all duration-300 ${dark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"}`} />
        <MoonIcon className={`size-4 absolute transition-all duration-300 ${dark ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
      </button>
    </>
  )
}
