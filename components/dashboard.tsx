"use client"

import React, { useEffect, useState } from "react"
import { CampaignSender, type AcceptedCampaign } from "@/components/campaign-sender"

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

function successRate(s: Summary): string {
  if (s.totalMessages === 0) return "—"
  return `${Math.round((s.totalSuccess / s.totalMessages) * 100)}%`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

export function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [rows, setRows] = useState<CampaignRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null)
  const [timelineLogs, setTimelineLogs] = useState<Record<string, any[]>>({})
  const [loadingLogs, setLoadingLogs] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const res = await fetch("/api/campaign-stats", { cache: "no-store" })
        if (res.status === 401) {
          window.location.href = "/login"
          return
        }
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data: StatsResponse = await res.json()
        if (!active) return
        setSummary(data.summary)
        setRows(data.recentCampaigns)
      } catch {
        if (active) setLoadError("Could not load analytics. Please refresh.")
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  function handleAccepted(info: AcceptedCampaign) {
    // Optimistically add the new campaign to the top of the table.
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
      prev
        ? {
            ...prev,
            totalCampaigns: prev.totalCampaigns + 1,
            totalMessages: prev.totalMessages + info.total,
          }
        : prev,
    )
  }

  async function toggleExpand(campaignId: string) {
    if (expandedCampaign === campaignId) {
      setExpandedCampaign(null)
      return
    }
    setExpandedCampaign(campaignId)
    
    // Fetch logs if not already fetched
    if (!timelineLogs[campaignId] && !loadingLogs[campaignId]) {
      setLoadingLogs(prev => ({ ...prev, [campaignId]: true }))
      try {
        const res = await fetch(`/api/campaign-logs?campaignId=${campaignId}`)
        if (res.ok) {
          const data = await res.json()
          setTimelineLogs(prev => ({ ...prev, [campaignId]: data.logs || [] }))
        }
      } catch (err) {
        console.error("Failed to load logs", err)
      } finally {
        setLoadingLogs(prev => ({ ...prev, [campaignId]: false }))
      }
    }
  }

  const cards = [
    { label: "Total campaigns", value: summary ? String(summary.totalCampaigns) : "—" },
    { label: "Total messages", value: summary ? String(summary.totalMessages) : "—" },
    { label: "Success rate", value: summary ? successRate(summary) : "—" },
  ]

  return (
    <div className="flex flex-col gap-8">
      {/* Top: summary cards */}
      <section aria-label="Analytics summary" className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-card p-5 text-card-foreground">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {loading ? <span className="text-muted-foreground">…</span> : c.value}
            </p>
          </div>
        ))}
      </section>

      {loadError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {loadError}
        </div>
      )}

      {/* Middle: campaign sender form */}
      <section aria-label="Start a campaign">
        <h2 className="mb-3 text-sm font-semibold">Start a campaign</h2>
        <CampaignSender onCampaignAccepted={handleAccepted} showResponsesPanel={false} />
      </section>

      {/* Bottom: recent campaigns table */}
      <section aria-label="Recent campaigns">
        <h2 className="mb-3 text-sm font-semibold">Recent campaigns</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card text-card-foreground">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-right">Success</th>
                <th className="px-4 py-3 font-medium text-right">Failed</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    {loading ? "Loading campaigns…" : "No campaigns yet."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <React.Fragment key={r.campaignId}>
                    <tr 
                      className={`border-b border-border cursor-pointer hover:bg-secondary/20 transition-colors ${expandedCampaign === r.campaignId ? "bg-secondary/10" : ""}`}
                      onClick={() => toggleExpand(r.campaignId)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-4">
                            {expandedCampaign === r.campaignId ? "▼" : "▶"}
                          </span>
                          {r.campaignName}
                        </span>
                        {r.status === "sending" && (
                          <span className="ml-6 mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                            sending…
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.campaignId}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.total}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-green-600 font-medium">{r.success}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-red-600 font-medium">{r.failed}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.createdAt)}</td>
                    </tr>
                    {expandedCampaign === r.campaignId && (
                      <tr className="border-b border-border bg-secondary/5">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="pl-6">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                              Exact Timeline
                            </h3>
                            {loadingLogs[r.campaignId] ? (
                              <p className="text-sm text-muted-foreground">Loading timeline...</p>
                            ) : timelineLogs[r.campaignId]?.length > 0 ? (
                              <div className="flex flex-col gap-2">
                                {timelineLogs[r.campaignId].map((log, i) => (
                                  <div key={i} className="flex items-start gap-4 text-sm bg-background border border-border p-3 rounded-md">
                                    <div className="min-w-[140px] font-mono text-xs text-muted-foreground mt-0.5">
                                      {new Date(log.timestamp).toLocaleTimeString()}
                                    </div>
                                    <div className="font-mono text-xs font-medium w-[120px] mt-0.5">
                                      {log.phone}
                                    </div>
                                    <div className="w-[100px]">
                                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                        log.status === "success" 
                                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                      }`}>
                                        {log.status}
                                      </span>
                                    </div>
                                    <div className="flex-1">
                                      <span className="text-muted-foreground">Waited</span> <span className="font-medium">{log.delaySeconds}s</span> <span className="text-muted-foreground">before sending.</span>
                                      {log.errorMessage && (
                                        <p className="text-red-500 text-xs mt-1">{log.errorMessage}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">No timeline logs recorded yet for this campaign.</p>
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
  )
}
