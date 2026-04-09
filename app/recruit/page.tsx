'use client';

import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';

export default function Page() {
  return (
    <DashboardShell title="Recruit Teammates" description="Post open roles and match with builders worldwide.">
      <CardSection tone="brown">
        <p className="text-sm">Define role scope, equity expectations, and stage fit before outreach.</p>
      </CardSection>
    </DashboardShell>
  );
}


