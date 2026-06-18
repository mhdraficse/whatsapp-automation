import { SignJWT, jwtVerify } from "jose"

export const SESSION_COOKIE = "wcs_session"
export const SESSION_MAX_AGE = 60 * 60 * 8 // 8 hours

export type SessionPayload = {
  clientId: string
  role: "admin" | "client"
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
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
