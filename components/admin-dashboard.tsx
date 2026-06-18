"use client"

import { useState, useEffect } from "react"

type ClientConfig = {
  email: string
  passwordHash: string
  webhookUrl?: string
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
  const [submitting, setSubmitting] = useState(false)

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
        body: JSON.stringify({ email, passwordHash: password, webhookUrl })
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
    setIsEditing(true)
    window.scrollTo(0, 0)
  }

  function resetForm() {
    setEmail("")
    setPassword("")
    setWebhookUrl("")
    setIsEditing(false)
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
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Webhook URL (Optional)</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="https://rafproj1.sitesv2.../webhook/..."
            />
            <p className="text-xs text-muted-foreground">If left blank, it falls back to the default webhook in .env.local</p>
          </div>
          <div className="flex gap-2">
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
                <th className="px-4 py-3 font-medium">Password</th>
                <th className="px-4 py-3 font-medium">Webhook Override</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No clients created yet.</td>
                </tr>
              ) : (
                clients.map(client => (
                  <tr key={client.email} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{client.email}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{client.passwordHash}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate font-mono text-xs text-muted-foreground" title={client.webhookUrl}>
                      {client.webhookUrl || <span className="italic">Default</span>}
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
