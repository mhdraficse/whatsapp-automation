import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { getClientWebhookUrl } from "@/lib/auth"
import { saveCampaign } from "@/lib/campaign-store"

// Default webhook URL (overridable via env var)
const DEFAULT_WEBHOOK_URL =
  "https://rafproj1.sitesv2.alburujits.com/webhook/campaign/send"

// ─── Types ────────────────────────────────────────────────────────────────────

type NumberRow = { phone: string; name: string }

/** Mirrors the n8n workflow template schema exactly. */
type TemplateEntry =
  | string
  | {
      type: "text" | "image" | "video" | "document" | "audio"
      text?: string
      mediaUrl?: string
      caption?: string
      fileName?: string
      mimeType?: string
    }

type CampaignPayload = {
  campaignName: string
  templates: TemplateEntry[]
  source: "inline"
  numbers: NumberRow[]
  clientId: string
  listId: null
  useInline: boolean
}

// ─── Validation helpers ───────────────────────────────────────────────────────

const VALID_TYPES = ["text", "image", "video", "document", "audio"] as const

function validateTemplate(t: unknown, idx: number): string | null {
  if (typeof t === "string") {
    return t.trim() === "" ? `templates[${idx}] is an empty string.` : null
  }
  if (typeof t === "object" && t !== null) {
    const obj = t as Record<string, unknown>
    if (!obj.type || !VALID_TYPES.includes(obj.type as (typeof VALID_TYPES)[number])) {
      return `templates[${idx}].type must be one of: ${VALID_TYPES.join(", ")}.`
    }
    if (obj.type === "text") {
      if (!obj.text || typeof obj.text !== "string" || (obj.text as string).trim() === "") {
        return `templates[${idx}].text is required for type=text.`
      }
    } else {
      if (!obj.mediaUrl || typeof obj.mediaUrl !== "string" || (obj.mediaUrl as string).trim() === "") {
        return `templates[${idx}].mediaUrl is required for type=${obj.type}.`
      }
    }
    return null
  }
  return `templates[${idx}] must be a string or template object.`
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Reject unauthenticated requests up front.
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Server-side env vars.
  const globalWebhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || DEFAULT_WEBHOOK_URL
  const clientWebhookUrl = await getClientWebhookUrl(session.clientId)
  const webhookUrl = clientWebhookUrl || globalWebhookUrl
  const apiKey = process.env.N8N_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Server is missing N8N_API_KEY. Add it to your .env.local (local) or Vercel environment variables (production).",
      },
      { status: 500 },
    )
  }

  let body: {
    campaignName?: unknown
    templates?: unknown
    source?: unknown
    numbers?: unknown
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 })
  }

  // ── Validate campaignName ────────────────────────────────────────────────
  const campaignName = (
    typeof body.campaignName === "string" ? body.campaignName : ""
  ).trim()
  if (!campaignName) {
    return NextResponse.json({ error: "campaignName is required." }, { status: 400 })
  }

  // ── Validate templates ───────────────────────────────────────────────────
  if (!Array.isArray(body.templates) || body.templates.length === 0) {
    return NextResponse.json(
      { error: "templates must be a non-empty array." },
      { status: 400 },
    )
  }

  const templateErrors: string[] = []
  const templates: TemplateEntry[] = []

  for (let i = 0; i < body.templates.length; i++) {
    const err = validateTemplate(body.templates[i], i)
    if (err) {
      templateErrors.push(err)
    } else {
      // Sanitise: strip unknown keys from object templates, keep strings as-is
      const t = body.templates[i] as TemplateEntry
      if (typeof t === "string") {
        templates.push(t.trim())
      } else {
        const obj = t as Exclude<TemplateEntry, string>
        templates.push({
          type: obj.type,
          ...(obj.type === "text" ? { text: (obj.text || "").trim() } : {}),
          ...(obj.type !== "text" ? { mediaUrl: (obj.mediaUrl || "").trim() } : {}),
          ...(obj.caption ? { caption: obj.caption.trim() } : {}),
          ...(obj.fileName ? { fileName: obj.fileName.trim() } : {}),
          ...(obj.mimeType ? { mimeType: obj.mimeType.trim() } : {}),
        })
      }
    }
  }

  if (templateErrors.length > 0) {
    return NextResponse.json(
      { error: "Invalid templates.", details: templateErrors },
      { status: 400 },
    )
  }

  if (templates.length === 0) {
    return NextResponse.json(
      { error: "At least one non-empty template is required." },
      { status: 400 },
    )
  }

  // ── Validate numbers ─────────────────────────────────────────────────────
  const numbers: NumberRow[] = Array.isArray(body.numbers)
    ? (body.numbers as Array<Record<string, unknown>>)
        .map((n) => ({
          phone: (String(n?.phone ?? "")).trim(),
          name: (String(n?.name ?? "")).trim(),
        }))
        .filter((n) => n.phone.length > 0)
    : []

  if (numbers.length === 0) {
    return NextResponse.json(
      { error: "At least one valid phone number is required." },
      { status: 400 },
    )
  }

  // ── Build and forward payload to n8n ────────────────────────────────────
  const payload: CampaignPayload = {
    campaignName,
    templates,
    source: "inline",
    numbers,
    clientId: session.clientId,
    // These fields are required by the n8n "Validate Request Body" node
    listId: null,
    useInline: true,
  }

  try {
    const upstream = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    })

    const text = await upstream.text()
    let data: unknown
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { raw: text }
    }

    if (!upstream.ok) {
      const message =
        (data &&
          typeof data === "object" &&
          "error" in data &&
          (data as { error?: string }).error) ||
        `Automation server returned status ${upstream.status}.`
      return NextResponse.json({ error: message }, { status: upstream.status })
    }

    const resData =
      data && typeof data === "object"
        ? { ...(data as Record<string, unknown>) }
        : {}

    if (!resData.status) resData.status = "accepted"

    const campaignId =
      (resData.campaignId as string | undefined) || `c-${Date.now()}`
    if (!resData.campaignId) resData.campaignId = campaignId

    // Save to local campaigns store
    await saveCampaign(session.clientId, {
      campaignId,
      campaignName,
      total: numbers.length,
    })

    return NextResponse.json(resData, { status: 200 })
  } catch {
    return NextResponse.json(
      { error: "Network error: could not reach automation server." },
      { status: 502 },
    )
  }
}
