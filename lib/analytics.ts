import posthog from "posthog-js"

type AdminEvent =
  | "admin_login"
  | "admin_logout"
  | "admin_user_delete"
  | "admin_user_suspend"
  | "admin_user_unsuspend"
  | "admin_content_delete"
  | "admin_flag_toggle"
  | "admin_flag_create"
  | "admin_flag_delete"
  | "admin_prompt_update"

export function trackAdminEvent(
  event: AdminEvent,
  properties?: Record<string, unknown>
) {
  try {
    if (typeof window !== "undefined" && posthog.__loaded) {
      posthog.capture(event, { app: "admin", ...properties })
    }
  } catch {
    // Silently fail — analytics should never break the app
  }
}
