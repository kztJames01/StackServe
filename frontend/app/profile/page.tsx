'use client'

import ProfilePage from '@/components/Profile'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default function Profile() {
  return (
    <DashboardShell
      title="Profile"
      description="Showcase your work, experience, and founder credibility."
    >
      <ProfilePage />
    </DashboardShell>
  )
}


