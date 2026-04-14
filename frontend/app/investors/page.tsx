'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';
import { getInvestors } from '@/lib/api/client';

export default function Page() {
  const { data: investors = [], isLoading } = useQuery({
    queryKey: ['investors'],
    queryFn: () => getInvestors(),
  });

  return (
    <DashboardShell title="Investor Space" description="Prepare your pitch and expose traction highlights to potential investors.">
      <CardSection tone="black">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading investors…</p>
        ) : investors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No investors listed yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {investors.map((inv) => (
              <div key={inv.id} className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{inv.name}</p>
                  <span className="text-xs bg-muted rounded-full px-2 py-0.5">{inv.stage}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">{inv.bio}</p>
                <div className="flex flex-wrap gap-1">
                  {inv.focusAreas.map((area) => (
                    <span key={area} className="text-xs bg-muted/60 rounded-full px-2 py-0.5">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardSection>
    </DashboardShell>
  );
}


