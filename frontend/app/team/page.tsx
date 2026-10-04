'use client'

import Team from '@/components/Team'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default function TeamProfile() {
  return (
    <DashboardShell
      title="Workspace Dashboard"
      description="Coordinate crew, shoot notes, and delivery progress."
    >
      <Team />
    </DashboardShell>
  )
}


