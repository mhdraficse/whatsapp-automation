import fs from "fs/promises"
import path from "path"

export type ClientConfig = {
  email: string
  passwordHash: string
  webhookUrl?: string
  createdAt: string
}

const CLIENTS_FILE_PATH = path.join(process.cwd(), "clients.json")

async function ensureClientsFileExists() {
  try {
    await fs.access(CLIENTS_FILE_PATH)
  } catch {
    // Initialize with an empty array if not found
    await fs.writeFile(CLIENTS_FILE_PATH, JSON.stringify([], null, 2), "utf-8")
  }
}

export async function getClients(): Promise<ClientConfig[]> {
  try {
    await ensureClientsFileExists()
    const content = await fs.readFile(CLIENTS_FILE_PATH, "utf-8")
    return JSON.parse(content || "[]")
  } catch (error) {
    console.error("Error reading clients:", error)
    return []
  }
}

export async function saveClient(client: Omit<ClientConfig, "createdAt">): Promise<ClientConfig> {
  await ensureClientsFileExists()
  const clients = await getClients()
  const existingIndex = clients.findIndex(c => c.email.toLowerCase() === client.email.toLowerCase())
  
  const newClient: ClientConfig = {
    ...client,
    email: client.email.trim().toLowerCase(),
    createdAt: new Date().toISOString()
  }

  if (existingIndex >= 0) {
    // Preserve createdAt if updating
    newClient.createdAt = clients[existingIndex].createdAt
    clients[existingIndex] = newClient
  } else {
    clients.push(newClient)
  }

  await fs.writeFile(CLIENTS_FILE_PATH, JSON.stringify(clients, null, 2), "utf-8")
  return newClient
}

export async function deleteClient(email: string): Promise<boolean> {
  await ensureClientsFileExists()
  const clients = await getClients()
  const filtered = clients.filter(c => c.email.toLowerCase() !== email.toLowerCase())
  
  if (filtered.length !== clients.length) {
    await fs.writeFile(CLIENTS_FILE_PATH, JSON.stringify(filtered, null, 2), "utf-8")
    return true
  }
  return false
}

export async function getClientConfig(email: string): Promise<ClientConfig | null> {
  const clients = await getClients()
  return clients.find(c => c.email.toLowerCase() === email.toLowerCase()) || null
}
