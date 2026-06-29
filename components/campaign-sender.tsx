"use client"

import { useMemo, useState } from "react"
import { parseNumbers, type NumberRow } from "@/lib/campaign"

// ─── Types ────────────────────────────────────────────────────────────────────

export type MsgType = "text" | "image" | "video"

/** A single message template. Matches the n8n workflow schema exactly. */
export type TemplateEntry =
  | string // plain text (legacy)
  | {
      type: MsgType
      text?: string       // required when type=text
      mediaUrl?: string   // required when type != text
      caption?: string    // optional caption shown with media
      fileName?: string   // required for document; optional for others
      mimeType?: string   // auto-detected by workflow if omitted
    }

type ResponseLog = {
  id: string
  time: string
  ok: boolean
  message: string
  campaignId?: string
}

type Errors = {
  campaignName?: string
  templates?: string
  numbers?: string
}

export type AcceptedCampaign = {
  campaignId?: string
  campaignName: string
  total: number
}

type CampaignSenderProps = {
  onCampaignAccepted?: (info: AcceptedCampaign) => void
  showResponsesPanel?: boolean
}

// ─── Per-template row state ───────────────────────────────────────────────────

type TemplateRow = {
  id: string
  type: MsgType
  text: string       // used when type=text
  mediaUrl: string   // used when type!=text
  caption: string    // optional caption
  fileName: string   // document filename
  isUploading?: boolean // tracks ImageKit upload state
}

function emptyRow(): TemplateRow {
  return {
    id: crypto.randomUUID(),
    type: "text",
    text: "",
    mediaUrl: "",
    caption: "",
    fileName: "",
  }
}

function rowToPayload(row: TemplateRow): TemplateEntry | null {
  if (row.type === "text") {
    const t = row.text.trim()
    if (!t) return null
    return {
      type: "text",
      text: t,
    }
  }
  let url = row.mediaUrl.trim()
  if (!url) return null

  // Convert Google Drive view URLs to direct download URLs
  const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/
  const match = url.match(driveRegex)
  if (match && match[1]) {
    url = `https://drive.google.com/uc?export=download&id=${match[1]}`
  }

  let mimeType: string | undefined = undefined
  if (row.fileName && row.fileName.toLowerCase().endsWith(".pdf")) {
    mimeType = "application/pdf"
  }

  return {
    type: row.type,
    mediaUrl: url,
    caption: row.caption.trim() || undefined,
    fileName: row.fileName.trim() || undefined,
    mimeType,
  }
}

