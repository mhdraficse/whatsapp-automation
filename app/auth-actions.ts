"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifyCredentials,
} from "@/lib/auth"

export type LoginState = { error?: string }

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")

  const session = await verifyCredentials(email, password)
  if (!session) {
    // Generic message — never reveal which field was wrong.
    return { error: "Invalid credentials" }
  }

  const token = await createSessionToken(session)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, sessionCookieOptions)

  redirect("/dashboard")
}

export async function logoutAction() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  redirect("/login")
}
