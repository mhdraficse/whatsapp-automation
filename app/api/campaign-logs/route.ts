import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { getCampaignLogs } from "@/lib/campaign-store"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get("campaignId")

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 })
  }

  const logs = await getCampaignLogs(campaignId)
  
  return NextResponse.json({ logs }, { status: 200 })
}
