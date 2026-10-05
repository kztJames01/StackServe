'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell'
import { downloadClearanceCertificate, exportPayrollBatch, getCompliance, getProjects } from '@/lib/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ApiErrorState from '@/components/ApiErrorState'
import { useCurrentWorkspaceId } from '@/components/app-sidebar'
import { auth } from '@/lib/firebase'
import { onIdTokenChanged } from 'firebase/auth'
import { io, type Socket } from 'socket.io-client'

function downloadText(filename: string, body: string, type: string) {
  const blob = new Blob([body], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function CompliancePage() {
  const queryClient = useQueryClient()
  const workspaceId = useCurrentWorkspaceId()
  const socketRef = useRef<Socket | null>(null)
  const [shootId, setShootId] = useState('')
  const [certBusy, setCertBusy] = useState(false)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['compliance', workspaceId],
    queryFn: () => getCompliance(workspaceId!),
    enabled: !!workspaceId,
  })

  const { data: shoots = [] } = useQuery({
    queryKey: ['shoots', workspaceId],
    queryFn: () => getProjects(workspaceId!),
    enabled: !!workspaceId,
  })

  useEffect(() => {
    if (!auth || !workspaceId) return
    let mounted = true
    const unsub = onIdTokenChanged(auth, async (user) => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      if (!mounted || !user) return
      const token = await user.getIdToken()
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'
      const socket = io(base, { transports: ['websocket'], auth: { token } })
      socket.emit('join-workspace', { workspaceId })
      socket.on('compliance:update', () => {
        queryClient.invalidateQueries({ queryKey: ['compliance', workspaceId] })
      })
      socketRef.current = socket
    })
    return () => {
      mounted = false
      unsub()
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [queryClient, workspaceId])

  const exportMut = useMutation({
    mutationFn: (format: 'WRAPBOOK_CSV' | 'GREENSLATE_JSON') =>
      exportPayrollBatch(workspaceId!, shootId, format),
    onSuccess: (res) => downloadText(res.filename, res.body, res.contentType),
  })

  return (
    <DashboardShell title="Clearance" description="Performer clearance and AI media status across this workspace.">
      {isLoading ? (
        <CardSection tone="white">
          <p className="text-sm text-muted-foreground">Running compliance checks…</p>
        </CardSection>
      ) : isError ? (
        <ApiErrorState
          message={error instanceof Error ? error.message : 'Failed to load compliance report'}
          onRetry={() => refetch()}
        />
      ) : data ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="destructive">{data.counts.red} red</Badge>
            <Badge variant="secondary">{data.counts.amber} amber</Badge>
            <Badge variant="outline">{data.counts.yellow} yellow</Badge>
            {data.green && <Badge>all clear</Badge>}
            <Button
              size="sm"
              variant="outline"
              disabled={!workspaceId || certBusy}
              onClick={async () => {
                if (!workspaceId) return
                setCertBusy(true)
                try { await downloadClearanceCertificate(workspaceId) } finally { setCertBusy(false) }
              }}
            >
              {certBusy ? 'Building…' : 'Download clearance certificate'}
            </Button>
          </div>

          <CardSection tone="white">
            <h2 className="text-lg font-semibold">Payroll export</h2>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <select
                className="rounded-md border px-3 py-2 text-sm bg-background"
                value={shootId}
                onChange={(e) => setShootId(e.target.value)}
                aria-label="Shoot for payroll"
              >
                <option value="">Select shoot</option>
                {shoots.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
              <Button size="sm" variant="outline" disabled={!shootId || exportMut.isPending} onClick={() => exportMut.mutate('WRAPBOOK_CSV')}>
                Wrapbook CSV
              </Button>
              <Button size="sm" variant="outline" disabled={!shootId || exportMut.isPending} onClick={() => exportMut.mutate('GREENSLATE_JSON')}>
                Greenslate JSON
              </Button>
            </div>
            {exportMut.isError && (
              <p role="alert" className="mt-2 text-xs text-destructive">
                {exportMut.error instanceof Error ? exportMut.error.message : 'Export failed'}
              </p>
            )}
          </CardSection>

          <CardSection tone="white">
            <h2 className="text-lg font-semibold text-destructive">Red — unlicensed delivered assets</h2>
            {data.red.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No delivered shoots with missing signatures.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.red.map((item) => (
                  <li key={`${item.shootId}-${item.reason}`} className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
                    <Link href={`/projects/${item.shootId}`} className="text-sm font-medium underline">
                      {item.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{item.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardSection>

          <CardSection tone="brown">
            <h2 className="text-lg font-semibold">Amber — licenses expiring within 30 days</h2>
            {data.amber.length === 0 ? (
              <p className="mt-2 text-sm">Nothing expiring soon.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.amber.map((item) => (
                  <li key={item.licenseId} className="rounded-lg border border-border p-3">
                    <Link href={`/projects/${item.shootId}`} className="text-sm font-medium underline">
                      License {item.licenseId}
                    </Link>
                    <p className="text-xs">{item.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardSection>

          <CardSection tone="white">
            <h2 className="text-lg font-semibold">Yellow — crew without a license row</h2>
            {data.yellow.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Every crew member on a call sheet has a license.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.yellow.map((item) => (
                  <li key={`${item.shootId}-${item.freelancerId}`} className="rounded-lg border border-border p-3">
                    <Link href={`/projects/${item.shootId}`} className="text-sm font-medium underline">
                      {item.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Performer {item.freelancerId} — {item.reason}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardSection>

          {data.green && (
            <CardSection tone="black">
              <p className="text-sm font-medium">Green — every delivered asset has a signed license. Nothing for legal to chase.</p>
            </CardSection>
          )}
        </div>
      ) : null}
    </DashboardShell>
  )
}
