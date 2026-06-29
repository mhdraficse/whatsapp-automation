import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { deleteCampaign, deleteAllCampaigns } from "@/lib/campaign-store"

// DELETE /api/campaigns?campaignId=xxx  → delete one
// DELETE /api/campaigns?all=true         → delete all for this client
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get("campaignId")
  const all = searchParams.get("all") === "true"

  if (all) {
    const ok = await deleteAllCampaigns(session.clientId)
    if (!ok) return NextResponse.json({ error: "Failed to delete campaigns" }, { status: 500 })
    return NextResponse.json({ deleted: "all" })
  }

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId or all=true required" }, { status: 400 })
  }

  const ok = await deleteCampaign(session.clientId, campaignId)
  if (!ok) return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 })
  return NextResponse.json({ deleted: campaignId })
}
