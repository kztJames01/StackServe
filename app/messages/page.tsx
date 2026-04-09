'use client';

import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';

export default function Page() {
  return (
    <DashboardShell title="Messages" description="Direct conversations with founders, teammates, and partners.">
      <CardSection tone="white">
        <p className="text-sm">Threaded conversations and collaborator outreach will appear here.</p>
      </CardSection>
    </DashboardShell>
  );
}


