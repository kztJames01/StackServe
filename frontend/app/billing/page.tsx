'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';
import {
  createBillingCheckoutSession,
  createBillingPortalSession,
  getBillingStatus,
  getSeats,
  updateSeats,
} from '@/lib/api/client';
import ApiErrorState from '@/components/ApiErrorState';

export default function Page() {
  const queryClient = useQueryClient();
  const [seatInput, setSeatInput] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['billing'],
    queryFn: getBillingStatus,
  });

  const { data: seatData } = useQuery({
    queryKey: ['seats'],
    queryFn: getSeats,
  });

  const seatsMutation = useMutation({
    mutationFn: (seats: number) => updateSeats(seats),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seats'] });
      setSeatInput('');
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

  return (
    <DashboardShell title="Billing" description="Plan usage, invoices, and payment settings.">
      <CardSection tone="brown">
        {isLoading ? (
          <p className="text-sm">Loading billing…</p>
        ) : isError ? (
          <ApiErrorState
            message={error instanceof Error ? error.message : 'Failed to load billing'}
            onRetry={() => refetch()}
          />
        ) : (
          <div className="space-y-2">
            <p className="text-sm">
              Current plan: <span className="font-medium">{data?.plan || 'free'}</span>
            </p>
            <p className="text-sm">
              Status: <span className="font-medium">{data?.subscriptionStatus || 'inactive'}</span>
            </p>
            {data?.currentPeriodEnd && (
              <p className="text-xs text-muted-foreground">
                Current period ends: {new Date(data.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
            <div className="pt-2 space-y-2">
              <p className="text-sm">
                Seats: <span className="font-medium">{seatData?.seats ?? '…'}</span>
                {data?.plan === 'free' && seatData ? (
                  <span className="text-xs text-muted-foreground"> (free plan max {seatData.freeSeatLimit})</span>
                ) : null}
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  className="w-24 rounded-md border px-3 py-2 text-sm bg-background"
                  placeholder="seats"
                  value={seatInput}
                  onChange={(e) => setSeatInput(e.target.value)}
                />
                <button
                  className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                  disabled={!seatInput || seatsMutation.isPending}
                  onClick={() => seatsMutation.mutate(parseInt(seatInput))}
                >
                  {seatsMutation.isPending ? 'Updating…' : 'Update seats'}
                </button>
              </div>
              {seatsMutation.isError && (
                <p role="alert" className="text-xs text-destructive">
                  {seatsMutation.error instanceof Error ? seatsMutation.error.message : 'Failed to update seats'}
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
              >
                {checkoutMutation.isPending ? 'Opening checkout…' : 'Upgrade to Pro'}
              </button>
              <button
                className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
              >
                {portalMutation.isPending ? 'Opening portal…' : 'Manage Billing'}
              </button>
            </div>
          </div>
        )}
      </CardSection>
    </DashboardShell>
  );
}


