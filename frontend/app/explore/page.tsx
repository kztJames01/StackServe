import FeedPage from '@/components/Feed';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ audience?: string }> }) {
  const { audience } = await searchParams;
  return (
    <DashboardShell title="Explore" description="Discover maker projects, collaboration requests, and progress updates.">
      <FeedPage key={audience || 'public'} audience={audience === 'students' ? 'students' : 'public'} />
    </DashboardShell>
  );
}
