import { type NextRequest, NextResponse } from "next/server"
import { getClientByInstance } from "@/lib/client-store"

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    
    // Parse the JSON payload
    let body: any = {}
    try {
      body = JSON.parse(rawBody)
    } catch (e) {
      console.error("Evolution Webhook Error: Invalid JSON", rawBody)
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const event = typeof body.event === 'string' ? body.event.toLowerCase() : ""
    const instanceName = body.instance || body.sender?.instance || ""

    // Read the global webhook URLs from the environment
    const globalIncomingWebhookUrl = process.env.N8N_INCOMING_MSG_WEBHOOK_URL
    const statusWebhookUrl = process.env.N8N_STATUS_WEBHOOK_URL || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL

    let targetUrl: string | undefined = undefined

    // Determine the routing target based on the event
    // Evolution API typically sends 'messages.upsert' for new incoming messages
    if (event === "messages.upsert" || event === "messages.upsert") {
      targetUrl = globalIncomingWebhookUrl
      
      // Look up client by instance name to see if they have a custom auto-reply webhook
      if (instanceName) {
        const client = await getClientByInstance(instanceName)
        if (client && client.incomingWebhookUrl) {
          targetUrl = client.incomingWebhookUrl
          console.log(`Evolution Webhook: Routing messages.upsert for instance ${instanceName} to custom webhook`)
        }
      }
    } else {
      // For all other events (statuses, connection updates, etc.), send to the status webhook
      targetUrl = statusWebhookUrl
    }

    if (!targetUrl) {
      console.warn(`Evolution Webhook Warning: No target webhook URL configured for event: ${event}`)
      // Still return 200 so Evolution API doesn't retry
      return NextResponse.json({ success: true, message: "Ignored: No target configured" }, { status: 200 })
    }

    // Forward the webhook to the n8n target
    try {
      await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Optional: Forward any custom headers if needed
        },
        body: rawBody
      })
    } catch (fetchError) {
      console.error(`Evolution Webhook Error: Failed to forward to ${targetUrl}`, fetchError)
      // Return 200 anyway so Evolution API considers its job done
    }

    return NextResponse.json({ success: true, forwardedTo: targetUrl }, { status: 200 })

  } catch (error) {
    console.error("Error in evolution webhook router:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
