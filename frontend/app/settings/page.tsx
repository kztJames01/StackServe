'use client'

import Link from 'next/link'
import { BadgeCheck, Building2, CreditCard, SlidersHorizontal } from 'lucide-react'
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell'

const links = [
  { href: '/account', label: 'Account', detail: 'Name, avatar, and verification.', icon: BadgeCheck },
  { href: '/settings/workspace', label: 'Workspace', detail: 'Members, roles, invites, and rate cards.', icon: Building2 },
  { href: '/preferences', label: 'Preferences', detail: 'Light, dark, or system theme.', icon: SlidersHorizontal },
  { href: '/billing', label: 'Billing', detail: 'Seats, plan, and the Stripe portal.', icon: CreditCard },
]

export default function SettingsPage() {
  return (
    <DashboardShell title="Settings" description="Account, billing, and workspace controls.">
      <CardSection tone="white">
        <ul className="divide-y divide-border">
          {links.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="flex items-center gap-3 py-4 hover:text-foreground">
                <item.icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block font-medium">{item.label}</span>
                  <span className="block text-sm text-muted-foreground">{item.detail}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardSection>
    </DashboardShell>
  )
}
