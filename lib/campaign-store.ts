import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export type Campaign = {
  campaignId: string
  campaignName: string
  createdAt: string
  total: number
  success: number
  failed: number
  status: "sending" | "done"
  clientId: string
}

export async function getCampaigns(clientId: string): Promise<Campaign[]> {
  if (!supabase) return []
  
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error reading campaigns:", error)
    return []
  }

  // Map snake_case from DB to camelCase for the frontend
  return (data || []).map((row: any) => ({
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    createdAt: row.created_at,
    total: row.total,
    success: row.success,
    failed: row.failed,
    status: row.status,
    clientId: row.client_id,
  }))
}

export async function saveCampaign(
  clientId: string,
  campaign: { campaignId: string; campaignName: string; total: number }
): Promise<Campaign> {
  if (!supabase) throw new Error("SUPABASE_URL not configured")
  
  const newCampaign = {
    campaign_id: campaign.campaignId,
    campaign_name: campaign.campaignName,
    created_at: new Date().toISOString(),
    total: campaign.total,
    success: 0,
    failed: 0,
    status: "done",
    client_id: clientId,
  }

  const { error } = await supabase.from("campaigns").insert(newCampaign)
  
  if (error) {
    console.error("Error saving campaign:", error)
    throw new Error("Failed to save campaign")
  }

  return {
    campaignId: newCampaign.campaign_id,
    campaignName: newCampaign.campaign_name,
    createdAt: newCampaign.created_at,
    total: newCampaign.total,
    success: newCampaign.success,
    failed: newCampaign.failed,
    status: newCampaign.status,
    clientId: newCampaign.client_id,
  }
}

export type CampaignLog = {
  campaignId: string
  phone: string
  status: "success" | "failed"
  delaySeconds: number
  timestamp: string
  errorMessage?: string
}

export async function saveCampaignLog(log: CampaignLog) {
  if (!supabase) return
  
  // 1. Insert log
  const newLog = {
    campaign_id: log.campaignId,
    phone: log.phone,
    status: log.status,
    delay_seconds: log.delaySeconds,
    timestamp: log.timestamp || new Date().toISOString(),
    error_message: log.errorMessage,
  }

  const { error: logError } = await supabase.from("campaign_logs").insert(newLog)
  if (logError) {
    console.error("Error saving campaign log:", logError)
    return
  }

  // 2. Update campaign success/failed counts
  const { data: campaign, error: fetchError } = await supabase
    .from("campaigns")
    .select("success, failed")
    .eq("campaign_id", log.campaignId)
    .single()

  if (!fetchError && campaign) {
    let success = campaign.success
    let failed = campaign.failed

    if (log.status === "success") {
      success += 1
    } else {
      failed += 1
    }

    await supabase
      .from("campaigns")
      .update({ success, failed })
      .eq("campaign_id", log.campaignId)
  }
}

export async function deleteCampaign(clientId: string, campaignId: string): Promise<boolean> {
  if (!supabase) return false
  // Delete logs first (FK constraint), then the campaign row
  await supabase.from("campaign_logs").delete().eq("campaign_id", campaignId)
  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("client_id", clientId) // scoped to the requesting client
  if (error) { console.error("Error deleting campaign:", error); return false }
  return true
}

export async function deleteAllCampaigns(clientId: string): Promise<boolean> {
  if (!supabase) return false
  // Fetch all campaign IDs for this client first
  const { data, error: fetchErr } = await supabase
    .from("campaigns")
    .select("campaign_id")
    .eq("client_id", clientId)
  if (fetchErr || !data) return false
  const ids = data.map((r: any) => r.campaign_id)
  if (ids.length) {
    await supabase.from("campaign_logs").delete().in("campaign_id", ids)
  }
  const { error } = await supabase.from("campaigns").delete().eq("client_id", clientId)
  if (error) { console.error("Error deleting all campaigns:", error); return false }
  return true
}

export async function getCampaignLogs(campaignId: string): Promise<CampaignLog[]> {
  if (!supabase) return []
  
  const { data, error } = await supabase
    .from("campaign_logs")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("timestamp", { ascending: false })

  if (error) {
    console.error("Error reading campaign logs:", error)
    return []
  }

  return (data || []).map((row: any) => ({
    campaignId: row.campaign_id,
    phone: row.phone,
    status: row.status,
    delaySeconds: row.delay_seconds,
    timestamp: row.timestamp,
    errorMessage: row.error_message,
  }))
}
