import { Redis } from "ioredis"

let redis: Redis | null = null
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL)
}

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

const CAMPAIGNS_KEY = "wcs_campaigns"
const LOGS_KEY_PREFIX = "wcs_logs:"

export async function getCampaigns(clientId: string): Promise<Campaign[]> {
  if (!redis) return []
  try {
    const data = await redis.get(CAMPAIGNS_KEY)
    const allCampaigns: Campaign[] = data ? JSON.parse(data) : []
    return allCampaigns.filter((c) => c.clientId === clientId)
  } catch (error) {
    console.error("Error reading campaigns:", error)
    return []
  }
}

export async function saveCampaign(
  clientId: string,
  campaign: { campaignId: string; campaignName: string; total: number }
): Promise<Campaign> {
  if (!redis) throw new Error("REDIS_URL not configured")
  
  const data = await redis.get(CAMPAIGNS_KEY)
  const allCampaigns: Campaign[] = data ? JSON.parse(data) : []

  const newCampaign: Campaign = {
    campaignId: campaign.campaignId,
    campaignName: campaign.campaignName,
    createdAt: new Date().toISOString(),
    total: campaign.total,
    success: 0,
    failed: 0,
    status: "done",
    clientId,
  }

  allCampaigns.unshift(newCampaign)
  await redis.set(CAMPAIGNS_KEY, JSON.stringify(allCampaigns))
  return newCampaign
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
  if (!redis) return
  
  // 1. Add log to specific campaign list
  const logKey = `${LOGS_KEY_PREFIX}${log.campaignId}`
  await redis.lpush(logKey, JSON.stringify(log))
  // Optional: cap logs at 1000
  await redis.ltrim(logKey, 0, 999)

  // 2. Update campaign success/failed counts
  const data = await redis.get(CAMPAIGNS_KEY)
  const allCampaigns: Campaign[] = data ? JSON.parse(data) : []
  const campaign = allCampaigns.find(c => c.campaignId === log.campaignId)
  
  if (campaign) {
    if (log.status === "success") {
      campaign.success += 1
    } else {
      campaign.failed += 1
    }
    await redis.set(CAMPAIGNS_KEY, JSON.stringify(allCampaigns))
  }
}

export async function getCampaignLogs(campaignId: string): Promise<CampaignLog[]> {
  if (!redis) return []
  try {
    const logKey = `${LOGS_KEY_PREFIX}${campaignId}`
    const rawLogs = await redis.lrange(logKey, 0, -1)
    return rawLogs.map(str => JSON.parse(str))
  } catch (error) {
    console.error("Error reading campaign logs:", error)
    return []
  }
}
