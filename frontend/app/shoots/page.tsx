'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell'
import { getProjects, createProject, createAvailability, getWorkspaceRoster, getWorkspaces } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PlusIcon, MapPinIcon, UsersIcon } from 'lucide-react'
import Link from 'next/link'
import ApiErrorState from '@/components/ApiErrorState'
import { useCurrentWorkspaceId } from '@/components/app-sidebar'

export default function ShootsPage() {
  const workspaceId = useCurrentWorkspaceId()
  const queryClient = useQueryClient()
  const { data: workspaces = [] } = useQuery({ queryKey: ['workspaces'], queryFn: getWorkspaces })
  const workspaceRole = workspaces.find((workspace) => workspace.id === workspaceId)?.member_role
  const canBookShoot = workspaceRole === 'admin' || workspaceRole === 'producer'
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [client, setClient] = useState('')
  const [location, setLocation] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [pickedCrew, setPickedCrew] = useState<string[]>([])

  const { data: crewRoster = [] } = useQuery({
    queryKey: ['roster', workspaceId],
    queryFn: () => getWorkspaceRoster(workspaceId!),
    enabled: !!workspaceId,
  })

  const { data: shoots, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['shoots', workspaceId],
    queryFn: () => getProjects(workspaceId!),
    enabled: !!workspaceId,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error('Select a workspace first')
      const res = await createProject(workspaceId, {
        title,
        description: client ? `Client: ${client}` : '',
        image: '/home.jpg',
        tags: [client, location].filter(Boolean),
      })
      const shootId = String(res.data.id)
      // booking crew auto-creates hold rows on their calendars
      await Promise.all(
        pickedCrew.map((freelancerId) =>
          createAvailability({ freelancerId, start, end, status: 'hold', shootId })
        )
      )
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoots', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      setIsAdding(false)
      setTitle('')
      setClient('')
      setLocation('')
      setStart('')
      setEnd('')
      setPickedCrew([])
    },
  })

  const toggleCrew = (id: string) => {
    setPickedCrew((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  const canCreate = workspaceId && title.trim() && start && end

  return (
    <DashboardShell title="Shoots" description="Plan productions, book crew from your roster, and auto-hold their dates.">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Upcoming Shoots</h2>
        <Button disabled={!canBookShoot} onClick={() => setIsAdding(true)} className="flex gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <PlusIcon className="h-4 w-4" /> New Shoot
        </Button>
      </div>

      <CardSection tone="white">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading shoots…</p>
        ) : isError ? (
          <ApiErrorState
            message={error instanceof Error ? error.message : 'Failed to load shoots'}
            onRetry={() => refetch()}
          />
        ) : !shoots || shoots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No shoots yet. Book your first production above.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shoots.map((shoot) => (
              <Link key={shoot.id} href={`/projects/${shoot.slug}`} className="block">
                <div className="rounded-xl border bg-card p-4 space-y-3 text-card-foreground hover:shadow-lg transition-shadow h-full">
                  <p className="font-semibold text-sm">{shoot.title}</p>
                  <p className="text-xs text-muted-foreground break-words">{shoot.description || 'No client set'}</p>
                  <div className="flex flex-wrap gap-1">
                    {(shoot.tags || []).map((tag) => (
                      <span key={tag} className="text-xs bg-muted rounded-full px-2 py-0.5">
                        <MapPinIcon className="inline size-3 mr-1" />{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardSection>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-card p-6 border border-border max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold">Book a Shoot</h2>
            <div className="space-y-3">
              <Input placeholder="Shoot title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input placeholder="Client" value={client} onChange={(e) => setClient(e.target.value)} />
              <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Start</label>
                  <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">End</label>
                  <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  <UsersIcon className="inline size-3 mr-1" />Pick crew (dates are held automatically)
                </p>
                <div className="flex flex-wrap gap-2">
                  {crewRoster.map((c) => (
                    <button
                      key={c.user_id}
                      type="button"
                      onClick={() => toggleCrew(c.user_id)}
                      className="cursor-pointer"
                    >
                      <Badge variant={pickedCrew.includes(c.user_id) ? 'default' : 'outline'}>
                        {c.name} · {c.role}
                      </Badge>
                    </button>
                  ))}
                  {crewRoster.length === 0 && <p className="text-xs text-muted-foreground">No crew in this workspace yet.</p>}
                </div>
              </div>
            </div>
            {createMutation.isError && (
              <p role="alert" className="text-sm text-destructive">
                {createMutation.error instanceof Error ? createMutation.error.message : 'Failed to create shoot'}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                disabled={!canCreate || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? 'Booking…' : 'Book Shoot'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
