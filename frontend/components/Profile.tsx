"use client";

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, GraduationCap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CardSection } from '@/components/layout/dashboard-shell';
import { getProfile, getProfilePosts } from '@/lib/api/client';
import ApiErrorState from '@/components/ApiErrorState';

export default function ProfilePage() {
  const { data: user, isLoading, isError, error, refetch } = useQuery({ queryKey: ['userProfile'], queryFn: getProfile });
  const activity = useQuery({ queryKey: ['profilePosts'], queryFn: getProfilePosts });
  if (isLoading) return <p role="status" className="text-sm text-muted-foreground">Loading your profile…</p>;
  if (isError) return <ApiErrorState message={error instanceof Error ? error.message : 'Failed to load profile'} onRetry={() => refetch()} />;
  if (!user) return null;
  const socials = Object.entries(user.socials).filter(([, url]) => {
    try { return ['http:', 'https:'].includes(new URL(url).protocol); } catch { return false; }
  });
  return (
    <div className="space-y-6">
      <CardSection>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-4"><Avatar className="size-20 shrink-0"><AvatarImage src={user.avatar} alt={user.name} /><AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback></Avatar><div className="min-w-0"><h2 className="break-words text-2xl font-semibold">{user.name}</h2>{user.handle && <p className="mt-1 text-sm text-muted-foreground">@{user.handle}</p>}</div></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link href="/account">Edit profile</Link></Button>{user.handle && <Button asChild><Link href={`/u/${user.handle}`}>Public profile</Link></Button>}</div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{user.roles.map((role) => <span key={role} className="rounded-full bg-muted px-3 py-1 text-xs capitalize">{role}</span>)}{user.studentStatus === 'verified' && <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs"><GraduationCap className="size-4" />Student Maker</span>}{user.employerStatus === 'verified' && <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs"><BadgeCheck className="size-4" />Verified employer</span>}</div>
        {user.bio && <p className="mt-4 max-w-3xl whitespace-pre-wrap break-words text-sm leading-relaxed">{user.bio}</p>}
        {user.skills.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{user.skills.map((skill) => <span key={skill} className="rounded-md bg-accent px-3 py-1 text-xs text-accent-foreground">{skill}</span>)}</div>}
        {socials.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{socials.map(([name, url]) => <Button key={name} variant="outline" asChild><a href={url} target="_blank" rel="noopener noreferrer">{name}</a></Button>)}</div>}
      </CardSection>
      <div className="grid gap-4 md:grid-cols-2">
        <CardSection><h2 className="text-lg font-semibold">Projects</h2><p className="mt-2 text-sm text-muted-foreground">Manage your portfolio projects and collaborators.</p><Button asChild variant="outline" className="mt-4"><Link href="/profile/projects">Open projects</Link></Button></CardSection>
        <CardSection><h2 className="text-lg font-semibold">Posts</h2><p className="mt-2 text-sm text-muted-foreground">Publish updates for makers, investors and collaborators.</p><Button asChild variant="outline" className="mt-4"><Link href="/profile/posts">Open posts</Link></Button></CardSection>
      </div>
      <CardSection><h2 className="text-lg font-semibold">Recent activity</h2><p className="mt-2 text-sm text-muted-foreground">Your latest published updates.</p>{activity.isLoading ? <p role="status" className="mt-4 text-sm">Loading activity…</p> : activity.error ? <ApiErrorState message={activity.error.message} onRetry={() => activity.refetch()} /> : !activity.data?.length ? <p className="mt-4 text-sm text-muted-foreground">No updates yet. Share what you are building from the explore feed.</p> : <ul className="mt-4 divide-y">{activity.data.map((post) => <li key={post.id} className="space-y-1 py-3"><p className="whitespace-pre-wrap break-words text-sm">{post.content}</p><p className="text-xs text-muted-foreground">{new Date(post.date).toLocaleDateString()}</p></li>)}</ul>}</CardSection>
    </div>
  );
}
