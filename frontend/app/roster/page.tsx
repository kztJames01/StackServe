'use client'

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { SearchIcon } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { useQuery } from "@tanstack/react-query"
import { getWorkspaceRoster } from "@/lib/api/client"
import { useCurrentWorkspaceId } from "@/components/app-sidebar"
import ApiErrorState from "@/components/ApiErrorState"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  producer: 'Producer',
  clearance_counsel: 'Clearance Counsel',
  performer: 'Performer / Agent',
}

export default function RosterPage() {
  const workspaceId = useCurrentWorkspaceId()
  const [searchQuery, setSearchQuery] = useState("")

  const { data: roster = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['roster', workspaceId],
    queryFn: () => getWorkspaceRoster(workspaceId!),
    enabled: !!workspaceId,
  })

  const filtered = roster.filter(m =>
    !searchQuery.trim() ||
    m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.handle?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <DashboardShell title="Performer Roster" description="Performers, agents, and producers in this agency workspace.">
      <div className="flex justify-end">
        <Button asChild variant="outline"><Link href="/settings/workspace">Invite Performer or Agent</Link></Button>
      </div>
      <div className="relative max-w-md mb-8">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="text-muted-foreground" />
        </div>
        <Input
          type="text"
          placeholder="Search by name, role, or handle..."
          className="pl-10 py-6"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {!workspaceId ? (
        <p className="text-sm text-muted-foreground">Select or create a workspace to view the roster.</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading roster…</p>
      ) : isError ? (
        <ApiErrorState message={error instanceof Error ? error.message : 'Failed to load roster'} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{searchQuery ? 'No members match that search.' : 'No performers in this workspace yet. Invite crew to get started.'}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((member) => (
            <Card key={member.user_id} className="h-full hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={member.avatar || ''} alt={member.name} />
                  <AvatarFallback>{member.name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">{member.name}</CardTitle>
                  <CardDescription>{member.handle ? `@${member.handle}` : member.email}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Role</span>
                  <Badge variant="secondary">{ROLE_LABELS[member.role] || member.role}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}
