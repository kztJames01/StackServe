'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CardSection } from '@/components/layout/dashboard-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import ApiErrorState from '@/components/ApiErrorState'
import { draftRider, getShootRiders, sendRiderNotice, WorkspaceMember } from '@/lib/api/client'

const MEDIA = [
  ['BROADCAST_TV', 'Broadcast TV'],
  ['DIGITAL_SOCIAL', 'Digital / social'],
  ['THEATRICAL', 'Theatrical'],
  ['PRINT', 'Print'],
]
const REPLICA = [
  ['VISUAL_LIKENESS', 'Visual likeness'],
  ['VOICE_SYNTHESIS', 'Voice synthesis'],
  ['FULL_DIGITAL_TWIN', 'Full digital twin'],
]
const UNIONS = ['SAG-AFTRA', 'ACTRA', 'NON_UNION']
const EXCLUSIONS = [
  ['NO_SEXUAL', 'No sexual content'],
  ['NO_POLITICAL', 'No political use'],
  ['NO_ALCOHOL_TOBACCO', 'No alcohol or tobacco'],
  ['NO_DEFAMATION', 'No defamation'],
]

function money(cents: number) {
  return `$${(Number(cents) / 100).toFixed(2)}`
}

function day(value: string) {
  return String(value).slice(0, 10)
}

