'use client';

import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';

export default function Page() {
  return (
    <DashboardShell title="Settings" description="Workspace preferences and account-level controls.">
      <CardSection tone="white">
        <p className="text-sm">Configure defaults for profile visibility, alerts, and workflow behavior.</p>
      </CardSection>
    </DashboardShell>
  );
}


