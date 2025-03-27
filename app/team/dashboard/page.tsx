

import { SidebarProvider } from "@/components/ui/sidebar"
import TeamDashboard from "@/components/team/Team"
export default function Team() {
    return (
      <SidebarProvider>
        <TeamDashboard />
      </SidebarProvider>
    )
  }