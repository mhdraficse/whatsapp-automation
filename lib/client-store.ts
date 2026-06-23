import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export type ClientConfig = {
  email: string
  passwordHash: string
  webhookUrl?: string
  instanceName?: string
  incomingWebhookUrl?: string
  createdAt: string
}

export async function getClients(): Promise<ClientConfig[]> {
  if (!supabase) {
    console.warn("No SUPABASE_URL found. Returning empty clients.")
    return []
  }
  
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error reading clients from Supabase:", error)
    return []
  }

  return (data || []).map((row: any) => ({
    email: row.email,
    passwordHash: row.password_hash,
    webhookUrl: row.webhook_url,
    instanceName: row.instance_name,
    incomingWebhookUrl: row.incoming_webhook_url,
    createdAt: row.created_at,
  }))
}

export async function saveClient(client: Omit<ClientConfig, "createdAt">): Promise<ClientConfig> {
  if (!supabase) throw new Error("SUPABASE_URL not configured")
  
  const emailLower = client.email.trim().toLowerCase()
  
  // Check if client exists
  const { data: existing } = await supabase
    .from("clients")
    .select("created_at")
    .eq("email", emailLower)
    .single()

  const clientData = {
    email: emailLower,
    password_hash: client.passwordHash,
    webhook_url: client.webhookUrl,
    instance_name: client.instanceName,
    incoming_webhook_url: client.incomingWebhookUrl,
    created_at: existing ? existing.created_at : new Date().toISOString(),
  }

  const { error } = await supabase
    .from("clients")
    .upsert(clientData, { onConflict: "email" })
    
  if (error) {
    console.error("Error saving client:", error)
    throw new Error("Failed to save client")
  }

  return {
    email: clientData.email,
    passwordHash: clientData.password_hash,
    webhookUrl: clientData.webhook_url,
    instanceName: clientData.instance_name,
    incomingWebhookUrl: clientData.incoming_webhook_url,
    createdAt: clientData.created_at,
  }
}

export async function deleteClient(email: string): Promise<boolean> {
  if (!supabase) return false
  
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("email", email.toLowerCase())
    
  if (error) {
    console.error("Error deleting client:", error)
    return false
  }
  
  return true
}

export async function getClientConfig(email: string): Promise<ClientConfig | null> {
  if (!supabase) return null
  
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("email", email.toLowerCase())
    .single()
    
  if (error || !data) return null
  
  return {
    email: data.email,
    passwordHash: data.password_hash,
    webhookUrl: data.webhook_url,
    instanceName: data.instance_name,
    incomingWebhookUrl: data.incoming_webhook_url,
    createdAt: data.created_at,
  }
}

export async function getClientByInstance(instanceName: string): Promise<ClientConfig | null> {
  if (!supabase) return null
  
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("instance_name", instanceName)
    .single()
    
  if (error || !data) return null
  
  return {
    email: data.email,
    passwordHash: data.password_hash,
    webhookUrl: data.webhook_url,
    instanceName: data.instance_name,
    incomingWebhookUrl: data.incoming_webhook_url,
    createdAt: data.created_at,
  }
}
