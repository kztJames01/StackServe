'use client'

import { useQuery } from '@tanstack/react-query'
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell'
import { getCompliance } from '@/lib/api/client'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import ApiErrorState from '@/components/ApiErrorState'

export default function CompliancePage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['compliance'],
    queryFn: getCompliance,
  })

  return (
    <DashboardShell title="Compliance" description="Usage-rights status across every shoot — the panel you forward to legal.">
      {isLoading ? (
        <CardSection tone="white">
          <p className="text-sm text-muted-foreground">Running compliance checks…</p>
        </CardSection>
      ) : isError ? (
        <ApiErrorState
          message={error instanceof Error ? error.message : 'Failed to load compliance report'}
          onRetry={() => refetch()}
        />
      ) : data ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="destructive">{data.counts.red} red</Badge>
            <Badge variant="secondary">{data.counts.amber} amber</Badge>
            <Badge variant="outline">{data.counts.yellow} yellow</Badge>
            {data.green && <Badge>all clear</Badge>}
          </div>

          <CardSection tone="white">
            <h2 className="text-lg font-semibold text-destructive">Red — unlicensed delivered assets</h2>
            {data.red.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No delivered shoots with missing signatures.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.red.map((item) => (
                  <li key={item.shootId} className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
                    <Link href={`/projects/${item.shootId}`} className="text-sm font-medium underline">
                      {item.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{item.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardSection>

          <CardSection tone="brown">
            <h2 className="text-lg font-semibold">Amber — licenses expiring within 30 days</h2>
            {data.amber.length === 0 ? (
              <p className="mt-2 text-sm">Nothing expiring soon.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.amber.map((item) => (
                  <li key={item.licenseId} className="rounded-lg border border-border p-3">
                    <Link href={`/projects/${item.shootId}`} className="text-sm font-medium underline">
                      License {item.licenseId}
                    </Link>
                    <p className="text-xs">{item.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardSection>

          <CardSection tone="white">
            <h2 className="text-lg font-semibold">Yellow — crew without a license row</h2>
            {data.yellow.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Every crew member on a call sheet has a license.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.yellow.map((item) => (
                  <li key={`${item.shootId}-${item.freelancerId}`} className="rounded-lg border border-border p-3">
                    <Link href={`/projects/${item.shootId}`} className="text-sm font-medium underline">
                      {item.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Freelancer {item.freelancerId} — {item.reason}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardSection>

          {data.green && (
            <CardSection tone="black">
              <p className="text-sm font-medium">Green — every delivered asset has a signed license. Nothing for legal to chase.</p>
            </CardSection>
          )}
        </div>
      ) : null}
    </DashboardShell>
  )
}
