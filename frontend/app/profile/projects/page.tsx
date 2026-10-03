'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';
import { getProfileProjects } from '@/lib/api/client';
import ApiErrorState from '@/components/ApiErrorState';

export default function ProfileProjectsPage() {
  const { data: projects = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['profileProjects'],
    queryFn: getProfileProjects,
  });

  return (
    <DashboardShell title="Profile Projects" description="Public portfolio projects visible to collaborators and employers.">
      {isLoading ? (
        <CardSection tone="white">
          <p className="text-sm text-muted-foreground">Loading projects…</p>
        </CardSection>
      ) : isError ? (
        <ApiErrorState
          message={error instanceof Error ? error.message : 'Failed to load profile projects'}
          onRetry={() => refetch()}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <CardSection key={project.id} tone="white">
              <h3 className="text-lg font-semibold">{project.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-accent px-2 py-1 text-xs">{tag}</span>
                ))}
              </div>
            </CardSection>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}


