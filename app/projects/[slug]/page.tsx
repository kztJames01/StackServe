'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';

export default function ProjectDetailPage() {
  const params = useParams<{ slug: string }>();
  const title = useMemo(
    () => (params.slug || 'project').split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' '),
    [params.slug],
  );

  return (
    <DashboardShell title={title} description="Project workspace for team updates, recruiting, and investor visibility.">
      <div className="grid gap-4 md:grid-cols-2">
        <CardSection tone="white">
          <h2 className="text-lg font-semibold">Overview</h2>
          <p className="mt-2 text-sm text-neutral-600">Define the problem, market, and execution status here.</p>
        </CardSection>
        <CardSection tone="brown">
          <h2 className="text-lg font-semibold">Open Roles</h2>
          <p className="mt-2 text-sm">Publish teammate roles with expected commitment and skills.</p>
        </CardSection>
      </div>
    </DashboardShell>
  );
}

