import { getClientConfig } from "./client-store"
import { type SessionPayload } from "./jwt"

/**
 * Validate an email/password pair.
 * Returns a session payload on success, or null on any failure.
 * NOTE: callers must show a generic error and never reveal which field was wrong.
 */
export async function verifyCredentials(email: string, password: string): Promise<SessionPayload | null> {
  const normalized = email.trim().toLowerCase()

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD
  if (adminEmail && adminPassword && normalized === adminEmail && password === adminPassword) {
    return { clientId: normalized, role: "admin" }
  }

  const client = await getClientConfig(normalized)
  if (client && password === client.passwordHash) {
    return { clientId: normalized, role: "client" }
  }

  return null
}

export async function getClientWebhookUrl(email: string): Promise<string | undefined> {
  const client = await getClientConfig(email)
  return client?.webhookUrl
}

