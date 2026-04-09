'use client';

import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';

export default function Page() {
  return (
    <DashboardShell title="Project History" description="Track milestones, pivots, and shipping velocity across your startup journey.">
      <CardSection tone="white">
        <p className="text-sm">Use this page to publish weekly retrospectives and archived delivery logs.</p>
      </CardSection>
    </DashboardShell>
  );
}


