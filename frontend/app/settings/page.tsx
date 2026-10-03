'use client';

import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';
import { AppearanceSettings } from '@/components/theme-provider';

export default function Page() {
  return (
    <DashboardShell title="Settings" description="Workspace preferences and account-level controls.">
      <CardSection tone="white">
        <AppearanceSettings />
      </CardSection>
    </DashboardShell>
  );
}


