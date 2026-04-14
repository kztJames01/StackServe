'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/api/client';

export default function Page() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  });

  const markOneMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <DashboardShell title="Notifications" description="Project invites, comments, and opportunity alerts.">
      <CardSection tone="brown">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium">{notifications.filter((n) => !n.read).length} unread</p>
          <button
            className="text-xs underline disabled:opacity-50"
            disabled={markAllMutation.isPending}
            onClick={() => markAllMutation.mutate()}
          >
            Mark all read
          </button>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications.</p>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`flex items-start justify-between rounded-lg border p-3 ${
                  n.read ? 'opacity-60' : 'bg-muted/30'
                }`}
              >
                <div>
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.read && (
                  <button
                    className="text-xs underline ml-4 flex-shrink-0"
                    onClick={() => markOneMutation.mutate(n.id)}
                  >
                    Mark read
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardSection>
    </DashboardShell>
  );
}


