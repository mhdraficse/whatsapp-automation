import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { logoutAction } from "@/app/auth-actions"
import { AdminDashboard } from "@/components/admin-dashboard"
import Link from "next/link"

export default async function AdminPage() {
  const session = await getSession()
  
  if (!session || session.role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
            Admin Panel
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              admin
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your clients and their webhook routing.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard"
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Back to Dashboard
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Log out
            </button>
          </form>
        </div>
      </header>
      
      <AdminDashboard />
    </main>
  )
}
