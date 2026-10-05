'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
  getWorkspaceRoster,
  WorkspaceMember,
  getShootMedia,
  MediaAsset,
  uploadMediaAsset,
  getWorkspaces,
} from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ApiErrorState from '@/components/ApiErrorState';
import DigitalRiderPanel from '@/components/contracts/DigitalRider'
import { useCurrentWorkspaceId } from '@/components/app-sidebar';

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
  const workspaceId = useCurrentWorkspaceId();
  const { data: workspaces = [] } = useQuery({ queryKey: ['workspaces'], queryFn: getWorkspaces });
  const workspaceRole = workspaces.find((workspace) => workspace.id === workspaceId)?.member_role;
  const canProduce = workspaceRole === 'admin' || workspaceRole === 'producer';
  const canClear = canProduce || workspaceRole === 'clearance_counsel';
  const [uploading, setUploading] = useState(false);
  const [deliveryWarning, setDeliveryWarning] = useState<string | null>(null);
  const title = useMemo(
    () => (params.slug || 'project').split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' '),
    [params.slug],
  );

  const { data: project, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['project', params.slug],
    queryFn: () => getProject(workspaceId!, params.slug),
    enabled: Boolean(params.slug && workspaceId),
  });

  const { data: roster = [] } = useQuery({
    queryKey: ['roster', workspaceId],
    queryFn: () => getWorkspaceRoster(workspaceId!),
    enabled: !!workspaceId,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { image: string }) => updateProject(workspaceId!, project?.id || '', payload),
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
          message={error instanceof Error ? error.message : 'Failed to load shoot'}
          onRetry={() => refetch()}
        />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <CardSection tone="white">
          <h2 className="text-lg font-semibold">Overview</h2>
          <Image
            src={project?.image || '/home.jpg'}
            alt={project?.title || 'Shoot cover'}
            width={960}
            height={480}
            unoptimized
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
          <h2 className="text-lg font-semibold">Performer Roster</h2>
          <p className="mt-2 text-sm">{roster.length} performer{roster.length === 1 ? '' : 's'} and producer{roster.length === 1 ? '' : 's'} available in this workspace.</p>
          <Button asChild variant="outline" size="sm" className="mt-4"><Link href="/roster">Open Roster</Link></Button>
        </CardSection>
      </div>
      {project?.id && workspaceId ? (
        <MediaSection shootId={String(project.id)} workspaceId={workspaceId} canUpload={canProduce} />
      ) : null}
      {project?.id && workspaceId ? (
        <DigitalRiderPanel
          workspaceId={workspaceId}
          shootId={String(project.id)}
          roster={roster}
          canManage={canClear}
        />
      ) : null}
      {project?.id && workspaceId ? (
        <LicenseSection
          workspaceId={workspaceId}
          canManage={canClear}
          shootId={String(project.id)}
          roster={roster}
          deliveryWarning={deliveryWarning}
          setDeliveryWarning={setDeliveryWarning}
        />
      ) : null}
    </DashboardShell>
  );
}

function MediaSection({ shootId, workspaceId, canUpload }: { shootId: string; workspaceId: string; canUpload: boolean }) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState('');

  const { data: assets = [], isLoading, refetch } = useQuery({
    queryKey: ['media', workspaceId, shootId],
    queryFn: () => getShootMedia(workspaceId, shootId),
  });

  async function handleMediaUpload(file: File) {
    setUploadError(null);
    try {
      await uploadMediaAsset(file, { workspace_id: workspaceId, shoot_id: shootId, ai_model_name: aiModel || undefined }, setProgress);
      queryClient.invalidateQueries({ queryKey: ['media', workspaceId, shootId] });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setProgress(null);
    }
  }

  function fmtSize(bytes: number) {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
    return `${(bytes / 1e3).toFixed(0)} KB`;
  }

  return (
    <CardSection tone="white">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">AI Media Assets</h2>
        <Badge variant="outline">{assets.length} asset{assets.length !== 1 ? 's' : ''}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Upload AI-generated video and image files. SHA-256 is calculated in browser before upload.</p>

      <div className="mt-4 space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">AI model (optional)</label>
            <Input className="mt-1" placeholder="e.g. Sora 1.5" value={aiModel} onChange={(e) => setAiModel(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Upload file</label>
            <input
              type="file"
              accept="video/*,image/*"
              className="mt-1 block text-sm"
              disabled={!!progress || !canUpload}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleMediaUpload(file);
              }}
            />
          </div>
        </div>
        {progress && <p role="status" className="text-sm text-muted-foreground">{progress}</p>}
        {!canUpload && <p className="text-sm text-muted-foreground">An Admin or Producer can upload AI media.</p>}
        {uploadError && <p role="alert" className="text-sm text-destructive">{uploadError}</p>}
      </div>

      <div className="mt-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading assets…</p>
        ) : assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No media assets yet. Upload AI-generated content above.</p>
        ) : (
          <ul className="space-y-2">
            {assets.map((asset) => (
              <AssetRow key={asset.id} asset={asset} fmtSize={fmtSize} />
            ))}
          </ul>
        )}
        {assets.length > 0 && (
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>Refresh</Button>
        )}
      </div>
    </CardSection>
  );
}

