"use client"

import * as React from "react"
import {
  Briefcase,
  Building2,
  Command,
  MessageSquare,
  Rocket,
  Sparkles,
} from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher, useActiveWorkspace } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { platformNav } from "@/lib/navigation"
import { createWorkspace, getMe, getProjects, getWorkspaces } from "@/lib/api/client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const navMain = platformNav.map((item) => ({
  ...item,
  icon:
    item.title === "Workspace"
      ? Briefcase
      : item.title === "Roster"
        ? Building2
        : item.title === "Community"
          ? MessageSquare
          : Sparkles,
}))

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const queryClient = useQueryClient()
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe })
  const { data: workspaces = [] } = useQuery({ queryKey: ['workspaces'], queryFn: getWorkspaces })
  const { activeId } = useActiveWorkspace(workspaces)
  const { data: shoots = [] } = useQuery({
    queryKey: ['shoots', activeId],
    queryFn: () => getProjects(activeId!),
    enabled: !!activeId,
  })
  const projects = shoots.map((shoot, index) => ({
    name: shoot.title,
    url: `/projects/${shoot.slug}`,
    icon: index % 2 === 0 ? Command : Rocket,
  }))
  const [creating, setCreating] = useState(false)
  const [wsName, setWsName] = useState('')

  const createMutation = useMutation({
    mutationFn: () => createWorkspace({ name: wsName.trim() }),
    onSuccess: ({ data }) => {
      localStorage.setItem('synthpass-active-workspace', data.id)
      window.dispatchEvent(new CustomEvent('synthpass-workspace-change', { detail: data.id }))
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      setCreating(false)
      setWsName('')
    },
  })

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher
          workspaces={workspaces}
          onCreateWorkspace={() => setCreating(true)}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: me?.name || "Your account", email: me?.email || "", avatar: me?.avatar || "" }} />
      </SidebarFooter>
      <SidebarRail />

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-6 border border-border">
            <h2 className="text-lg font-bold">New workspace</h2>
            <Input
              placeholder="Agency name"
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
              autoFocus
            />
            {createMutation.isError && (
              <p className="text-sm text-destructive">
                {createMutation.error instanceof Error ? createMutation.error.message : 'Failed'}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setCreating(false); setWsName('') }}>Cancel</Button>
              <Button
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                disabled={!wsName.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Sidebar>
  )
}

// expose active workspace id for pages that need it
export function useCurrentWorkspaceId() {
  const { data: workspaces = [] } = useQuery({ queryKey: ['workspaces'], queryFn: getWorkspaces })
  const { activeId } = useActiveWorkspace(workspaces)
  return activeId
}
