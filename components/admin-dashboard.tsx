"use client"

import { useState, useEffect } from "react"

type ClientConfig = {
  email: string
  passwordHash: string
  webhookUrl?: string
  instanceName?: string
  incomingWebhookUrl?: string
  createdAt: string
}

export function AdminDashboard() {
  const [clients, setClients] = useState<ClientConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form State
  const [isEditing, setIsEditing] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [webhookUrl, setWebhookUrl] = useState("")
  const [instanceName, setInstanceName] = useState("")
  const [incomingWebhookUrl, setIncomingWebhookUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Webhook Testing State
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testingWebhook, setTestingWebhook] = useState(false)
  const [incomingTestResult, setIncomingTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testingIncomingWebhook, setTestingIncomingWebhook] = useState(false)

  async function handleTestWebhook() {
    setTestingWebhook(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/admin/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl })
      })
      const data = await res.json()
      setTestResult(data)
    } catch (err: any) {
      setTestResult({ success: false, message: "Network error occurred." })
    } finally {
      setTestingWebhook(false)
    }
  }

  async function handleTestIncomingWebhook() {
    setTestingIncomingWebhook(true)
    setIncomingTestResult(null)
    try {
      const res = await fetch("/api/admin/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: incomingWebhookUrl })
      })
      const data = await res.json()
      setIncomingTestResult(data)
    } catch (err: any) {
      setIncomingTestResult({ success: false, message: "Network error occurred." })
    } finally {
      setTestingIncomingWebhook(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/clients")
      if (!res.ok) throw new Error("Failed to load clients")
      const data = await res.json()
      setClients(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          passwordHash: password, 
          webhookUrl,
          instanceName,
          incomingWebhookUrl
        })
      })

      if (!res.ok) throw new Error("Failed to save client")
      
      await fetchClients()
      resetForm()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(emailToDelete: string) {
    if (!confirm(`Are you sure you want to delete ${emailToDelete}?`)) return
    
    try {
      const res = await fetch(`/api/admin/clients?email=${encodeURIComponent(emailToDelete)}`, {
        method: "DELETE"
      })
      if (!res.ok) throw new Error("Failed to delete client")
      await fetchClients()
    } catch (err: any) {
      alert(err.message)
    }
  }

  function handleEdit(client: ClientConfig) {
    setEmail(client.email)
    setPassword(client.passwordHash)
    setWebhookUrl(client.webhookUrl || "")
    setInstanceName(client.instanceName || "")
    setIncomingWebhookUrl(client.incomingWebhookUrl || "")
    setIsEditing(true)
    window.scrollTo(0, 0)
  }

  function resetForm() {
    setEmail("")
    setPassword("")
    setWebhookUrl("")
    setInstanceName("")
    setIncomingWebhookUrl("")
    setIsEditing(false)
    setTestResult(null)
    setIncomingTestResult(null)
  }

  if (loading) return <div>Loading admin data...</div>

  return (
    <div className="flex flex-col gap-8">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Form Section */}
      <section className="rounded-lg border border-border bg-card p-6 text-card-foreground">
        <h2 className="mb-4 text-lg font-semibold">{isEditing ? "Edit Client" : "Add New Client"}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Email Address</label>
              <input
                type="email"
                required
                disabled={isEditing}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                placeholder="client@example.com"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Password</label>
              <input
                type="text"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Secure password"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Instance Name (Evolution API)</label>
              <input
                type="text"
                value={instanceName}
                onChange={e => setInstanceName(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g. jameel"
              />
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Campaign Webhook URL (Optional)</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={e => {
                    setWebhookUrl(e.target.value)
                    setTestResult(null)
                  }}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="https://.../webhook/..."
                />
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={testingWebhook}
                  className="rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
                >
                  {testingWebhook ? "Testing..." : "Test"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">For sending campaigns. Falls back to default if blank.</p>
              {testResult && (
                <p className={`text-sm mt-1 ${testResult.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {testResult.success ? "✓ " : "✗ "}{testResult.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Auto-Reply Webhook URL (Optional)</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={incomingWebhookUrl}
                  onChange={e => {
                    setIncomingWebhookUrl(e.target.value)
                    setIncomingTestResult(null)
                  }}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="https://.../webhook/..."
                />
                <button
                  type="button"
                  onClick={handleTestIncomingWebhook}
                  disabled={testingIncomingWebhook}
                  className="rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
                >
                  {testingIncomingWebhook ? "Testing..." : "Test"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">For receiving messages (Auto-Reply). Falls back to default if blank.</p>
              {incomingTestResult && (
                <p className={`text-sm mt-1 ${incomingTestResult.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {incomingTestResult.success ? "✓ " : "✗ "}{incomingTestResult.message}
                </p>
              )}
            </div>
          </div>


          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Saving..." : isEditing ? "Update Client" : "Add Client"}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Table Section */}
      <section className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-secondary/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Instance</th>
                <th className="px-4 py-3 font-medium">Campaign Webhook</th>
                <th className="px-4 py-3 font-medium">Auto-Reply Webhook</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No clients created yet.</td>
                </tr>
              ) : (
                clients.map(client => (
                  <tr key={client.email} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{client.email}</td>
                    <td className="px-4 py-3 font-medium">{client.instanceName || <span className="italic text-muted-foreground">None</span>}</td>
                    <td className="px-4 py-3 max-w-[150px] truncate font-mono text-xs text-muted-foreground" title={client.webhookUrl}>
                      {client.webhookUrl || <span className="italic">Default</span>}
                    </td>
                    <td className="px-4 py-3 max-w-[150px] truncate font-mono text-xs text-muted-foreground" title={client.incomingWebhookUrl}>
                      {client.incomingWebhookUrl || <span className="italic">Default</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleEdit(client)} className="text-primary hover:underline text-xs mr-3">Edit</button>
                      <button onClick={() => handleDelete(client.email)} className="text-destructive hover:underline text-xs">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
