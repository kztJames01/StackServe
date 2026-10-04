'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell'
import { getAvailability, AvailabilityRow } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ApiErrorState from '@/components/ApiErrorState'

// same mock crew as roster, ids match availability rows
const CREW: Record<string, { name: string; role: string }> = {
  '1': { name: 'Alex Johnson', role: 'Photographer' },
  '2': { name: 'Samantha Lee', role: 'Stylist' },
  '3': { name: 'Marcus Chen', role: 'MUA' },
  '4': { name: 'Priya Patel', role: 'Set Designer' },
  '5': { name: 'Jordan Taylor', role: 'Photographer' },
  '6': { name: 'Emma Wilson', role: 'Stylist' },
}

function startOfWeek(d: Date) {
  const date = new Date(d)
  const day = (date.getDay() + 6) % 7 // monday start
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function AvailabilityPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))

  const { data: rows, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['availability'],
    queryFn: () => getAvailability(),
  })

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [weekStart])

  // group rows per freelancer
  const byFreelancer = useMemo(() => {
    const map: Record<string, AvailabilityRow[]> = {}
    for (const row of rows || []) {
      if (!map[row.freelancerId]) map[row.freelancerId] = []
      map[row.freelancerId].push(row)
    }
    return map
  }, [rows])

  const statusFor = (freelancerId: string, day: Date) => {
    const key = dayKey(day)
    const hits = (byFreelancer[freelancerId] || []).filter(
      (row) => row.start.slice(0, 10) <= key && key <= row.end.slice(0, 10)
    )
    if (hits.length === 0) return null
    // double-booked conflict wins over everything
    const booked = hits.filter((h) => h.status === 'booked')
    if (booked.length > 1) return 'conflict'
    if (booked.length === 1) return 'booked'
    return hits[0].status
  }

  const moveWeek = (dir: number) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + dir * 7)
    setWeekStart(d)
  }

  const cellStyle = (status: string | null) => {
    if (status === 'conflict') return 'bg-destructive/20 text-destructive border-destructive/40'
    if (status === 'booked') return 'bg-secondary text-secondary-foreground border-border'
    if (status === 'hold') return 'bg-accent text-accent-foreground border-border'
    if (status === 'available') return 'bg-muted text-muted-foreground border-border'
    return 'text-muted-foreground/40 border-transparent'
  }

  return (
    <DashboardShell title="Availability" description="Who is free, held, or booked — replaces the spreadsheet tab.">
      <CardSection tone="white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => moveWeek(-1)} aria-label="Previous week">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => moveWeek(1)} aria-label="Next week">
              <ChevronRight className="size-4" />
            </Button>
            <p className="text-sm font-medium ml-2">
              Week of {weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">available</Badge>
            <Badge variant="secondary">hold</Badge>
            <Badge>booked</Badge>
            <Badge variant="destructive">conflict</Badge>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading availability…</p>
        ) : isError ? (
          <ApiErrorState
            message={error instanceof Error ? error.message : 'Failed to load availability'}
            onRetry={() => refetch()}
          />
        ) : Object.keys(byFreelancer).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No availability yet. Book a shoot and pick crew — their dates get held here automatically.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 font-medium text-muted-foreground">Crew</th>
                  {days.map((d) => (
                    <th key={dayKey(d)} className="p-2 font-medium text-muted-foreground text-center">
                      <span className="block text-xs">{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                      <span>{d.getDate()}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(byFreelancer).map((freelancerId) => (
                  <tr key={freelancerId} className="border-t border-border">
                    <td className="p-2">
                      <p className="font-medium">{CREW[freelancerId]?.name || freelancerId}</p>
                      <p className="text-xs text-muted-foreground">{CREW[freelancerId]?.role || 'Crew'}</p>
                    </td>
                    {days.map((d) => {
                      const status = statusFor(freelancerId, d)
                      return (
                        <td key={dayKey(d)} className="p-1">
                          <div
                            className={`rounded-md border px-1 py-2 text-center text-xs capitalize ${cellStyle(status)}`}
                            title={status || 'no data'}
                          >
                            {status || '—'}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardSection>
    </DashboardShell>
  )
}
