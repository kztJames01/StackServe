'use client';

import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';

export default function Page() {
  return (
    <DashboardShell title="Notifications" description="Project invites, comments, and opportunity alerts.">
      <CardSection tone="brown">
        <p className="text-sm">Use this stream to prioritize responses and unblock momentum.</p>
      </CardSection>
    </DashboardShell>
  );
}


