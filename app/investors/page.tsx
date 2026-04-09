'use client';

import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';

export default function Page() {
  return (
    <DashboardShell title="Investor Space" description="Prepare your pitch and expose traction highlights to potential investors.">
      <CardSection tone="black">
        <p className="text-sm">Add deck links, traction metrics, and investment terms when ready.</p>
      </CardSection>
    </DashboardShell>
  );
}


