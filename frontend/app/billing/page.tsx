'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';
import {
  createBillingCheckoutSession,
  createBillingPortalSession,
  getBillingStatus,
} from '@/lib/api/client';
import ApiErrorState from '@/components/ApiErrorState';

export default function Page() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['billing'],
    queryFn: getBillingStatus,
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


