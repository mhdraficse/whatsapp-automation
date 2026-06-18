import fs from "fs/promises"
import path from "path"

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

const FILE_PATH = path.join(process.cwd(), "campaigns.json")

async function ensureFileExists() {
  try {
    await fs.access(FILE_PATH)
  } catch {
    // If file doesn't exist, create it with an empty array.
    await fs.writeFile(FILE_PATH, JSON.stringify([], null, 2), "utf-8")
  }
}

export async function getCampaigns(clientId: string): Promise<Campaign[]> {
  try {
    await ensureFileExists()
    const content = await fs.readFile(FILE_PATH, "utf-8")
    const allCampaigns: Campaign[] = JSON.parse(content || "[]")
    // Filter campaigns belonging to this clientId
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
  await ensureFileExists()
  const content = await fs.readFile(FILE_PATH, "utf-8")
  const allCampaigns: Campaign[] = JSON.parse(content || "[]")

  const newCampaign: Campaign = {
    campaignId: campaign.campaignId,
    campaignName: campaign.campaignName,
    createdAt: new Date().toISOString(),
    total: campaign.total,
    success: 0, // Now updated via n8n webhook
    failed: 0,
    status: "done",
    clientId,
  }

  allCampaigns.unshift(newCampaign) // Add to the beginning so it shows first
  await fs.writeFile(FILE_PATH, JSON.stringify(allCampaigns, null, 2), "utf-8")
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

const LOGS_FILE_PATH = path.join(process.cwd(), "campaign-logs.json")

async function ensureLogsFileExists() {
  try {
    await fs.access(LOGS_FILE_PATH)
  } catch {
    await fs.writeFile(LOGS_FILE_PATH, JSON.stringify([], null, 2), "utf-8")
  }
}

export async function saveCampaignLog(log: CampaignLog) {
  await ensureLogsFileExists()
  const content = await fs.readFile(LOGS_FILE_PATH, "utf-8")
  const allLogs: CampaignLog[] = JSON.parse(content || "[]")
  allLogs.push(log)
  await fs.writeFile(LOGS_FILE_PATH, JSON.stringify(allLogs, null, 2), "utf-8")

  // Update campaign success/failed counts in campaigns.json
  await ensureFileExists()
  const campsContent = await fs.readFile(FILE_PATH, "utf-8")
  const allCampaigns: Campaign[] = JSON.parse(campsContent || "[]")
  const campaign = allCampaigns.find(c => c.campaignId === log.campaignId)
  if (campaign) {
    if (log.status === "success") {
      campaign.success += 1
    } else {
      campaign.failed += 1
    }
    // We initially assumed success = total in saveCampaign, let's fix that too
    await fs.writeFile(FILE_PATH, JSON.stringify(allCampaigns, null, 2), "utf-8")
  }
}

export async function getCampaignLogs(campaignId: string): Promise<CampaignLog[]> {
  try {
    await ensureLogsFileExists()
    const content = await fs.readFile(LOGS_FILE_PATH, "utf-8")
    const allLogs: CampaignLog[] = JSON.parse(content || "[]")
    return allLogs.filter(log => log.campaignId === campaignId)
  } catch (error) {
    console.error("Error reading campaign logs:", error)
    return []
  }
}

