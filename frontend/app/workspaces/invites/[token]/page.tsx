'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell'
import { acceptWorkspaceInvite } from '@/lib/api/client'
import { Button } from '@/components/ui/button'

export default function AcceptWorkspaceInvitePage() {
  const params = useParams<{ token: string }>()
  const queryClient = useQueryClient()
  const accept = useMutation({
    mutationFn: () => acceptWorkspaceInvite(params.token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspaces'] }),
  })

  return (
    <DashboardShell title="Workspace Invitation" description="Join an agency workspace with the role selected by its administrator.">
      <CardSection tone="white">
        {accept.isSuccess ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Invitation accepted</h2>
            <p className="text-sm text-muted-foreground">You can now access this agency workspace, its roster, shoots, and media records.</p>
            <Button asChild><Link href="/shoots">Open Shoots</Link></Button>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Accept invitation</h2>
            <p className="text-sm text-muted-foreground">The invitation must match the email address on your signed-in SynthPass account.</p>
            <Button disabled={accept.isPending} onClick={() => accept.mutate()}>{accept.isPending ? 'Joining…' : 'Join Workspace'}</Button>
            {accept.isError && <p role="alert" className="text-sm text-destructive">{accept.error instanceof Error ? accept.error.message : 'Could not accept invitation'}</p>}
          </div>
        )}
      </CardSection>
    </DashboardShell>
  )
}
