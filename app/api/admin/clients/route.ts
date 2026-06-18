import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { getClients, saveClient, deleteClient } from "@/lib/client-store"

// Middleware-like check
async function checkAdmin() {
  const session = await getSession()
  if (!session || session.role !== "admin") {
    return false
  }
  return true
}

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const clients = await getClients()
  return NextResponse.json(clients)
}

export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  
  try {
    const body = await req.json()
    if (!body.email || !body.passwordHash) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const newClient = await saveClient({
      email: body.email,
      passwordHash: body.passwordHash,
      webhookUrl: body.webhookUrl || undefined
    })

    return NextResponse.json(newClient)
  } catch (err) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  
  const { searchParams } = new URL(req.url)
  const email = searchParams.get("email")

  if (!email) {
    return NextResponse.json({ error: "Email parameter is required" }, { status: 400 })
  }

  const success = await deleteClient(email)
  if (success) {
    return NextResponse.json({ success: true })
  } else {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }
}
