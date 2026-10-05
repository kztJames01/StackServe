'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';
import {
  createBillingCheckoutSession,
  createBillingPortalSession,
  getBillingStatus,
  getMe,
  updateMe,
  uploadFileToStorage,
} from '@/lib/api/client';
import ApiErrorState from '@/components/ApiErrorState';
import Link from 'next/link';
import { VerificationSettings } from '@/components/verification-settings';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function Page() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [handle, setHandle] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [avatar, setAvatar] = useState('');
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: me, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  const { data: billing, refetch: refetchBilling } = useQuery({
    queryKey: ['billing'],
    queryFn: getBillingStatus,
  });

  useEffect(() => {
    if (me) {
      setName(me.name ?? '');
      setBio(me.bio ?? '');
      setHandle(me.handle ?? '');
      setAvatar(me.avatar ?? '');
    }
  }, [me]);

  const mutation = useMutation({
    mutationFn: () => updateMe({ name, bio, avatar, ...(handle ? { handle } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['verification'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: () => createBillingCheckoutSession(),
    onSuccess: ({ url }) => {
      if (url) window.location.href = url;
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => createBillingPortalSession(),
    onSuccess: ({ url }) => {
      if (url) window.location.href = url;
    },
  });

  async function handleAvatarUpload(file: File) {
    setUploading(true);
    setUploadError('');
    try {
      const uploaded = await uploadFileToStorage('avatars', file);
      setAvatar(uploaded.fileUrl);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Avatar upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <DashboardShell title="Account" description="Identity, credentials, and public profile controls.">
      <CardSection tone="white">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : isError ? (
          <ApiErrorState
            message={error instanceof Error ? error.message : 'Failed to load account'}
            onRetry={() => refetch()}
          />
        ) : (
          <form
            className="space-y-5 max-w-2xl"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
              refetchBilling();
            }}
          >
            <div className="space-y-1">
              <label className="text-xs font-medium" htmlFor="name">Display name</label>
              <input
                id="name"
                required
                autoComplete="name"
                maxLength={100}
                className="w-full border border-input rounded-md px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="handle">Public profile handle</label>
              <input id="handle" value={handle} onChange={(event) => setHandle(event.target.value.toLowerCase())} pattern="[a-z0-9][a-z0-9_-]{2,29}" minLength={3} maxLength={30} autoComplete="username" aria-describedby="handle-help" className="w-full rounded-md border border-input px-3 py-2 text-sm" />
              <p id="handle-help" className="text-xs text-muted-foreground">3–30 letters, numbers, underscores or hyphens. Your profile is public after you choose a handle.</p>
              {me?.handle && <Link className="inline-block text-sm underline underline-offset-4" href={`/u/${me.handle}`}>View public profile: /u/{me.handle}</Link>}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Workspace access</p>
              <p className="text-sm text-muted-foreground">Agency roles are assigned per workspace by an Admin. Manage them from Workspace settings.</p>
              <Button asChild variant="outline" size="sm"><Link href="/settings/workspace">Open workspace settings</Link></Button>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" htmlFor="avatar">Avatar</label>
              <div className="flex items-center gap-3">
                <Avatar className="size-14 shrink-0 border">
                  <AvatarImage src={avatar} alt={`${name || 'Your'} profile picture`} />
                  <AvatarFallback>{name.trim().slice(0, 2).toUpperCase() || 'ME'}</AvatarFallback>
                </Avatar>
                <input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  className="min-w-0 w-full text-sm"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAvatarUpload(file);
                  }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                rows={3}
                maxLength={2000}
                className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={mutation.isPending || uploading}
              className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
            </Button>
            {saved && <p role="status" className="text-sm">Your profile changes have been saved.</p>}
            {uploadError && <p role="alert" className="text-sm text-destructive">{uploadError}</p>}
            {mutation.isError && (
              <p role="alert" className="text-sm text-destructive">{mutation.error instanceof Error ? mutation.error.message : 'Failed to save. Please try again.'}</p>
            )}
          </form>
        )}
      </CardSection>
      {me && <VerificationSettings />}
      <CardSection tone="white">
        <h3 className="text-base font-semibold">Billing</h3>
        <p className="mt-2 text-sm">
          Plan: <span className="font-medium">{billing?.plan || 'free'}</span>
        </p>
        <p className="text-sm">
          Status: <span className="font-medium">{billing?.subscriptionStatus || 'inactive'}</span>
        </p>
        {billing?.currentPeriodEnd && (
          <p className="text-xs text-muted-foreground">
            Current period ends: {new Date(billing.currentPeriodEnd).toLocaleDateString()}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => checkoutMutation.mutate()}
            disabled={checkoutMutation.isPending}
          >
            {checkoutMutation.isPending ? 'Opening checkout…' : 'Upgrade to Pro'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => portalMutation.mutate()}
            disabled={portalMutation.isPending}
          >
            {portalMutation.isPending ? 'Opening portal…' : 'Manage Billing'}
          </Button>
        </div>
        {(checkoutMutation.error || portalMutation.error) && <p role="alert" className="mt-3 text-sm text-destructive">{(checkoutMutation.error || portalMutation.error)?.message}</p>}
      </CardSection>
    </DashboardShell>
  );
}


