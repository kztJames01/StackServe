'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';
import { getHistory } from '@/lib/api/client';

export default function Page() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: getHistory,
  });

  return (
    <DashboardShell title="Project History" description="Track milestones, pivots, and shipping velocity across your startup journey.">
      <CardSection tone="white">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading history…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No history entries yet.</p>
        ) : (
          <ol className="relative border-l border-border space-y-6 pl-6">
            {entries.map((entry) => (
              <li key={entry.id} className="relative">
                <span className="absolute -left-[1.65rem] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                <p className="text-xs text-muted-foreground">{entry.date}</p>
                <p className="font-semibold text-sm">{entry.title}</p>
                {entry.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.description}</p>
                )}
                <span className="text-xs bg-muted rounded-full px-2 py-0.5">{entry.type}</span>
              </li>
            ))}
          </ol>
        )}
      </CardSection>
    </DashboardShell>
  );
}


