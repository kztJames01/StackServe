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
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild className="font-[family-name:var(--font-geist-sans)]">
              <Link href={item.url}>
                <item.icon className="text-[#8a7f72]" />
                <span className="font-medium">{item.name}</span>
              </Link>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover className="text-[#d4c8b8] hover:text-[#8a7f72] hover:bg-[#f8f5f0]">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-48 rounded-xl bg-white border border-[#e8dcc7] shadow-xl shadow-[#252422]/10"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer hover:bg-[#f8f5f0] focus:bg-[#f8f5f0]">
                  <Link href={item.url} className="flex items-center gap-2">
                    <Folder className="size-4 text-[#8a7f72]" />
                    <span className="text-[#252422]">View Project</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg cursor-pointer hover:bg-[#f8f5f0] focus:bg-[#f8f5f0]">
                  <Forward className="size-4 text-[#8a7f72]" />
                  <span className="text-[#252422]">Share Project</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#e8dcc7]" />
                <DropdownMenuItem className="rounded-lg cursor-pointer hover:bg-[#f8f5f0] focus:bg-[#f8f5f0]">
                  <Trash2 className="size-4 text-[#8a7f72]" />
                  <span className="text-[#252422]">Archive Project</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
