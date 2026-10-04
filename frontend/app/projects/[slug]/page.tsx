'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';
import {
  getProject,
  updateProject,
  uploadFileToStorage,
  getLicenses,
  createLicense,
  updateLicense,
  signLicense,
  deleteLicense,
  downloadLicensesCsv,
  License,
} from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ApiErrorState from '@/components/ApiErrorState';

// same mock crew as roster/shoots pages
const CREW = [
  { id: '1', name: 'Alex Johnson', role: 'Photographer' },
  { id: '2', name: 'Samantha Lee', role: 'Stylist' },
  { id: '3', name: 'Marcus Chen', role: 'MUA' },
  { id: '4', name: 'Priya Patel', role: 'Set Designer' },
  { id: '5', name: 'Jordan Taylor', role: 'Photographer' },
  { id: '6', name: 'Emma Wilson', role: 'Stylist' },
];

const USAGE_OPTIONS = ['print', 'web', 'social', 'ooh', 'packaging'];

function statusBadge(status: License['status']) {
  if (status === 'signed') return <Badge>signed</Badge>;
  if (status === 'sent') return <Badge variant="secondary">sent</Badge>;
  if (status === 'disputed' || status === 'expired') return <Badge variant="destructive">{status}</Badge>;
  return <Badge variant="outline">draft</Badge>;
}

