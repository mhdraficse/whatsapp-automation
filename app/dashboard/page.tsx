import { redirect } from "next/navigation"
import { Dashboard } from "@/components/dashboard"
import { getSession } from "@/lib/session"
import { logoutAction } from "@/app/auth-actions"

export default async function DashboardPage() {
  // Defense in depth: middleware already guards this route, but verify again here.
  const session = await getSession()
  if (!session) redirect("/login")

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">WhatsApp Campaign Sender</h1>
          <p className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
            <span>Signed in as <span className="font-medium text-foreground">{session.clientId}</span></span>
            {session.role === "admin" && (
              <>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                  admin
                </span>
                <span className="text-border">•</span>
                <a href="/admin" className="text-primary hover:underline font-medium">
                  Admin Panel
                </a>
              </>
            )}
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
          >
            Log out
          </button>
        </form>
      </header>
      <Dashboard />
    </main>
  )
}
