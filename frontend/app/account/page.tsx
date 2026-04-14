'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardShell, CardSection } from '@/components/layout/dashboard-shell';
import { getMe, updateMe } from '@/lib/api/client';

export default function Page() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [saved, setSaved] = useState(false);

  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  useEffect(() => {
    if (me) {
      setName(me.name ?? '');
      setBio(me.bio ?? '');
    }
  }, [me]);

  const mutation = useMutation({
    mutationFn: () => updateMe({ name, bio }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <DashboardShell title="Account" description="Identity, credentials, and public profile controls.">
      <CardSection tone="white">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <form
            className="space-y-4 max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
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
              disabled={mutation.isPending}
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
    </DashboardShell>
  );
}


