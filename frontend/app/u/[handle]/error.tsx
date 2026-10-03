"use client";

import { Button } from '@/components/ui/button';

export default function PublicProfileError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-xl space-y-4 px-6 py-16"><h1 className="text-2xl font-semibold">Profile temporarily unavailable</h1><p className="text-muted-foreground">We could not load this profile. Please try again.</p><Button onClick={reset}>Try again</Button></main>;
}
