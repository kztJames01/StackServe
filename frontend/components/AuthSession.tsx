'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { onIdTokenChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { storeAuthToken, clearAuthToken } from '@/lib/auth-cookie';

const REFRESH_MS = 50 * 60 * 1000;

export default function AuthSession() {
  const queryClient = useQueryClient();
  const previousUid = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!auth) return;

    const unsub = onIdTokenChanged(auth, async (user) => {
      const changed = previousUid.current !== undefined && previousUid.current !== (user?.uid || null);
      previousUid.current = user?.uid || null;
      if (changed) await queryClient.resetQueries();
      if (!user) {
        clearAuthToken();
        return;
      }
      try {
        const token = await user.getIdToken();
        await storeAuthToken(token);
      } catch {
        // ignore refresh errors
      }
    });

    const timer = setInterval(async () => {
      if (!auth) return;
      const user = auth.currentUser;
      if (!user) return;
      try {
        const token = await user.getIdToken(true);
        await storeAuthToken(token);
      } catch {
        // ignore
      }
    }, REFRESH_MS);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [queryClient]);

  return null;
}
