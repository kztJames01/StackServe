'use client';

import FeedPage from '@/components/Feed';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function ExplorePage() {
  return (
    <DashboardShell
      title="Explore"
      description="Discover founder projects, collaboration requests, and progress updates."
    >
      <FeedPage />
    </DashboardShell>
  );
}


