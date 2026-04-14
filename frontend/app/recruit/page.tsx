'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';
import { getRecruitListings } from '@/lib/api/client';

export default function Page() {
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['recruit'],
    queryFn: () => getRecruitListings(),
  });

  return (
    <DashboardShell title="Recruit Teammates" description="Post open roles and match with builders worldwide.">
      <CardSection tone="brown">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading listings…</p>
        ) : listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open roles posted yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {listings.map((listing) => (
              <div key={listing.id} className="rounded-xl border bg-card p-4 space-y-2">
                <p className="font-semibold text-sm">{listing.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{listing.description}</p>
                <div className="flex flex-wrap gap-1">
                  {listing.skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-xs bg-muted rounded-full px-2 py-0.5"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>⏱ {listing.commitment}</span>
                  <span>💰 {listing.equity}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardSection>
    </DashboardShell>
  );
}


