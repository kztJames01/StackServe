'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';
import { getProfilePosts } from '@/lib/api/client';

export default function ProfilePostsPage() {
  const { data: posts = [] } = useQuery({
    queryKey: ['profilePosts'],
    queryFn: getProfilePosts,
  });

  return (
    <DashboardShell title="Profile Posts" description="Posts that represent your contribution and execution history.">
      <div className="space-y-4">
        {posts.map((post) => (
          <CardSection key={post.id} tone="brown">
            <p className="text-sm">{post.content}</p>
            <div className="mt-3 flex gap-4 text-xs">
              <span>{post.likes} likes</span>
              <span>{post.comments} comments</span>
              <span>{post.date}</span>
            </div>
          </CardSection>
        ))}
      </div>
    </DashboardShell>
  );
}


