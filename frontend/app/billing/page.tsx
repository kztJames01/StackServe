'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';
import {
  createBillingCheckoutSession,
  createBillingPortalSession,
  createPaypalSubscription,
  createShootInvoice,
  getBillingStatus,
  getPaypalDisputes,
  getPaypalInvoices,
  getProjects,
  getSeats,
  sendPaypalDisputeNote,
  updateSeats,
} from '@/lib/api/client';
import ApiErrorState from '@/components/ApiErrorState';
import { useCurrentWorkspaceId } from '@/components/app-sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function money(cents?: number | null) {
  if (cents == null) return '—';
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

export default function Page() {
  const queryClient = useQueryClient();
  const workspaceId = useCurrentWorkspaceId();
  const [seatInput, setSeatInput] = useState('');
  const [shootId, setShootId] = useState('');
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [note, setNote] = useState('');
  const [noteDisputeId, setNoteDisputeId] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['billing'],
    queryFn: getBillingStatus,
  });

  const { data: seatData } = useQuery({
    queryKey: ['seats'],
    queryFn: getSeats,
  });

  const { data: shoots = [] } = useQuery({
    queryKey: ['shoots', workspaceId],
    queryFn: () => getProjects(workspaceId!),
    enabled: !!workspaceId,
  });

  const invoicesQ = useQuery({
    queryKey: ['paypal-invoices', workspaceId],
    queryFn: () => getPaypalInvoices(workspaceId!),
    enabled: !!workspaceId,
    retry: false,
  });

  const disputesQ = useQuery({
    queryKey: ['paypal-disputes', workspaceId],
    queryFn: () => getPaypalDisputes(workspaceId!),
    enabled: !!workspaceId,
    retry: false,
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

  const paypalSub = useMutation({
    mutationFn: () => createPaypalSubscription(workspaceId!),
    onSuccess: ({ url }) => {
      if (url) window.location.href = url;
    },
  });

  const invoiceMut = useMutation({
    mutationFn: () => createShootInvoice(workspaceId!, shootId, invoiceEmail || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paypal-invoices', workspaceId] });
    },
  });

  const noteMut = useMutation({
    mutationFn: () => sendPaypalDisputeNote(noteDisputeId, note),
    onSuccess: () => {
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['paypal-disputes', workspaceId] });
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
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
              >
                {checkoutMutation.isPending ? 'Opening checkout…' : 'Upgrade with Stripe'}
              </button>
              <button
                className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
              >
                {portalMutation.isPending ? 'Opening portal…' : 'Manage Stripe'}
              </button>
              <button
                className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                onClick={() => paypalSub.mutate()}
                disabled={paypalSub.isPending || !workspaceId}
              >
                {paypalSub.isPending ? 'Opening PayPal…' : 'Subscribe with PayPal'}
              </button>
            </div>
            {paypalSub.isError && (
              <p role="alert" className="text-xs text-destructive">
                {paypalSub.error instanceof Error ? paypalSub.error.message : 'PayPal is not configured'}
              </p>
            )}
          </div>
        )}
      </CardSection>

      <CardSection tone="white">
        <h2 className="text-lg font-semibold">Session-fee invoices</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send a PayPal invoice for signed digital replica riders on a shoot.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select
            className="rounded-md border px-3 py-2 text-sm bg-background"
            value={shootId}
            onChange={(e) => setShootId(e.target.value)}
            aria-label="Shoot"
          >
            <option value="">Select shoot</option>
            {shoots.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          <input
            className="rounded-md border px-3 py-2 text-sm bg-background"
            placeholder="Recipient email"
            type="email"
            value={invoiceEmail}
            onChange={(e) => setInvoiceEmail(e.target.value)}
          />
          <Button
            size="sm"
            disabled={!shootId || invoiceMut.isPending || !workspaceId}
            onClick={() => invoiceMut.mutate()}
          >
            {invoiceMut.isPending ? 'Sending…' : 'Send invoice'}
          </Button>
        </div>
        {invoiceMut.isError && (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {invoiceMut.error instanceof Error ? invoiceMut.error.message : 'Invoice failed'}
          </p>
        )}
        {invoicesQ.isError ? (
          <p className="mt-3 text-sm text-muted-foreground">PayPal invoices unavailable. Check sandbox credentials.</p>
        ) : invoicesQ.data && invoicesQ.data.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No invoices sent yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(invoicesQ.data || []).map((inv) => (
              <li key={inv.id} className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">{inv.recipient_email} · {money(inv.total_cents)}</span>
                <Badge variant="outline">{inv.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardSection>

      <CardSection tone="white">
        <h2 className="text-lg font-semibold">PayPal disputes</h2>
        {disputesQ.isError ? (
          <p className="mt-2 text-sm text-muted-foreground">Disputes unavailable. PayPal sandbox may not be configured.</p>
        ) : disputesQ.data && disputesQ.data.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No open disputes.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(disputesQ.data || []).map((d) => (
              <li key={d.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{d.paypal_dispute_id}</span>
                  <Badge variant="outline">{d.status || 'unknown'}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{d.reason || 'No reason'} · {money(d.amount_cents)}</p>
                <button
                  className="mt-2 text-xs underline"
                  onClick={() => setNoteDisputeId(d.id)}
                >
                  Add merchant note
                </button>
              </li>
            ))}
          </ul>
        )}
        {noteDisputeId && (
          <div className="mt-3 flex gap-2">
            <input
              className="flex-1 rounded-md border px-3 py-2 text-sm bg-background"
              placeholder="Merchant note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button size="sm" disabled={!note.trim() || noteMut.isPending} onClick={() => noteMut.mutate()}>
              {noteMut.isPending ? 'Sending…' : 'Send note'}
            </Button>
          </div>
        )}
        {noteMut.isError && (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {noteMut.error instanceof Error ? noteMut.error.message : 'Note failed'}
          </p>
        )}
      </CardSection>
    </DashboardShell>
  );
}
