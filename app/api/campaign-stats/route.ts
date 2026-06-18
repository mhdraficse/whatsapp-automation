import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { getCampaigns, type Campaign } from "@/lib/campaign-store"

type StatsResponse = {
  clientId: string
  summary: {
    totalCampaigns: number
    totalMessages: number
    totalSuccess: number
    totalFailed: number
  }
  recentCampaigns: Campaign[]
}

async function buildStats(clientId: string, campaignId: string | null): Promise<StatsResponse> {
  const allCampaigns = await getCampaigns(clientId)

  // Filter if a specific campaignId is requested
  const recentCampaigns = campaignId
    ? allCampaigns.filter((c) => c.campaignId === campaignId)
    : allCampaigns

  const summary = recentCampaigns.reduce(
    (acc, c) => {
      acc.totalCampaigns += 1
      acc.totalMessages += c.total
      acc.totalSuccess += c.success
      acc.totalFailed += c.failed
      return acc
    },
    { totalCampaigns: 0, totalMessages: 0, totalSuccess: 0, totalFailed: 0 },
  )

  return { clientId, summary, recentCampaigns }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const campaignId = req.nextUrl.searchParams.get("campaignId")
  const stats = await buildStats(session.clientId, campaignId)
  return NextResponse.json(stats, { status: 200, headers: { "Cache-Control": "no-store" } })
}
