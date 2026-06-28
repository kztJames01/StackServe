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

export default function Page() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
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
      setAvatar(me.avatar ?? '/home.jpg');
    }
  }, [me]);

  const mutation = useMutation({
    mutationFn: () => updateMe({ name, bio, avatar }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
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
    try {
      const uploaded = await uploadFileToStorage('avatars', file);
      setAvatar(uploaded.fileUrl);
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
            className="space-y-4 max-w-md"
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
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" htmlFor="avatar">Avatar</label>
              <div className="flex items-center gap-3">
                <img
                  src={avatar || '/home.jpg'}
                  alt="avatar"
                  className="h-14 w-14 rounded-full border object-cover"
                />
                <input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  className="text-sm"
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
                className="w-full border rounded-md px-3 py-2 text-sm resize-none"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={mutation.isPending || uploading}
              className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
            </button>
            {mutation.isError && (
              <p className="text-xs text-destructive">Failed to save. Please try again.</p>
            )}
          </form>
        )}
      </CardSection>
      <CardSection tone="brown">
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
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            onClick={() => checkoutMutation.mutate()}
            disabled={checkoutMutation.isPending}
          >
            {checkoutMutation.isPending ? 'Opening checkout…' : 'Upgrade to Pro'}
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            onClick={() => portalMutation.mutate()}
            disabled={portalMutation.isPending}
          >
            {portalMutation.isPending ? 'Opening portal…' : 'Manage Billing'}
          </button>
        </div>
      </CardSection>
    </DashboardShell>
  );
}


