import { SentryErrorsViewer } from "./sentry-errors-viewer"

export default function ErrorsPage() {
  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Errors</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Unresolved Sentry issues from the ChainLinked platform
        </p>
      </div>
      <SentryErrorsViewer />
    </div>
  )
}
