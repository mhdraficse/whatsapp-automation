import { SignJWT, jwtVerify } from "jose"

export const SESSION_COOKIE = "wcs_session"
const SESSION_MAX_AGE = 60 * 60 * 8 // 8 hours

export type SessionPayload = {
  clientId: string // we use the email as the clientId
  role: "admin" | "client"
}

import { getClientConfig } from "./client-store"

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

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me"
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ clientId: payload.clientId, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecretKey())
}

export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    if (typeof payload.clientId !== "string") return null
    const role = payload.role === "admin" ? "admin" : "client"
    return { clientId: payload.clientId, role }
  } catch {
    return null
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
}
