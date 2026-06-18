import { Redis } from "ioredis"

let redis: Redis | null = null
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL)
}

export type ClientConfig = {
  email: string
  passwordHash: string
  webhookUrl?: string
  createdAt: string
}

const CLIENTS_KEY = "wcs_clients"

export async function getClients(): Promise<ClientConfig[]> {
  if (!redis) {
    console.warn("No REDIS_URL found. Returning empty clients.")
    return []
  }
  try {
    const data = await redis.get(CLIENTS_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error("Error reading clients from Redis:", error)
    return []
  }
}

export async function saveClient(client: Omit<ClientConfig, "createdAt">): Promise<ClientConfig> {
  if (!redis) throw new Error("REDIS_URL not configured")
  
  const clients = await getClients()
  const existingIndex = clients.findIndex(c => c.email.toLowerCase() === client.email.toLowerCase())
  
  const newClient: ClientConfig = {
    ...client,
    email: client.email.trim().toLowerCase(),
    createdAt: new Date().toISOString()
  }

  if (existingIndex >= 0) {
    newClient.createdAt = clients[existingIndex].createdAt
    clients[existingIndex] = newClient
  } else {
    clients.push(newClient)
  }

  await redis.set(CLIENTS_KEY, JSON.stringify(clients))
  return newClient
}

export async function deleteClient(email: string): Promise<boolean> {
  if (!redis) return false
  
  const clients = await getClients()
  const filtered = clients.filter(c => c.email.toLowerCase() !== email.toLowerCase())
  
  if (filtered.length !== clients.length) {
    await redis.set(CLIENTS_KEY, JSON.stringify(filtered))
    return true
  }
  return false
}

export async function getClientConfig(email: string): Promise<ClientConfig | null> {
  const clients = await getClients()
  return clients.find(c => c.email.toLowerCase() === email.toLowerCase()) || null
}
