import { redirect } from "next/navigation"
import { LoginForm } from "@/components/login-form"
import { getSession } from "@/lib/session"

export default async function LoginPage() {
  // If already authenticated, skip the login screen.
  const session = await getSession()
  if (session) redirect("/dashboard")

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-card-foreground">
        <header className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Log in to access your WhatsApp campaign dashboard.
          </p>
        </header>
        <LoginForm />
      </div>
    </main>
  )
}

/*
============================================================
HOW TO RUN
============================================================
1) Install dependencies:        pnpm install
2) Create .env.local with:
     NEXT_PUBLIC_N8N_WEBHOOK_URL=https://rafproj1.sitesv2.alburujits.com/webhook/campaign/send
     N8N_API_KEY=your-secret-key            # stays server-side only
     AUTH_SECRET=$(openssl rand -base64 32) # signs the session cookie
     ADMIN_EMAIL=you@example.com            # your admin account
     ADMIN_PASSWORD=your-strong-password
3) Run locally:                 pnpm dev   ->  http://localhost:3000
   Visiting / redirects to /dashboard, which is protected and sends you to /login.

============================================================
HOW TO CONFIGURE CLIENT ACCOUNTS
============================================================
- The ADMIN account is configured entirely via env vars (ADMIN_EMAIL / ADMIN_PASSWORD).
- Demo client accounts live in lib/auth.ts -> DEMO_CLIENTS:
      "client1@example.com": { password: "client1pass", role: "client" }
      "client2@example.com": { password: "client2pass", role: "client" }
  To add more clients, add another entry to that map. To move to a real database,
  replace the body of verifyCredentials() in lib/auth.ts — nothing else needs to change.
- On deploy (Vercel), set NEXT_PUBLIC_N8N_WEBHOOK_URL, N8N_API_KEY, AUTH_SECRET,
  ADMIN_EMAIL and ADMIN_PASSWORD in Project Settings > Environment Variables.
============================================================
*/
