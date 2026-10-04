import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BadgeCheck, GraduationCap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-provider';
import type { ProfileData } from '@/lib/api/client';
import { DEFAULT_API_BASE } from '../../../../shared/apiHelpers';

type PublicProfile = ProfileData & {
  investor?: { stage: string; org_domain: string; check_size: string; aum_range: string; thesis: string; portfolio: string[] };
};
type PageProps = { params: Promise<{ handle: string }> };

const getPublicProfile = cache(async (handle: string): Promise<PublicProfile> => {
  if (!/^[a-z0-9][a-z0-9_-]{2,29}$/i.test(handle)) notFound();
  const base = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE;
  const response = await fetch(`${base}/api/profiles/${encodeURIComponent(handle.toLowerCase())}`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error('Public profile is temporarily unavailable.');
  return response.json();
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getPublicProfile(handle);
  const title = `${profile.name} (@${profile.handle}) | StudioPass`;
  const description = profile.bio.slice(0, 160) || `${profile.name}'s maker profile, skills and credentials.`;
  return { title, description, alternates: { canonical: `/u/${profile.handle}` }, openGraph: { title, description, type: 'profile' }, twitter: { card: 'summary', title, description } };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { handle } = await params;
  const profile = await getPublicProfile(handle);
  const socials = Object.entries(profile.socials).filter(([, value]) => {
    try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
  });
  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <nav aria-label="Public profile navigation" className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="font-semibold">StudioPass</Link>
          <div className="flex items-center gap-2"><ThemeToggle /><Button asChild variant="outline"><Link href="/sign-in">Sign in</Link></Button></div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 sm:py-16">
        <section className="space-y-6 rounded-xl border bg-card p-6 text-card-foreground sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar className="size-24 shrink-0"><AvatarImage src={profile.avatar} alt={profile.name} /><AvatarFallback className="text-2xl">{profile.name.slice(0, 2)}</AvatarFallback></Avatar>
            <div className="min-w-0 space-y-2"><p className="break-words text-sm text-muted-foreground">@{profile.handle}</p><h1 className="break-words text-3xl font-semibold sm:text-4xl">{profile.name}</h1><div className="flex flex-wrap gap-2">{profile.roles.map((role) => <span key={role} className="rounded-full bg-muted px-3 py-1 text-xs capitalize">{role}</span>)}</div></div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            {profile.studentStatus === 'verified' && <span className="inline-flex items-center gap-2"><GraduationCap className="size-4" />Student Maker · Verified university email</span>}
            {profile.employerStatus === 'verified' && <span className="inline-flex items-center gap-2"><BadgeCheck className="size-4" />Verified employer</span>}
            {profile.investor && <span className="inline-flex items-center gap-2"><BadgeCheck className="size-4" />Verified investor · Staff reviewed</span>}
          </div>
          {profile.bio && <p className="max-w-3xl whitespace-pre-wrap break-words text-base leading-relaxed">{profile.bio}</p>}
          {profile.skills.length > 0 && <div><h2 className="mb-3 text-lg font-semibold">Skills</h2><div className="flex flex-wrap gap-2">{profile.skills.map((skill) => <span key={skill} className="rounded-md bg-accent px-3 py-1.5 text-sm text-accent-foreground">{skill}</span>)}</div></div>}
          {socials.length > 0 && <nav aria-label="External profiles" className="flex flex-wrap gap-3">{socials.map(([name, url]) => <Button key={name} asChild variant="outline"><a href={url} target="_blank" rel="noopener noreferrer">{name}</a></Button>)}</nav>}
        </section>
        {profile.investor && <section className="space-y-5 rounded-xl border bg-card p-6 text-card-foreground sm:p-8"><h2 className="text-2xl font-semibold">Investment profile</h2><dl className="grid gap-5 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">Organization</dt><dd className="mt-1 break-words">{profile.investor.org_domain}</dd></div><div><dt className="text-sm text-muted-foreground">Stage</dt><dd className="mt-1">{profile.investor.stage}</dd></div><div><dt className="text-sm text-muted-foreground">Check size (self-declared)</dt><dd className="mt-1">{profile.investor.check_size}</dd></div><div><dt className="text-sm text-muted-foreground">AUM range (self-declared)</dt><dd className="mt-1">{profile.investor.aum_range}</dd></div></dl><div><h3 className="font-semibold">Thesis</h3><p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">{profile.investor.thesis}</p></div><div><h3 className="font-semibold">Portfolio companies (self-declared)</h3><p className="mt-2">{profile.investor.portfolio?.join(', ') || 'No companies declared'}</p></div></section>}
      </main>
    </div>
  );
}
