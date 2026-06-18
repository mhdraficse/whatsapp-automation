import { redirect } from "next/navigation"

// The campaign sender now lives on the protected /dashboard route.
// Send everyone there; middleware bounces unauthenticated users to /login.
export default function Page() {
  redirect("/dashboard")
}
