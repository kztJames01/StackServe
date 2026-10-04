'use client'

import TasksPage from '@/components/TasksPage'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default function CallSheet() {
  return (
    <DashboardShell
      title="Call Sheet"
      description="Crew calls, shots, locations, and gear for the shoot."
    >
      <TasksPage />
    </DashboardShell>
  )
}
