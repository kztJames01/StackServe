"use client"

import * as React from "react"
import { ChevronsUpDown, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Workspace } from "@/lib/api/client"

const STORAGE_KEY = 'synthpass-active-workspace'

export function useActiveWorkspace(workspaces: Workspace[]) {
  const [activeId, setActiveId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!workspaces.length) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && workspaces.some(w => w.id === stored)) {
        setActiveId(stored)
      } else {
        setActiveId(workspaces[0].id)
      }
    } catch {
      setActiveId(workspaces[0].id)
    }
  }, [workspaces])

  React.useEffect(() => {
    const sync = (event: Event) => setActiveId((event as CustomEvent<string>).detail)
    window.addEventListener('synthpass-workspace-change', sync)
    return () => window.removeEventListener('synthpass-workspace-change', sync)
  }, [])

  const setActive = (id: string) => {
    setActiveId(id)
    try { localStorage.setItem(STORAGE_KEY, id) } catch {}
    window.dispatchEvent(new CustomEvent('synthpass-workspace-change', { detail: id }))
  }

  return { activeId, setActive }
}

export function TeamSwitcher({
  workspaces,
  onCreateWorkspace,
}: {
  workspaces: Workspace[]
  onCreateWorkspace?: () => void
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { activeId, setActive } = useActiveWorkspace(workspaces)
  const active = workspaces.find(w => w.id === activeId) || workspaces[0]

  if (!active) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" onClick={onCreateWorkspace} className="gap-3">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Plus className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">New workspace</span>
              <span className="truncate text-xs text-muted-foreground">Get started</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const initials = active.name.slice(0, 2).toUpperCase()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-semibold text-xs">
                {initials}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{active.name}</span>
                <span className="truncate text-xs capitalize">{active.member_role.replace('_', ' ')}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl bg-card border border-border shadow-xl shadow-[#252422]/10"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1.5">
              Workspaces
            </DropdownMenuLabel>
            {workspaces.map((ws, index) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => {
                  setActive(ws.id)
                  router.push('/dashboard')
                }}
                className="gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-muted focus:bg-muted"
              >
                <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-foreground font-semibold text-xs">
                  {ws.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="font-medium text-foreground">{ws.name}</span>
                <DropdownMenuShortcut className="text-foreground">⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              className="gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-muted focus:bg-muted"
              onClick={onCreateWorkspace}
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-foreground">Add workspace</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
