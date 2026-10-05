'use client'

import { useQueries } from '@tanstack/react-query'
import Link from 'next/link'
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import ApiErrorState from '@/components/ApiErrorState'
import { useCurrentWorkspaceId } from '@/components/app-sidebar'
import {
  getProjects,
  getWorkspaceRoster,
  getWorkspaceRiders,
  getShootMedia,
  getCompliance,
} from '@/lib/api/client'

const RIDER_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  NOTICE_SENT: 'Notice sent',
  SIGNED: 'Signed',
}

export default function WorkspaceDashboardPage() {
  const workspaceId = useCurrentWorkspaceId()

  const [shootsQ, rosterQ, ridersQ, mediaQ, complianceQ] = useQueries({
    queries: [
      {
        queryKey: ['dashboard-shoots', workspaceId],
        queryFn: () => getProjects(workspaceId!),
        enabled: !!workspaceId,
      },
      {
        queryKey: ['dashboard-roster', workspaceId],
        queryFn: () => getWorkspaceRoster(workspaceId!),
        enabled: !!workspaceId,
      },
      {
        queryKey: ['dashboard-riders', workspaceId],
        queryFn: () => getWorkspaceRiders(workspaceId!),
        enabled: !!workspaceId,
      },
      {
        queryKey: ['dashboard-media', workspaceId],
        queryFn: () => getShootMedia(workspaceId!),
        enabled: !!workspaceId,
      },
      {
        queryKey: ['dashboard-compliance', workspaceId],
        queryFn: () => getCompliance(workspaceId!),
        enabled: !!workspaceId,
      },
    ],
  })

  const loading = shootsQ.isLoading || rosterQ.isLoading || ridersQ.isLoading || mediaQ.isLoading || complianceQ.isLoading
  const failed = [shootsQ, rosterQ, ridersQ, mediaQ, complianceQ].find((q) => q.isError)

  const shoots = shootsQ.data ?? []
  const roster = rosterQ.data ?? []
  const riders = ridersQ.data ?? []
  const media = mediaQ.data ?? []
  const compliance = complianceQ.data

  const ridersNeedingAction = riders.filter((r) => r.status !== 'SIGNED')
  const verifiedMedia = media.filter((m) => m.upload_state === 'verified').length
  const deliveredShoots = shoots.filter((s) => s.status === 'delivered').length
  const performerCount = roster.filter((m) => m.role === 'performer').length

  return (
    <DashboardShell
      title="Workspace Dashboard"
      description="Everything happening in this workspace at a glance."
      workspaceHome
    >
      {loading ? (
        <CardSection tone="white">
          <p className="text-sm text-muted-foreground">Loading workspace overview…</p>
        </CardSection>
      ) : failed ? (
        <ApiErrorState
          message={failed.error instanceof Error ? failed.error.message : 'Failed to load workspace overview'}
          onRetry={() => {
            shootsQ.refetch()
            rosterQ.refetch()
            ridersQ.refetch()
            mediaQ.refetch()
            complianceQ.refetch()
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* headline numbers */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <CardSection tone="white">
              <p className="text-2xl font-semibold">{shoots.length}</p>
              <p className="text-xs text-muted-foreground">Shoots ({deliveredShoots} delivered)</p>
            </CardSection>
            <CardSection tone="white">
              <p className="text-2xl font-semibold">{roster.length}</p>
              <p className="text-xs text-muted-foreground">Roster members ({performerCount} performers)</p>
            </CardSection>
            <CardSection tone="white">
              <p className="text-2xl font-semibold">{ridersNeedingAction.length}</p>
              <p className="text-xs text-muted-foreground">Riders awaiting signature</p>
            </CardSection>
            <CardSection tone="white">
              <p className="text-2xl font-semibold">{media.length}</p>
              <p className="text-xs text-muted-foreground">Media assets ({verifiedMedia} verified)</p>
            </CardSection>
          </div>

          {/* clearance status */}
          <CardSection tone="white">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Clearance status</h2>
              <Link href="/compliance">
                <Button variant="outline" size="sm">Open clearance</Button>
              </Link>
            </div>
            {compliance ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="destructive">{compliance.counts.red} red</Badge>
                <Badge variant="secondary">{compliance.counts.amber} amber</Badge>
                <Badge variant="outline">{compliance.counts.yellow} yellow</Badge>
                {compliance.green && <Badge>all clear</Badge>}
              </div>
            ) : null}
            {compliance && compliance.red.length > 0 && (
              <ul className="mt-3 space-y-2">
                {compliance.red.slice(0, 3).map((item) => (
                  <li key={item.shootId} className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
                    <Link href={`/projects/${item.shootId}`} className="text-sm font-medium underline">
                      {item.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{item.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardSection>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* shoots */}
            <CardSection tone="white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Shoots</h2>
                <Link href="/shoots">
                  <Button variant="outline" size="sm">All shoots</Button>
                </Link>
              </div>
              {shoots.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No shoots yet. Create your first shoot to get started.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {shoots.slice(0, 5).map((shoot) => (
                    <li key={shoot.id} className="flex items-center justify-between rounded-lg border p-3">
                      <Link href={`/projects/${shoot.slug}`} className="text-sm font-medium underline">
                        {shoot.title}
                      </Link>
                      {shoot.status && <Badge variant="outline">{shoot.status}</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </CardSection>

            {/* riders */}
            <CardSection tone="white">
              <h2 className="text-lg font-semibold">Digital replica riders</h2>
              {riders.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No AB 2602 riders drafted yet. Draft one from a shoot page before using a digital replica.
                </p>
              ) : ridersNeedingAction.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">All riders are signed.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {ridersNeedingAction.slice(0, 5).map((rider) => (
                    <li key={rider.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <Link href={`/projects/${rider.shoot_id}`} className="text-sm font-medium underline">
                          {rider.performer_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {rider.advance_notice_given_at
                            ? `Notice sent ${new Date(rider.advance_notice_given_at).toLocaleDateString()}`
                            : 'Notice not sent'}
                        </p>
                      </div>
                      <Badge variant={rider.status === 'NOTICE_SENT' ? 'secondary' : 'outline'}>
                        {RIDER_STATUS_LABEL[rider.status] ?? rider.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardSection>

            {/* media */}
            <CardSection tone="white">
              <h2 className="text-lg font-semibold">Media assets</h2>
              {media.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No media uploaded yet. Upload deliverables from a shoot page.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {media.slice(0, 5).map((asset) => (
                    <li key={asset.id} className="flex items-center justify-between rounded-lg border p-3">
                      <span className="truncate text-sm">{asset.filename}</span>
                      <Badge variant={asset.upload_state === 'verified' ? 'default' : 'outline'}>{asset.upload_state}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardSection>

            {/* roster */}
            <CardSection tone="white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Roster</h2>
                <Link href="/roster">
                  <Button variant="outline" size="sm">Manage roster</Button>
                </Link>
              </div>
              {roster.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Invite your team from the roster page.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {roster.slice(0, 5).map((member) => (
                    <li key={member.user_id} className="flex items-center justify-between rounded-lg border p-3">
                      <span className="truncate text-sm">{member.email}</span>
                      <Badge variant="outline">{member.role}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardSection>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
