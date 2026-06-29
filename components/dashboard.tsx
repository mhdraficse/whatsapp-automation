"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { CampaignSender, type AcceptedCampaign } from "@/components/campaign-sender"

// ─── Types ────────────────────────────────────────────────────────────────────

type CampaignRow = {
  campaignId: string
  campaignName: string
  createdAt: string
  total: number
  success: number
  failed: number
  status?: "sending" | "done"
}

type Summary = {
  totalCampaigns: number
  totalMessages: number
  totalSuccess: number
  totalFailed: number
}

type StatsResponse = {
  clientId: string
  summary: Summary
  recentCampaigns: CampaignRow[]
}

type WAStatus = {
  connected: boolean
  deviceName?: string
  deviceNumber?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function successRate(s: Summary): string {
  if (s.totalMessages === 0) return "—"
  return `${Math.round((s.totalSuccess / s.totalMessages) * 100)}%`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

function formatPhone(number: string) {
  if (!number) return ""
  if (number.length > 10) {
    const cc = number.slice(0, -10)
    const rest = number.slice(-10)
    return `+${cc} ${rest.slice(0, 5)} ${rest.slice(5)}`
  }
  return number
}

// ─── Small icons (inline SVG, no extra dep) ───────────────────────────────────

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#25D366" />
      <path d="M22.11 19.79c-.31.87-1.55 1.6-2.54 1.81-.68.14-1.56.26-4.53-1.04-3.8-1.63-6.25-5.5-6.44-5.75-.18-.25-1.5-2-.5-3.87.44-.82 1.1-1.3 1.7-1.3.2 0 .38.01.54.02.48.02.72.05 1.04.8.4.93 1.37 3.27 1.49 3.51.12.24.24.56.07.9-.16.35-.3.56-.54.84-.24.28-.47.5-.63.67-.24.25-.49.52-.21.99.28.46 1.25 2.04 2.68 3.31 1.84 1.63 3.36 2.15 3.87 2.38.41.19.64.16.88-.1.3-.32 1.3-1.52 1.64-2.04.34-.52.67-.44 1.13-.27.46.17 2.92 1.38 3.42 1.63.5.25.83.37.95.57.12.48-.18 1.87-.49 2.74z" fill="white" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── WhatsApp status bar ──────────────────────────────────────────────────────

function WhatsAppStatusBar() {
  const router = useRouter()
  const [wa, setWa] = useState<WAStatus | null>(null)
  const [checking, setChecking] = useState(true)

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status")
      if (!res.ok) { setChecking(false); return }
      const data: WAStatus = await res.json()
      setWa(data)
    } catch {
      // silently fail — status bar is non-blocking
    } finally {
      setChecking(false)
    }
  }, [])

  // Check on mount, then every 30 s
  useEffect(() => {
    poll()
    const t = setInterval(poll, 30_000)
    return () => clearInterval(t)
  }, [poll])

  const connected = wa?.connected === true

  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3
      ${connected
        ? "border-[#25D366]/30 bg-[#25D366]/6"
        : "border-border bg-card"
      }`}
    >
      {/* Left: icon + info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0">
          {checking ? (
            <div className="w-[34px] h-[34px] rounded-full bg-muted animate-pulse" />
          ) : (
            <div className="relative">
              <div className={`w-[34px] h-[34px] rounded-full flex items-center justify-center
                ${connected ? "bg-[#25D366]/12" : "bg-muted"}`}>
                <WhatsAppIcon size={20} />
              </div>
              {/* live dot */}
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background
                ${connected ? "bg-[#25D366]" : "bg-muted-foreground/40"}`} />
            </div>
          )}
        </div>
        <div className="min-w-0">
          {checking ? (
            <div className="h-4 w-28 bg-muted rounded animate-pulse" />
          ) : connected ? (
            <>
              <p className="text-sm font-medium leading-tight truncate">
                {wa?.deviceName || "WhatsApp"}
                <span className="ml-2 text-xs font-normal text-[#1a9e4e] dark:text-[#4ade80]">● Connected</span>
              </p>
              {wa?.deviceNumber && (
                <p className="text-xs text-muted-foreground truncate">{formatPhone(wa.deviceNumber)}</p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-medium leading-tight">WhatsApp</p>
              <p className="text-xs text-muted-foreground">Not connected</p>
            </>
          )}
        </div>
      </div>

      {/* Right: action button */}
      <button
        onClick={() => router.push("/connect-whatsapp")}
        className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-colors
          ${connected
            ? "border border-[#25D366]/40 text-[#1a9e4e] dark:text-[#4ade80] hover:bg-[#25D366]/10"
            : "bg-[#25D366] text-white hover:bg-[#1ebe5d] active:bg-[#18a850]"
          }`}
      >
        <WhatsAppIcon size={15} />
        {connected ? "Manage" : "Connect WhatsApp"}
      </button>
    </div>
  )
}

// ─── Delete confirmation modal ─────────────────────────────────────────────────

function ConfirmModal({
  message,
  onConfirm,
  onCancel,
  busy,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
  busy: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl p-6 flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center">
            <TrashIcon />
          </div>
          <div>
            <p className="font-semibold text-sm">Are you sure?</p>
            <p className="text-sm text-muted-foreground mt-0.5">{message}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 rounded-lg bg-destructive text-destructive-foreground px-4 py-2 text-sm font-semibold
                       hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [rows, setRows] = useState<CampaignRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Expand / timeline
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null)
  const [timelineLogs, setTimelineLogs] = useState<Record<string, any[]>>({})
  const [loadingLogs, setLoadingLogs] = useState<Record<string, boolean>>({})

  // Delete state
  type DeleteTarget = { type: "one"; campaignId: string; name: string } | { type: "all" }
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── load campaigns ──────────────────────────────────────────────────────────
  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/campaign-stats", { cache: "no-store" })
      if (res.status === 401) { window.location.href = "/login"; return }
      if (!res.ok) throw new Error(`status ${res.status}`)
      const data: StatsResponse = await res.json()
      setSummary(data.summary)
      setRows(data.recentCampaigns)
    } catch {
      setLoadError("Could not load analytics. Please refresh.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCampaigns() }, [loadCampaigns])

  // ── campaign accepted ───────────────────────────────────────────────────────
  function handleAccepted(info: AcceptedCampaign) {
    const newRow: CampaignRow = {
      campaignId: info.campaignId ?? `pending-${Date.now()}`,
      campaignName: info.campaignName,
      createdAt: new Date().toISOString(),
      total: info.total,
      success: 0,
      failed: 0,
      status: "sending",
    }
    setRows((prev) => [newRow, ...prev])
    setSummary((prev) =>
      prev ? { ...prev, totalCampaigns: prev.totalCampaigns + 1, totalMessages: prev.totalMessages + info.total } : prev
    )
  }

  // ── expand timeline ─────────────────────────────────────────────────────────
  async function toggleExpand(campaignId: string) {
    if (expandedCampaign === campaignId) { setExpandedCampaign(null); return }
    setExpandedCampaign(campaignId)
    if (!timelineLogs[campaignId] && !loadingLogs[campaignId]) {
      setLoadingLogs((prev) => ({ ...prev, [campaignId]: true }))
      try {
        const res = await fetch(`/api/campaign-logs?campaignId=${campaignId}`)
        if (res.ok) {
          const data = await res.json()
          setTimelineLogs((prev) => ({ ...prev, [campaignId]: data.logs || [] }))
        }
      } catch { /* ignore */ } finally {
        setLoadingLogs((prev) => ({ ...prev, [campaignId]: false }))
      }
    }
  }

  // ── delete ──────────────────────────────────────────────────────────────────
  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const url = deleteTarget.type === "all"
        ? "/api/campaigns?all=true"
        : `/api/campaigns?campaignId=${deleteTarget.campaignId}`
      const res = await fetch(url, { method: "DELETE" })
      if (!res.ok) throw new Error()
      // Refresh data
      setSummary(null); setRows([]); setLoading(true); setExpandedCampaign(null); setTimelineLogs({})
      await loadCampaigns()
    } catch {
      setLoadError("Delete failed. Please try again.")
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const statCards = [
    {
      label: "Total campaigns",
      value: summary ? String(summary.totalCampaigns) : "—",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: "Total messages",
      value: summary ? String(summary.totalMessages) : "—",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: "Success rate",
      value: summary ? successRate(summary) : "—",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ]

  return (
    <>
      {/* Delete confirm modal */}
      {deleteTarget && (
        <ConfirmModal
          message={
            deleteTarget.type === "all"
              ? "This will permanently delete all campaigns and their logs."
              : `This will permanently delete "${deleteTarget.name}" and its logs.`
          }
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={deleting}
        />
      )}

      <div className="flex flex-col gap-6">

        {/* ── WhatsApp status bar ─────────────────────────────────────────── */}
        <WhatsAppStatusBar />

        {/* ── Summary cards ──────────────────────────────────────────────── */}
        <section aria-label="Analytics summary" className="grid gap-3 sm:grid-cols-3">
          {statCards.map((c) => (
            <div key={c.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <span className="text-muted-foreground/60">{c.icon}</span>
              </div>
              <p className="text-2xl font-semibold tracking-tight">
                {loading ? <span className="text-muted-foreground">…</span> : c.value}
              </p>
            </div>
          ))}
        </section>

        {loadError && (
          <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {loadError}
          </div>
        )}

        {/* ── Start campaign ──────────────────────────────────────────────── */}
        <section aria-label="Start a campaign">
          <h2 className="mb-3 text-sm font-semibold">Start a campaign</h2>
          <CampaignSender onCampaignAccepted={handleAccepted} showResponsesPanel={false} />
        </section>

        {/* ── Campaign history ────────────────────────────────────────────── */}
        <section aria-label="Campaign history">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Campaign history</h2>
            {rows.length > 0 && (
              <button
                onClick={() => setDeleteTarget({ type: "all" })}
                className="flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5
                           text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <TrashIcon />
                Clear all history
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Campaign</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-right">Success</th>
                  <th className="px-4 py-3 font-medium text-right">Failed</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Created</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      {loading ? "Loading campaigns…" : "No campaigns yet."}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <React.Fragment key={r.campaignId}>
                      <tr
                        className={`border-b border-border transition-colors hover:bg-secondary/20
                          ${expandedCampaign === r.campaignId ? "bg-secondary/10" : ""}`}
                      >
                        {/* Name + expand */}
                        <td
                          className="px-4 py-3 cursor-pointer"
                          onClick={() => toggleExpand(r.campaignId)}
                        >
                          <span className="font-medium flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {expandedCampaign === r.campaignId ? <ChevronDown /> : <ChevronRight />}
                            </span>
                            {r.campaignName}
                          </span>
                          {r.status === "sending" && (
                            <span className="ml-6 mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                              sending…
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{r.total}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-green-600 dark:text-green-400">{r.success}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-red-500 dark:text-red-400">{r.failed}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">{fmtDate(r.createdAt)}</td>
                        {/* Delete button */}
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteTarget({ type: "one", campaignId: r.campaignId, name: r.campaignName })
                            }}
                            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 px-2.5 py-1
                                       text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <TrashIcon />
                            Delete
                          </button>
                        </td>
                      </tr>

                      {/* Expanded timeline */}
                      {expandedCampaign === r.campaignId && (
                        <tr className="border-b border-border bg-secondary/5">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="pl-6">
                              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                Message Timeline
                              </h3>
                              {loadingLogs[r.campaignId] ? (
                                <p className="text-sm text-muted-foreground">Loading timeline…</p>
                              ) : timelineLogs[r.campaignId]?.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                  {timelineLogs[r.campaignId].map((log, i) => (
                                    <div key={i} className="flex flex-wrap items-center gap-3 text-sm bg-background border border-border px-3 py-2.5 rounded-lg">
                                      <span className="font-mono text-xs text-muted-foreground w-[130px] shrink-0">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                      </span>
                                      <span className="font-mono text-xs font-medium w-[110px] shrink-0">{log.phone}</span>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium
                                        ${log.status === "success"
                                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                                        {log.status}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        Waited <span className="font-medium text-foreground">{log.delaySeconds}s</span>
                                      </span>
                                      {log.errorMessage && (
                                        <span className="text-xs text-red-500 w-full">{log.errorMessage}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground italic">No logs recorded yet for this campaign.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </>
  )
}
