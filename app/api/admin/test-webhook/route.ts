import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.N8N_API_KEY
  let body: { webhookUrl?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const webhookUrl = body.webhookUrl || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || "https://rafproj1.sitesv2.alburujits.com/webhook/campaign/send"

  try {
    const upstream = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {})
      },
      // Sending a minimal payload so it doesn't trigger a full campaign send
      body: JSON.stringify({ 
        isTestPing: true, 
        campaignName: "Test Ping", 
        source: "inline", 
        templates: ["Test Ping"], 
        numbers: [],
        useInline: true
      }),
      cache: "no-store",
    })

    if (!upstream.ok) {
      return NextResponse.json({ 
        success: false, 
        message: `Webhook returned status ${upstream.status}.` 
      }, { status: 200 })
    }

    return NextResponse.json({ success: true, message: "Webhook is reachable and accepted the connection!" }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: `Network error: ${error.message || "Could not reach webhook."}` 
    }, { status: 200 })
  }
}
