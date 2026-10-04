"use client"

import * as React from "react"
import {
  Briefcase,
  Building2,
  Command,
  GalleryVerticalEnd,
  MessageSquare,
  Rocket,
  Sparkles,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { platformNav, projectNav } from "@/lib/navigation"
import { useQuery } from "@tanstack/react-query"
import { getMe } from "@/lib/api/client"

const data = {
  teams: [
    {
      name: "Studio North",
      logo: GalleryVerticalEnd,
      plan: "Agency",
    },
    {
      name: "Brightline Agency",
      logo: Rocket,
      plan: "Studio",
    },
    {
      name: "Freelance Desk",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: platformNav.map((item) => ({
    ...item,
    icon:
      item.title === "Workspace"
        ? Briefcase
        : item.title === "Roster"
          ? Building2
          : item.title === "Community"
            ? MessageSquare
            : Sparkles,
  })),
  projects: projectNav.map((project, index) => ({
    ...project,
    icon: index % 2 === 0 ? Command : Rocket,
  })),
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe })
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: me?.name || "Your account", email: me?.email || "", avatar: me?.avatar || "" }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
