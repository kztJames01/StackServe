'use client'

import Team from '@/components/Team'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default function TeamProfile() {
  return (
    <DashboardShell
      title="Team Dashboard"
      description="Coordinate teammates, sprint notes, and delivery progress."
    >
      <Team />
    </DashboardShell>
  )
}


