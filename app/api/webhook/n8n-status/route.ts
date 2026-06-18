import { type NextRequest, NextResponse } from "next/server"
import { saveCampaignLog } from "@/lib/campaign-store"

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key")
  const expectedApiKey = process.env.N8N_API_KEY

  if (!expectedApiKey || apiKey !== expectedApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { campaignId, phone, status, delaySeconds, timestamp, errorMessage } = body

    if (!campaignId || !phone || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    await saveCampaignLog({
      campaignId,
      phone,
      status,
      delaySeconds: Number(delaySeconds) || 0,
      timestamp: timestamp || new Date().toISOString(),
      errorMessage
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Error in n8n-status webhook:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