function AssetRow({ asset, fmtSize }: { asset: MediaAsset; fmtSize: (n: number) => string }) {
  const stateColor = asset.upload_state === 'uploaded' || asset.upload_state === 'verified'
    ? 'default' : asset.upload_state === 'failed' ? 'destructive' : 'outline';
  return (
    <li className="rounded-lg border border-border p-3 space-y-1">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-medium truncate max-w-xs">{asset.filename}</p>
        <div className="flex items-center gap-2">
          <Badge variant={stateColor as 'default' | 'destructive' | 'outline'}>{asset.upload_state}</Badge>
          {asset.ai_generated && <Badge variant="secondary">AI</Badge>}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{asset.mime_type} · {fmtSize(asset.file_size_bytes)}</p>
      <p className="text-xs font-mono text-muted-foreground break-all">sha256: {asset.sha256_hash}</p>
      {asset.ai_model_name && <p className="text-xs text-muted-foreground">Model: {asset.ai_model_name}</p>}
    </li>
  );
}

function LicenseSection({
  workspaceId,
  canManage,
  shootId,
  roster,
  deliveryWarning,
  setDeliveryWarning,
}: {
  workspaceId: string;
  canManage: boolean;
  shootId: string;
  roster: WorkspaceMember[];
  deliveryWarning: string | null;
  setDeliveryWarning: (w: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [freelancerId, setFreelancerId] = useState('');
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
    queryFn: () => getLicenses(workspaceId, shootId),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['licenses', shootId] });
    queryClient.invalidateQueries({ queryKey: ['history'] });
    queryClient.invalidateQueries({ queryKey: ['compliance'] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createLicense({
        workspaceId,
        shootId,
        freelancerId: freelancerId || 'unassigned',
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

  const deliverMutation = useMutation({
    mutationFn: () => updateProject(workspaceId, shootId, { status: 'delivered' }),
    onSuccess: (res) => {
      setDeliveryWarning(res.warning || null);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const toggleUsage = (u: string) => {
    setUsage((prev) => (prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u]));
  };

  const crewName = (id: string) => {
    const m = roster.find((r) => r.user_id === id);
    return m ? m.name : id;
  };

  return (
    <CardSection tone="white">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Performer Clearance Records</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => deliverMutation.mutate()} disabled={!canManage || deliverMutation.isPending}>
            {deliverMutation.isPending ? 'Marking…' : 'Mark Delivered'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setExportError(null);
              try {
                await downloadLicensesCsv(workspaceId, shootId);
              } catch (err) {
                setExportError(err instanceof Error ? err.message : 'Export failed');
              }
            }}
          >
            Export Clearance CSV
          </Button>
          <Button disabled={!canManage} size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => setIsAdding(!isAdding)}>
            New Clearance
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
              <label className="text-xs font-medium text-muted-foreground">Performer / Agent</label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={freelancerId}
                onChange={(e) => setFreelancerId(e.target.value)}
              >
                <option value="">— select crew —</option>
                {roster.map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.name} · {m.role}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">AI media asset</label>
              <Input className="mt-1" placeholder="Asset ID or B2 storage key" value={mediaRef} onChange={(e) => setMediaRef(e.target.value)} />
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
              {createMutation.isPending ? 'Saving…' : 'Create Clearance Draft'}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading clearance records…</p>
        ) : isError ? (
          <ApiErrorState
            message={error instanceof Error ? error.message : 'Failed to load clearance records'}
            onRetry={() => refetch()}
          />
        ) : !licenses || licenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clearance records yet. Create a draft for each performer before delivering AI media.</p>
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