export default function DigitalRiderPanel({
  workspaceId,
  shootId,
  roster,
  canManage,
}: {
  workspaceId: string
  shootId: string
  roster: WorkspaceMember[]
  canManage: boolean
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [performerId, setPerformerId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [agentEmail, setAgentEmail] = useState('')
  const [unionStatus, setUnionStatus] = useState('SAG-AFTRA')
  const [replicaType, setReplicaType] = useState('VISUAL_LIKENESS')
  const [media, setMedia] = useState<string[]>(['BROADCAST_TV'])
  const [territory, setTerritory] = useState('US')
  const [useText, setUseText] = useState('')
  const [excluded, setExcluded] = useState<string[]>(['NO_SEXUAL', 'NO_DEFAMATION'])
  const [startsAt, setStartsAt] = useState('')
  const [months, setMonths] = useState('12')
  const [baseDollars, setBaseDollars] = useState('')
  const [linkFor, setLinkFor] = useState<string | null>(null)

  const riders = useQuery({
    queryKey: ['riders', workspaceId, shootId],
    queryFn: () => getShootRiders(workspaceId, shootId),
  })

  const baseCents = Math.round(Number(baseDollars || 0) * 100)
  const sessionFee = Math.round(baseCents * 1.5)
  const pension = Math.round(sessionFee * 0.21)

  function toggle(list: string[], value: string, setList: (next: string[]) => void) {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
  }

  function pickPerformer(id: string) {
    setPerformerId(id)
    const person = roster.find((member) => member.user_id === id)
    if (!person) return
    setName(person.name || '')
    setEmail(person.email || '')
  }

  const create = useMutation({
    mutationFn: () => draftRider({
      workspace_id: workspaceId,
      shoot_id: shootId,
      performer_id: performerId || undefined,
      performer_name: name,
      performer_email: email,
      agent_email: agentEmail || undefined,
      union_status: unionStatus,
      replica_type: replicaType,
      permitted_media: media,
      geographic_territory: territory.split(',').map((item) => item.trim()).filter(Boolean),
      intended_use_description: useText,
      exclusionary_clauses: excluded,
      starts_at: startsAt,
      duration_months: Number(months),
      base_scale_rate_cents: baseCents,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riders', workspaceId, shootId] })
      setOpen(false)
    },
  })

  const notice = useMutation({
    mutationFn: (id: string) => sendRiderNotice(id, workspaceId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['riders', workspaceId, shootId] })
      if (res.data.notice_token) setLinkFor(res.data.notice_token)
    },
  })

  return (
    <CardSection tone="white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Digital Replica Rider</h2>
          <p className="mt-1 text-sm text-muted-foreground">AB 2602 specific consent, 48-hour notice, and the 1.5x SAG-AFTRA session fee with 21% P&H. This is a calculation and record tool, not legal advice.</p>
        </div>
        <Button disabled={!canManage} size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => setOpen((value) => !value)}>
          New Rider
        </Button>
      </div>
      {!canManage && <p className="mt-2 text-sm text-muted-foreground">An Admin, Producer, or Clearance Counsel can draft a rider.</p>}

      {open && (
        <div className="mt-4 space-y-3 rounded-xl border border-border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-muted-foreground">
              Performer on this roster
              <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={performerId} onChange={(e) => pickPerformer(e.target.value)}>
                <option value="">Type a performer instead</option>
                {roster.map((member) => <option key={member.user_id} value={member.user_id}>{member.name} · {member.role}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Legal name
              <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Johnson" />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Performer email
              <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@agency.com" />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Agent email
              <Input className="mt-1" type="email" value={agentEmail} onChange={(e) => setAgentEmail(e.target.value)} placeholder="optional" />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Union status
              <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={unionStatus} onChange={(e) => setUnionStatus(e.target.value)}>
                {UNIONS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Replica type
              <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={replicaType} onChange={(e) => setReplicaType(e.target.value)}>
                {REPLICA.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Territories
              <Input className="mt-1" value={territory} onChange={(e) => setTerritory(e.target.value)} placeholder="US, CA" />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Base scale (USD)
              <Input className="mt-1" type="number" min="1" step="0.01" value={baseDollars} onChange={(e) => setBaseDollars(e.target.value)} placeholder="1000.00" />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Starts
              <Input className="mt-1" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Sunset after (months)
              <Input className="mt-1" type="number" min="1" value={months} onChange={(e) => setMonths(e.target.value)} />
            </label>
          </div>
          <label className="block text-xs font-medium text-muted-foreground">
            Intended use (AB 2602 needs the specific commercial use)
            <textarea className="mt-1 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={useText} onChange={(e) => setUseText(e.target.value)} placeholder="Hero visual replica for the Acme spring commercial, broadcast and social cutdowns only." />
          </label>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Permitted media</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {MEDIA.map(([value, label]) => (
                <button key={value} type="button" onClick={() => toggle(media, value, setMedia)}>
                  <Badge variant={media.includes(value) ? 'default' : 'outline'}>{label}</Badge>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Exclusionary clauses</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXCLUSIONS.map(([value, label]) => (
                <button key={value} type="button" onClick={() => toggle(excluded, value, setExcluded)}>
                  <Badge variant={excluded.includes(value) ? 'default' : 'outline'}>{label}</Badge>
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm">Session fee {money(sessionFee)} at 1.5x. Pension and health {money(pension)} at 21%.</p>
          {create.isError && <p role="alert" className="text-sm text-destructive">{create.error instanceof Error ? create.error.message : 'Could not draft the rider'}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={!name || !email || useText.trim().length < 40 || !startsAt || baseCents <= 0 || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Saving…' : 'Create Rider Draft'}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4">
        {riders.isLoading ? <p className="text-sm text-muted-foreground">Loading riders…</p> : riders.isError ? (
          <ApiErrorState message={riders.error instanceof Error ? riders.error.message : 'Failed to load riders'} onRetry={() => riders.refetch()} />
        ) : !riders.data?.length ? (
          <p className="text-sm text-muted-foreground">No digital replica riders yet.</p>
        ) : (
          <ul className="space-y-2">
            {riders.data.map((rider) => (
              <li key={rider.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{rider.performer_name} · {rider.replica_type.split('_').join(' ')}</p>
                    <p className="text-xs text-muted-foreground">{day(rider.starts_at)} to {day(rider.expires_at)} · {money(rider.total_session_fee_cents)} session · {money(rider.pension_health_cents)} P&H</p>
                  </div>
                  <Badge variant={rider.status === 'SIGNED' ? 'default' : 'outline'}>{rider.status.split('_').join(' ')}</Badge>
                </div>
                {rider.status === 'DRAFT' && (
                  <Button className="mt-3" size="sm" disabled={!canManage || notice.isPending} onClick={() => notice.mutate(rider.id)}>Send 48-hour notice</Button>
                )}
                {rider.notice_token && rider.status !== 'SIGNED' && (
                  <p className="mt-2 break-all text-xs">
                    <a className="underline" href={`/contracts/sign/${rider.notice_token}`}>Open performer sign page</a>
                  </p>
                )}
                {linkFor && rider.notice_token === linkFor && <p className="mt-2 text-xs text-muted-foreground">48-hour notice recorded.</p>}
                {rider.typed_name && <p className="mt-2 text-xs text-muted-foreground">Signed by {rider.typed_name}{rider.signed_at ? ` on ${day(rider.signed_at)}` : ''}</p>}
              </li>
            ))}
          </ul>
        )}
        {notice.isError && <p role="alert" className="mt-2 text-sm text-destructive">{notice.error instanceof Error ? notice.error.message : 'Could not send notice'}</p>}
      </div>
    </CardSection>
  )
}
