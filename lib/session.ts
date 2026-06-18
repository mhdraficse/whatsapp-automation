import { cookies } from "next/headers"
import { SESSION_COOKIE, verifySessionToken, type SessionPayload } from "@/lib/jwt"

/**
 * Read and verify the current session from the HTTP-only cookie.
 * Returns null when there is no valid session.
 * Safe to call from Server Components and Route Handlers.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  return verifySessionToken(token)
}
