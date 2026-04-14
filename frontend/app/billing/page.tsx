'use client';

import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';

export default function Page() {
  return (
    <DashboardShell title="Billing" description="Plan usage, invoices, and payment settings.">
      <CardSection tone="brown">
        <p className="text-sm">Manage subscription level and billing contacts for your team.</p>
      </CardSection>
    </DashboardShell>
  );
}


