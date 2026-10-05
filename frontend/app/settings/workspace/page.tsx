'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell'
import { useCurrentWorkspaceId } from '@/components/app-sidebar'
import {
  getRateCards,
  getWorkspaceMembers,
  getWorkspaces,
  inviteToWorkspace,
  removeMember,
  updateMemberRole,
  WorkspaceRole,
} from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import ApiErrorState from '@/components/ApiErrorState'

const roles: { value: WorkspaceRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'producer', label: 'Producer' },
  { value: 'clearance_counsel', label: 'Clearance Counsel' },
  { value: 'performer', label: 'Performer / Agent' },
]

export default function WorkspaceSettingsPage() {
  const workspaceId = useCurrentWorkspaceId()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('performer')
  const [inviteLink, setInviteLink] = useState('')

  const { data: workspaces = [] } = useQuery({ queryKey: ['workspaces'], queryFn: getWorkspaces })
  const active = workspaces.find((workspace) => workspace.id === workspaceId)
  const canAdmin = active?.member_role === 'admin'
  const canInvite = canAdmin || active?.member_role === 'producer'

  const membersQuery = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => getWorkspaceMembers(workspaceId!),
    enabled: !!workspaceId,
  })
  const ratesQuery = useQuery({ queryKey: ['rate-cards'], queryFn: getRateCards })

  const invite = useMutation({
    mutationFn: () => inviteToWorkspace(workspaceId!, email, inviteRole),
    onSuccess: ({ data }) => {
      setInviteLink(`${window.location.origin}/workspaces/invites/${data.token}`)
      setEmail('')
    },
  })
  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: WorkspaceRole }) =>
      updateMemberRole(workspaceId!, userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] }),
  })
  const remove = useMutation({
    mutationFn: (userId: string) => removeMember(workspaceId!, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] }),
  })

  return (
    <DashboardShell title="Workspace Settings" description="Manage agency members, roles, invitations, and SAG-AFTRA rate cards.">
      {!active ? (
        <CardSection tone="white"><p className="text-sm text-muted-foreground">Create or select an agency workspace first.</p></CardSection>
      ) : (
        <>
          <CardSection tone="white">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="text-lg font-semibold">{active.name}</h2><p className="text-sm text-muted-foreground">{active.description || 'Agency workspace'}</p></div>
              <Badge variant="outline">{roles.find((role) => role.value === active.member_role)?.label}</Badge>
            </div>
          </CardSection>

          {canInvite && (
            <CardSection tone="white">
              <h2 className="text-lg font-semibold">Invite a member</h2>
              <p className="mt-1 text-sm text-muted-foreground">Invite a producer, clearance counsel, performer, or agent by email.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px_auto]">
                <Input type="email" placeholder="member@agency.com" value={email} onChange={(event) => setEmail(event.target.value)} />
                <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as WorkspaceRole)}>
                  {roles.filter((role) => canAdmin || role.value !== 'admin').map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
                <Button disabled={!email.trim() || invite.isPending} onClick={() => invite.mutate()}>{invite.isPending ? 'Creating…' : 'Create Invite'}</Button>
              </div>
              {inviteLink && <div className="mt-3"><label className="text-xs font-medium" htmlFor="invite-link">Invite link</label><Input id="invite-link" readOnly value={inviteLink} onFocus={(event) => event.currentTarget.select()} /></div>}
              {invite.isError && <p role="alert" className="mt-2 text-sm text-destructive">{invite.error instanceof Error ? invite.error.message : 'Invite failed'}</p>}
            </CardSection>
          )}

          <CardSection tone="white">
            <h2 className="text-lg font-semibold">Members</h2>
            {membersQuery.isLoading ? <p className="mt-3 text-sm text-muted-foreground">Loading members…</p> : membersQuery.isError ? (
              <ApiErrorState message={membersQuery.error instanceof Error ? membersQuery.error.message : 'Failed to load members'} onRetry={() => membersQuery.refetch()} />
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {(membersQuery.data || []).map((member) => (
                  <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div><p className="font-medium">{member.name || member.email}</p><p className="text-sm text-muted-foreground">{member.email}</p></div>
                    <div className="flex items-center gap-2">
                      {canAdmin ? (
                        <select aria-label={`Role for ${member.name || member.email}`} className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={member.role} disabled={changeRole.isPending} onChange={(event) => changeRole.mutate({ userId: member.user_id, role: event.target.value as WorkspaceRole })}>
                          {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                        </select>
                      ) : <Badge variant="secondary">{roles.find((role) => role.value === member.role)?.label}</Badge>}
                      {canAdmin && member.user_id !== active.owner_id && <Button variant="outline" size="sm" disabled={remove.isPending} onClick={() => remove.mutate(member.user_id)}>Remove</Button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardSection>

          <CardSection tone="white">
            <h2 className="text-lg font-semibold">SAG-AFTRA Commercial Rate Cards</h2>
            <p className="mt-1 text-sm text-muted-foreground">Baseline categories used when planning performer compensation.</p>
            {ratesQuery.isLoading ? <p className="mt-3 text-sm text-muted-foreground">Loading rate cards…</p> : (
              <ul className="mt-3 divide-y divide-border">
                {(ratesQuery.data || []).map((rate) => (
                  <li key={rate.id} className="flex items-center justify-between gap-3 py-3">
                    <div><p className="font-medium">{rate.job_category}</p><p className="text-sm text-muted-foreground">{rate.union_code} · {rate.scale_type}</p></div>
                    <p className="font-medium">${(rate.day_rate_cents / 100).toFixed(2)} / day</p>
                  </li>
                ))}
              </ul>
            )}
          </CardSection>
        </>
      )}
    </DashboardShell>
  )
}
