'use client'

import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell'
import { AppearanceSettings } from '@/components/theme-provider'

export default function PreferencesPage() {
  return (
    <DashboardShell title="Preferences" description="Theme and how SynthPass looks on this browser.">
      <CardSection tone="white">
        <AppearanceSettings />
      </CardSection>
    </DashboardShell>
  )
}
