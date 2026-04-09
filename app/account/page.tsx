'use client';

import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';

export default function Page() {
  return (
    <DashboardShell title="Account" description="Identity, credentials, and public profile controls.">
      <CardSection tone="white">
        <p className="text-sm">Update bio, social links, and account security settings here.</p>
      </CardSection>
    </DashboardShell>
  );
}


