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

const data = {
  user: {
    name: "Founder",
    email: "founder@nxtgen.community",
    avatar: "/home.jpg",
  },
  teams: [
    {
      name: "NxtGen Core",
      logo: GalleryVerticalEnd,
      plan: "Growth",
    },
    {
      name: "Startup Circle",
      logo: Rocket,
      plan: "Community",
    },
    {
      name: "Investor Desk",
      logo: Command,
      plan: "Network",
    },
  ],
  navMain: platformNav.map((item) => ({
    ...item,
    icon:
      item.title === "Workspace"
        ? Briefcase
        : item.title === "Growth"
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
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
