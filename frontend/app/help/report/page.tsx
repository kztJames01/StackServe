'use client'

import { FormEvent, useState } from 'react'
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function ReportBugPage() {
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setCopied(false)
    setError('')
    if (!title.trim() || detail.trim().length < 10) {
      setError('Add a short title and at least a sentence about what happened.')
      return
    }
    const report = `SynthPass bug\n${title.trim()}\n\n${detail.trim()}\n\nPage: ${window.location.href}`
    try {
      await navigator.clipboard.writeText(report)
      setCopied(true)
    } catch {
      setError('Could not copy the report. Select the text and copy it yourself.')
    }
  }

  return (
    <DashboardShell title="Report a Bug" description="Describe what broke. A bug inbox is not connected yet, so this copies a report you can send.">
      <CardSection tone="white">
        <form className="max-w-xl space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label htmlFor="bug-title" className="text-sm font-medium">What broke</label>
            <Input id="bug-title" value={title} maxLength={120} required onChange={(event) => setTitle(event.target.value)} placeholder="Shoots page did not save the crew" />
          </div>
          <div className="space-y-2">
            <label htmlFor="bug-detail" className="text-sm font-medium">Steps</label>
            <Textarea id="bug-detail" value={detail} required minLength={10} maxLength={4000} rows={6} onChange={(event) => setDetail(event.target.value)} placeholder="What you clicked, what you expected, and what you saw." />
          </div>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          {copied ? <p role="status" className="text-sm">Copied. Send it to your SynthPass contact. Nothing was filed in the app.</p> : null}
          <Button type="submit">Copy report</Button>
        </form>
      </CardSection>
    </DashboardShell>
  )
}
