'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getRiderReview, signRiderReview } from '@/lib/api/client'

function money(cents: number) {
  return `$${(Number(cents) / 100).toFixed(2)}`
}

export default function RiderSignForm({ token }: { token: string }) {
  const [typedName, setTypedName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const review = useQuery({ queryKey: ['rider-review', token], queryFn: () => getRiderReview(token) })
  const sign = useMutation({
    mutationFn: () => signRiderReview(token, typedName),
  })
  const rider = sign.data?.data || review.data

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg bg-background px-4 py-8 text-foreground sm:py-12">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">SynthPass</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sign digital replica rider</h1>
      <p className="mt-2 text-sm text-muted-foreground">Review the permitted use, territory, sunset date, and calculated session fee. Typing your name is the electronic signature. SynthPass is not a law firm.</p>

      {review.isLoading ? <p className="mt-8 text-sm text-muted-foreground">Loading rider…</p> : null}
      {review.isError ? <p role="alert" className="mt-8 text-sm text-destructive">{review.error instanceof Error ? review.error.message : 'This link is not valid'}</p> : null}

      {rider && (
        <section className="mt-6 space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
          <p><span className="text-muted-foreground">Performer </span>{rider.performer_name}</p>
          <p><span className="text-muted-foreground">Union </span>{rider.union_status}</p>
          <p><span className="text-muted-foreground">Replica </span>{rider.replica_type.split('_').join(' ')}</p>
          <p><span className="text-muted-foreground">Media </span>{rider.permitted_media.join(', ')}</p>
          <p><span className="text-muted-foreground">Territory </span>{rider.geographic_territory.join(', ')}</p>
          <p><span className="text-muted-foreground">Use </span>{rider.intended_use_description}</p>
          <p><span className="text-muted-foreground">Excluded </span>{rider.exclusionary_clauses.join(', ')}</p>
          <p><span className="text-muted-foreground">Term </span>{String(rider.starts_at).slice(0, 10)} to {String(rider.expires_at).slice(0, 10)}</p>
          <p><span className="text-muted-foreground">Session fee </span>{money(rider.total_session_fee_cents)} at {rider.replica_multiplier}x</p>
          <p><span className="text-muted-foreground">Pension and health </span>{money(rider.pension_health_cents)}</p>
          <p><span className="text-muted-foreground">Status </span>{rider.status.split('_').join(' ')}</p>
        </section>
      )}

      {rider?.status === 'SIGNED' ? (
        <p className="mt-6 text-sm">Signed by {rider.typed_name}{rider.signed_at ? ` on ${String(rider.signed_at).slice(0, 10)}` : ''}.</p>
      ) : rider && rider.status !== 'NOTICE_SENT' ? (
        <p className="mt-6 text-sm text-muted-foreground">This rider is not ready to sign yet.</p>
      ) : rider ? (
        <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); sign.mutate() }}>
          <label className="block text-sm font-medium">
            Full legal name
            <Input className="mt-1 h-12 text-base" autoComplete="name" value={typedName} onChange={(e) => setTypedName(e.target.value)} placeholder="Type your full legal name to sign" />
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input className="mt-1 size-4" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span>I agree to sign this rider electronically. My typed name, the time, and this device’s technical details will be stored with the PDF.</span>
          </label>
          {sign.isError && <p role="alert" className="text-sm text-destructive">{sign.error instanceof Error ? sign.error.message : 'Could not sign'}</p>}
          <Button className="h-12 w-full text-base" disabled={typedName.trim().length < 3 || !agreed || sign.isPending} type="submit">
            {sign.isPending ? 'Signing…' : 'Confirm signature'}
          </Button>
        </form>
      ) : null}
    </main>
  )
}