const MSG_TYPE_LABELS: Record<MsgType, string> = {
  text: "📝 Text",
  image: "🖼️ Image",
  video: "🎬 Video",
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CampaignSender({
  onCampaignAccepted,
  showResponsesPanel = true,
}: CampaignSenderProps = {}) {
  const [campaignName, setCampaignName] = useState("")
  const [templateRows, setTemplateRows] = useState<TemplateRow[]>([emptyRow()])
  const [numbersRaw, setNumbersRaw] = useState("")

  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [alert, setAlert] = useState<{ ok: boolean; message: string } | null>(null)
  const [logs, setLogs] = useState<ResponseLog[]>([])

  const parsedNumbers: NumberRow[] = useMemo(() => parseNumbers(numbersRaw), [numbersRaw])

  // ── Template row helpers ──────────────────────────────────────────────────
  function updateRow(id: string, patch: Partial<TemplateRow>) {
    setTemplateRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    )
  }

  function addRow() {
    if (templateRows.length >= 5) return
    setTemplateRows((prev) => [...prev, emptyRow()])
  }

  function removeRow(id: string) {
    setTemplateRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev))
  }

  // ── ImageKit Upload Helper ───────────────────────────────────────────────
  async function handleFileUpload(id: string, file: File) {
    updateRow(id, { isUploading: true })
    try {
      const authRes = await fetch("/api/imagekit-auth")
      if (!authRes.ok) {
        const errData = await authRes.json()
        throw new Error(errData.error || "Failed to fetch ImageKit signature")
      }
      const { signature, expire, token } = await authRes.json()

      const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY
      if (!publicKey) {
        throw new Error("NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY is not set in .env.local")
      }

      const formData = new FormData()
      formData.append("file", file)
      formData.append("publicKey", publicKey)
      formData.append("signature", signature)
      formData.append("expire", expire.toString())
      formData.append("token", token)
      formData.append("fileName", file.name)
      
      const uploadRes = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        body: formData,
      })
      
      if (!uploadRes.ok) throw new Error("Upload to ImageKit failed")
      const uploadData = await uploadRes.json()

      updateRow(id, { mediaUrl: uploadData.url, fileName: file.name, isUploading: false })
    } catch (err: any) {
      console.error(err)
      alert(`File upload failed: ${err.message}`)
      updateRow(id, { isUploading: false })
    }
  }

  // ── Validation ───────────────────────────────────────────────────────────
  function validate(): { valid: boolean; templates: TemplateEntry[] } {
    const nextErrors: Errors = {}
    const templates = templateRows.map(rowToPayload).filter(Boolean) as TemplateEntry[]

    if (!campaignName.trim()) {
      nextErrors.campaignName = "Campaign name is required."
    }
    if (templates.length === 0) {
      nextErrors.templates = "At least one complete template is required."
    }
    if (parsedNumbers.length === 0) {
      nextErrors.numbers = "Add at least one valid row in the format: phone,name"
    }

    setErrors(nextErrors)
    return { valid: Object.keys(nextErrors).length === 0, templates }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAlert(null)

    const { valid, templates } = validate()
    if (!valid) return

    const payload = {
      campaignName: campaignName.trim(),
      templates,
      source: "inline" as const,
      numbers: parsedNumbers,
      listId: null,
      useInline: true,
    }

    console.log("Sending campaign body", payload)

    setSubmitting(true)
    try {
      const res = await fetch("/api/start-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      let data: { status?: string; campaignId?: string; error?: string } = {}
      try {
        data = await res.json()
      } catch {
        data = {}
      }

      if (res.ok && data.status === "accepted") {
        const message = `Campaign accepted. ID: ${data.campaignId ?? "unknown"}`
        setAlert({ ok: true, message })
        addLog({ ok: true, message, campaignId: data.campaignId })
        onCampaignAccepted?.({
          campaignId: data.campaignId,
          campaignName: payload.campaignName,
          total: payload.numbers.length,
        })
      } else if (res.status === 401) {
        window.location.href = "/login"
        return
      } else {
        const message =
          data.error || `Request failed (status ${res.status}). Please try again.`
        setAlert({ ok: false, message })
        addLog({ ok: false, message })
      }
    } catch {
      const message = "Network error: could not reach automation server."
      setAlert({ ok: false, message })
      addLog({ ok: false, message })
    } finally {
      setSubmitting(false)
    }
  }

  function addLog(entry: Omit<ResponseLog, "id" | "time">) {
    setLogs((prev) =>
      [
        {
          id: crypto.randomUUID(),
          time: new Date().toLocaleTimeString(),
          ...entry,
        },
        ...prev,
      ].slice(0, 10)
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={showResponsesPanel ? "grid gap-6 lg:grid-cols-[1fr_22rem]" : "grid gap-6"}>
      {/* Left column: form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-border bg-card p-6 text-card-foreground"
        noValidate
      >
        <fieldset disabled={submitting} className="flex flex-col gap-6">
          {/* Campaign name */}
          <div className="flex flex-col gap-2">
            <label htmlFor="campaignName" className="text-sm font-medium">
              Campaign name <span className="text-destructive">*</span>
            </label>
            <input
              id="campaignName"
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Spring promo"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.campaignName && (
              <p className="text-sm text-destructive">{errors.campaignName}</p>
            )}
          </div>

          {/* Message templates */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Message templates <span className="text-destructive">*</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {templateRows.length}/5 — one is picked at random per contact
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {templateRows.map((row, idx) => (
                <div
                  key={row.id}
                  className="rounded-md border border-border bg-background p-4 flex flex-col gap-3"
                >
                  {/* Header: label + type selector + remove btn */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-24 shrink-0">
                      Template {idx + 1}
                    </span>
                    <select
                      value={row.type}
                      onChange={(e) =>
                        updateRow(row.id, { type: e.target.value as MsgType })
                      }
                      className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                    >
                      {(Object.keys(MSG_TYPE_LABELS) as MsgType[]).map((t) => (
                        <option key={t} value={t}>
                          {MSG_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                    {templateRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="text-xs text-destructive hover:underline shrink-0"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Text message body */}
                  {row.type === "text" && (
                    <textarea
                      rows={3}
                      value={row.text}
                      onChange={(e) => updateRow(row.id, { text: e.target.value })}
                      placeholder={`Hi {{name}}, here's your offer from ACME!`}
                      className="resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  )}

                  {/* Media fields */}
                  {row.type !== "text" && (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground flex items-center justify-between">
                          <span>Media URL <span className="text-destructive">*</span></span>
                          <span className="opacity-60">(Provide URL or upload below)</span>
                        </label>
                        <div className="flex flex-col gap-2">
                          <input
                            type="url"
                            value={row.mediaUrl}
                            onChange={(e) => updateRow(row.id, { mediaUrl: e.target.value })}
                            placeholder={
                              row.type === "image"
                                ? "https://yourcdn.com/banner.jpg"
                                : "https://yourcdn.com/promo.mp4"
                            }
                            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring flex-1"
                          />
                          <div className="flex items-center gap-2">
                            <label className="relative cursor-pointer rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 focus-within:ring-2 focus-within:ring-ring w-fit">
                              {row.isUploading ? "Uploading..." : "⬆️ Upload File to ImageKit"}
                              <input 
                                type="file" 
                                accept={row.type === "image" ? "image/*" : "video/*"}
                                className="sr-only" 
                                disabled={row.isUploading}
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) handleFileUpload(row.id, file)
                                  e.target.value = "" // reset
                                }}
                              />
                            </label>
                            {row.isUploading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
                          </div>
                        </div>
                      </div>



                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">
                          Caption / message text{" "}
                          <span className="opacity-60">(optional, supports {"{{name}}"})</span>
                        </label>
                        <textarea
                          rows={2}
                          value={row.caption}
                          onChange={(e) => updateRow(row.id, { caption: e.target.value })}
                          placeholder={`Hi {{name}}, here's your document from ACME!`}
                          className="resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {templateRows.length < 5 && (
              <button
                type="button"
                onClick={addRow}
                className="self-start text-sm text-primary hover:underline"
              >
                + Add template variant
              </button>
            )}

            {errors.templates && (
              <p className="text-sm text-destructive">{errors.templates}</p>
            )}
          </div>

          {/* Phone numbers */}
          <div className="flex flex-col gap-2">
            <label htmlFor="numbers" className="text-sm font-medium">
              Numbers <span className="text-destructive">*</span>
            </label>
            <p className="text-xs text-muted-foreground">
              One per line in the format{" "}
              <code className="font-mono">phone,name</code> — e.g.{" "}
              <code className="font-mono">919876543210,Ravi</code>
            </p>
            <textarea
              id="numbers"
              rows={6}
              value={numbersRaw}
              onChange={(e) => setNumbersRaw(e.target.value)}
              placeholder={"919876543210,Ravi\n919812345678,Asha"}
              className="resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              {parsedNumbers.length} valid{" "}
              {parsedNumbers.length === 1 ? "recipient" : "recipients"} parsed
            </p>
            {errors.numbers && (
              <p className="text-sm text-destructive">{errors.numbers}</p>
            )}
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting && (
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
              />
            )}
            {submitting ? "Sending…" : "Start campaign"}
          </button>

          {alert && (
            <div
              role="status"
              className={
                "rounded-md border px-3 py-2 text-sm " +
                (alert.ok
                  ? "border-border bg-secondary text-secondary-foreground"
                  : "border-destructive/40 bg-destructive/10 text-destructive")
              }
            >
              {alert.message}
            </div>
          )}
        </fieldset>
      </form>

      {/* Right column: recent responses */}
      {showResponsesPanel && (
        <aside className="rounded-lg border border-border bg-card p-6 text-card-foreground">
          <h2 className="text-sm font-semibold">Recent responses</h2>
          {logs.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No campaigns sent yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {logs.map((log) => (
                <li key={log.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={
                        "font-medium " + (log.ok ? "text-foreground" : "text-destructive")
                      }
                    >
                      {log.ok ? "Accepted" : "Failed"}
                    </span>
                    <span className="text-xs text-muted-foreground">{log.time}</span>
                  </div>
                  {log.campaignId && (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      ID: {log.campaignId}
                    </p>
                  )}
                  <p className="mt-1 text-muted-foreground">{log.message}</p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}
    </div>
  )
}
