'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';
import { getProfileProjects } from '@/lib/api/client';

export default function ProfileProjectsPage() {
  const { data: projects = [] } = useQuery({
    queryKey: ['profileProjects'],
    queryFn: getProfileProjects,
  });

  return (
    <DashboardShell title="Profile Projects" description="Public portfolio projects visible to collaborators and employers.">
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <CardSection key={project.id} tone="white">
            <h3 className="text-lg font-semibold">{project.title}</h3>
            <p className="mt-2 text-sm text-neutral-600">{project.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-[#BB9457]/25 px-2 py-1 text-xs">{tag}</span>
              ))}
            </div>
          </CardSection>
        ))}
      </div>
    </DashboardShell>
  );
}


