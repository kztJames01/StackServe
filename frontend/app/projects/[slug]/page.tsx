'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';
import { getProject, updateProject, uploadFileToStorage } from '@/lib/api/client';
import ApiErrorState from '@/components/ApiErrorState';

export default function ProjectDetailPage() {
  const queryClient = useQueryClient();
  const params = useParams<{ slug: string }>();
  const [uploading, setUploading] = useState(false);
  const title = useMemo(
    () => (params.slug || 'project').split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' '),
    [params.slug],
  );

  const {
    data: project,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['project', params.slug],
    queryFn: () => getProject(params.slug),
    enabled: Boolean(params.slug),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { image: string }) => updateProject(project?.id || '', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', params.slug] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  async function handleUpload(file: File) {
    if (!project?.id) return;
    setUploading(true);
    try {
      const uploaded = await uploadFileToStorage('projects', file);
      await updateMutation.mutateAsync({ image: uploaded.fileUrl });
    } finally {
      setUploading(false);
    }
  }

  return (
    <DashboardShell title={project?.title || title} description="Project workspace for team updates, recruiting, and investor visibility.">
      {isLoading ? (
        <CardSection tone="white">
          <p className="text-sm text-muted-foreground">Loading project…</p>
        </CardSection>
      ) : isError ? (
        <ApiErrorState
          message={error instanceof Error ? error.message : 'Failed to load project'}
          onRetry={() => refetch()}
        />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <CardSection tone="white">
          <h2 className="text-lg font-semibold">Overview</h2>
          <img
            src={project?.image || '/home.jpg'}
            alt={project?.title || 'Project image'}
            className="mt-3 h-48 w-full rounded-lg border object-cover"
          />
          <p className="mt-2 text-sm text-neutral-600">{project?.description || 'Define the problem, market, and execution status here.'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(project?.tags || []).map((tag: string) => (
              <span key={tag} className="rounded-full bg-muted px-2 py-1 text-xs">{tag}</span>
            ))}
          </div>
          <div className="mt-4">
            <label className="text-xs font-medium">Project cover</label>
            <input
              type="file"
              accept="image/*"
              className="mt-1 block text-sm"
              disabled={uploading || updateMutation.isPending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
            {(uploading || updateMutation.isPending) && (
              <p className="mt-1 text-xs text-muted-foreground">Uploading image…</p>
            )}
          </div>
        </CardSection>
        <CardSection tone="brown">
          <h2 className="text-lg font-semibold">Open Roles</h2>
          <p className="mt-2 text-sm">Publish teammate roles with expected commitment and skills.</p>
        </CardSection>
      </div>
    </DashboardShell>
  );
}

