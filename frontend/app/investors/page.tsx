'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';
import { getInvestors } from '@/lib/api/client';
import { BadgeCheck } from 'lucide-react';
import ApiErrorState from '@/components/ApiErrorState';

export default function Page() {
  const { data: investors = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['investors'],
    queryFn: () => getInvestors(),
  });

  return (
    <DashboardShell title="Investor Space" description="Discover staff-reviewed investors and their self-declared investment focus.">
      <CardSection tone="white">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading investors…</p>
        ) : isError ? (
          <ApiErrorState
            message={error instanceof Error ? error.message : 'Failed to load investors'}
            onRetry={() => refetch()}
          />
        ) : investors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No verified investors yet. Investor submissions are featured only after staff approval.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {investors.map((inv) => (
              <div key={inv.id} className="rounded-xl border bg-card p-4 space-y-3 text-card-foreground">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{inv.name}</p>
                  <span className="text-xs bg-muted rounded-full px-2 py-0.5">{inv.stage}</span>
                </div>
                <p className="flex items-center gap-2 text-xs"><BadgeCheck className="size-4" />Verified investor · Staff reviewed</p>
                <p className="break-words text-xs text-muted-foreground">{inv.orgDomain}</p>
                <p className="text-sm leading-relaxed">{inv.thesis || inv.bio}</p>
                <dl className="grid gap-2 text-xs"><div><dt className="text-muted-foreground">Check size (self-declared)</dt><dd>{inv.checkSize}</dd></div><div><dt className="text-muted-foreground">AUM range (self-declared)</dt><dd>{inv.aumRange}</dd></div></dl>
                <p className="text-xs text-muted-foreground">Portfolio: {inv.portfolio.join(', ') || 'None declared'}</p>
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


