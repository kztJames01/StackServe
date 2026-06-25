'use client';

import { useEffect } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { storeAuthToken, clearAuthToken } from '@/lib/auth-cookie';

const REFRESH_MS = 50 * 60 * 1000;

export default function AuthSession() {
  useEffect(() => {
    if (!auth) return;

    const unsub = onIdTokenChanged(auth, async (user) => {
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
  }, []);

  return null;
}