export default function ProjectDetailPage() {
  const queryClient = useQueryClient();
  const params = useParams<{ slug: string }>();
  const [uploading, setUploading] = useState(false);
  const [deliveryWarning, setDeliveryWarning] = useState<string | null>(null);
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
    <DashboardShell title={project?.title || title} description="Shoot workspace for crew updates, call sheets, and deliverables.">
      {isLoading ? (
        <CardSection tone="white">
          <p className="text-sm text-muted-foreground">Loading shoot…</p>
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
          <p className="mt-2 text-sm text-muted-foreground">{project?.description || 'Add the client, location, and shot list here.'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(project?.tags || []).map((tag: string) => (
              <span key={tag} className="rounded-full bg-muted px-2 py-1 text-xs">{tag}</span>
            ))}
          </div>
          <div className="mt-4">
            <label className="text-xs font-medium">Shoot cover</label>
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
          <h2 className="text-lg font-semibold">Crew Calls</h2>
          <p className="mt-2 text-sm">Publish crew roles with day rates and kit requirements.</p>
        </CardSection>
      </div>
      {project?.id ? (
        <LicenseSection
          shootId={String(project.id)}
          deliveryWarning={deliveryWarning}
          setDeliveryWarning={setDeliveryWarning}
        />
      ) : null}
    </DashboardShell>
  );
}

function LicenseSection({
  shootId,
  deliveryWarning,
  setDeliveryWarning,
}: {
  shootId: string;
  deliveryWarning: string | null;
  setDeliveryWarning: (w: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [freelancerId, setFreelancerId] = useState('1');
  const [mediaRef, setMediaRef] = useState('');
  const [usage, setUsage] = useState<string[]>(['web']);
  const [territories, setTerritories] = useState('worldwide');
  const [duration, setDuration] = useState('');
  const [fee, setFee] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [signingId, setSigningId] = useState<string | null>(null);
  const [typedName, setTypedName] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);

  const { data: licenses, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['licenses', shootId],
    queryFn: () => getLicenses(shootId),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['licenses', shootId] });
    queryClient.invalidateQueries({ queryKey: ['history'] });
    queryClient.invalidateQueries({ queryKey: ['compliance'] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createLicense({
        shootId,
        freelancerId,
        mediaRef: mediaRef || undefined,
        usageType: usage,
        territories: territories.split(',').map((t) => t.trim()).filter(Boolean),
        durationMonths: duration ? parseInt(duration) : null,
        startsAt,
        feeCents: fee ? Math.round(parseFloat(fee) * 100) : null,
      }),
    onSuccess: () => {
      refresh();
      setIsAdding(false);
      setMediaRef('');
      setFee('');
      setDuration('');
      setStartsAt('');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateLicense(id, { status }),
    onSuccess: refresh,
  });

  const signMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => signLicense(id, name),
    onSuccess: () => {
      refresh();
      setSigningId(null);
      setTypedName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLicense,
    onSuccess: refresh,
  });

  // soft gate: warn if assets arent licensed when marking delivered
  const deliverMutation = useMutation({
    mutationFn: () => updateProject(shootId, { status: 'delivered' }),
    onSuccess: (res) => {
      setDeliveryWarning(res.warning || null);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const toggleUsage = (u: string) => {
    setUsage((prev) => (prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u]));
  };

  const crewName = (id: string) => CREW.find((c) => c.id === id)?.name || id;

  return (
    <CardSection tone="white">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Usage-rights Licenses</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => deliverMutation.mutate()} disabled={deliverMutation.isPending}>
            {deliverMutation.isPending ? 'Marking…' : 'Mark Delivered'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setExportError(null);
              try {
                await downloadLicensesCsv(shootId);
              } catch (err) {
                setExportError(err instanceof Error ? err.message : 'Export failed');
              }
            }}
          >
            Export CSV
          </Button>
          <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => setIsAdding(!isAdding)}>
            New License
          </Button>
        </div>
      </div>

      {deliveryWarning && (
        <p role="alert" className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          {deliveryWarning}
        </p>
      )}
      {exportError && (
        <p role="alert" className="mt-3 text-sm text-destructive">{exportError} (audit export needs the Studio plan)</p>
      )}

      {isAdding && (
        <div className="mt-4 space-y-3 rounded-xl border border-border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Freelancer</label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={freelancerId}
                onChange={(e) => setFreelancerId(e.target.value)}
              >
                {CREW.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.role}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Media ref (asset id or B2 key)</label>
              <Input className="mt-1" placeholder="e.g. hero-shot-01" value={mediaRef} onChange={(e) => setMediaRef(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Starts</label>
              <Input className="mt-1" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Duration (months, blank = perpetual)</label>
              <Input className="mt-1" type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Fee (USD)</label>
              <Input className="mt-1" type="number" min="0" step="0.01" placeholder="500.00" value={fee} onChange={(e) => setFee(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Territories (comma separated)</label>
              <Input className="mt-1" value={territories} onChange={(e) => setTerritories(e.target.value)} />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Usage type</p>
            <div className="flex flex-wrap gap-2">
              {USAGE_OPTIONS.map((u) => (
                <button key={u} type="button" onClick={() => toggleUsage(u)} className="cursor-pointer">
                  <Badge variant={usage.includes(u) ? 'default' : 'outline'}>{u}</Badge>
                </button>
              ))}
            </div>
          </div>
          {createMutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              {createMutation.error instanceof Error ? createMutation.error.message : 'Failed to create license'}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button size="sm" disabled={!startsAt || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? 'Saving…' : 'Create Draft'}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading licenses…</p>
        ) : isError ? (
          <ApiErrorState
            message={error instanceof Error ? error.message : 'Failed to load licenses'}
            onRetry={() => refetch()}
          />
        ) : !licenses || licenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No licenses yet. Create a draft for each crew member before delivering assets.</p>
        ) : (
          <ul className="space-y-2">
            {licenses.map((lic) => (
              <li key={lic.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      {crewName(lic.freelancer_id)} · {lic.media_ref}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(lic.usage_type || []).join(', ')} · {(lic.territories || []).join(', ')} ·{' '}
                      {lic.duration_months ? `${lic.duration_months}mo` : 'perpetual'}
                      {lic.fee_cents != null ? ` · $${(lic.fee_cents / 100).toFixed(2)}` : ''}
                      {lic.expires_at ? ` · expires ${String(lic.expires_at).slice(0, 10)}` : ''}
                    </p>
                    {lic.signed_name && (
                      <p className="text-xs text-muted-foreground">
                        Signed by {lic.signed_name} {lic.signed_at ? `on ${new Date(lic.signed_at).toLocaleDateString()}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(lic.status)}
                    {lic.status === 'draft' && (
                      <Button variant="outline" size="sm" onClick={() => statusMutation.mutate({ id: lic.id, status: 'sent' })}>
                        Send
                      </Button>
                    )}
                    {lic.status === 'sent' && (
                      <Button size="sm" onClick={() => setSigningId(signingId === lic.id ? null : lic.id)}>
                        Sign
                      </Button>
                    )}
                    {lic.status !== 'signed' && (
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(lic.id)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
                {signingId === lic.id && (
                  <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                    <Input
                      placeholder="Type your full legal name to sign"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                    />
                    <Button
                      size="sm"
                      disabled={!typedName.trim() || signMutation.isPending}
                      onClick={() => signMutation.mutate({ id: lic.id, name: typedName })}
                    >
                      {signMutation.isPending ? 'Signing…' : 'Confirm Signature'}
                    </Button>
                  </div>
                )}
                {signMutation.isError && signingId === lic.id && (
                  <p role="alert" className="mt-2 text-sm text-destructive">
                    {signMutation.error instanceof Error ? signMutation.error.message : 'Failed to sign'}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </CardSection>
  );
}
