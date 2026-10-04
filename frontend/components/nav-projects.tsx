"use client"

import Link from "next/link"
import {
  Folder,
  Forward,
  MoreHorizontal,
  Trash2,
  type LucideIcon,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavProjects({
  projects,
}: {
  projects: {
    name: string
    url: string
    icon: LucideIcon
  }[]
}) {
  const { isMobile } = useSidebar()

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Shoots</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild className="font-[family-name:var(--font-geist-sans)]">
              <Link href={item.url}>
                <item.icon className="text-muted-foreground" />
                <span className="font-medium">{item.name}</span>
              </Link>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover className="text-muted-foreground hover:text-muted-foreground hover:bg-muted">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-48 rounded-xl bg-card border border-border shadow-xl shadow-[#252422]/10"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer hover:bg-muted focus:bg-muted">
                  <Link href={item.url} className="flex items-center gap-2">
                    <Folder className="size-4 text-muted-foreground" />
                    <span className="text-foreground">View Shoot</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg cursor-pointer hover:bg-muted focus:bg-muted">
                  <Forward className="size-4 text-muted-foreground" />
                  <span className="text-foreground">Share Shoot</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem className="rounded-lg cursor-pointer hover:bg-muted focus:bg-muted">
                  <Trash2 className="size-4 text-muted-foreground" />
                  <span className="text-foreground">Archive Shoot</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
