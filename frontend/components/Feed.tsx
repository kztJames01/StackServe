"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { createPost, getFeedPosts, getProfile, likePost } from '@/lib/api/client';
import { CardSection } from '@/components/layout/dashboard-shell';
import ApiErrorState from '@/components/ApiErrorState';
import { GraduationCap, MessageCircle, Share2, Heart, ArrowRight } from 'lucide-react';

export default function FeedPage({ audience = 'public' }: { audience?: 'public' | 'students' }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [feedback, setFeedback] = useState('');
  const { data: profile } = useQuery({ queryKey: ['userProfile'], queryFn: getProfile });
  const { data: posts = [], isLoading, isError, error, refetch } = useQuery({ queryKey: ['feedPosts', audience], queryFn: () => getFeedPosts(audience) });
  const publish = useMutation({ mutationFn: () => createPost(content, audience), onSuccess: () => {
    setContent(''); setFeedback('Your update has been published.');
    queryClient.invalidateQueries({ queryKey: ['feedPosts'] });
  } });
  const like = useMutation({ mutationFn: likePost, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedPosts'] }) });
  const student = profile?.studentStatus === 'verified';

  async function share(caption: string) {
    try {
      const url = `${window.location.origin}/explore`;
      if (navigator.share) await navigator.share({ title: 'MakerSpace update', text: caption, url });
      else { await navigator.clipboard.writeText(`${caption}\n${url}`); setFeedback('Update copied to clipboard.'); }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setFeedback('Sharing was unavailable. Please try again.');
    }
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-5">
        <nav aria-label="Discovery audience" className="flex flex-wrap gap-2">
          <Button variant={audience === 'public' ? 'secondary' : 'outline'} asChild><Link href="/explore" aria-current={audience === 'public' ? 'page' : undefined}>Community</Link></Button>
          {student ? <Button variant={audience === 'students' ? 'secondary' : 'outline'} asChild><Link href="/explore?audience=students" aria-current={audience === 'students' ? 'page' : undefined}><GraduationCap />Student makers</Link></Button> : <Button variant="outline" asChild><Link href="/account">Verify for student discovery</Link></Button>}
        </nav>
        <CardSection>
          <form className="flex gap-3" onSubmit={(event) => { event.preventDefault(); setFeedback(''); publish.mutate(); }}>
            <Avatar className="hidden size-10 sm:block"><AvatarImage src={profile?.avatar} alt={profile?.name || 'Your avatar'} /><AvatarFallback>{profile?.name.slice(0, 2) || 'ME'}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1 space-y-3">
              <label htmlFor="feed-update" className="block text-sm font-medium">Share a project update</label>
              <textarea id="feed-update" className="min-h-24 w-full resize-y rounded-lg border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground" placeholder="What are you building?" value={content} maxLength={5000} required disabled={publish.isPending} onChange={(event) => setContent(event.target.value)} />
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{audience === 'students' ? 'Visible to verified student makers only' : 'Visible to the community'}</p><Button type="submit" disabled={publish.isPending || !content.trim() || (audience === 'students' && !student)}>{publish.isPending ? 'Publishing…' : 'Post update'}</Button></div>
              {publish.error && <p role="alert" className="text-sm text-destructive">{publish.error.message}</p>}
            </div>
          </form>
        </CardSection>
        {feedback && <p role="status" className="text-sm">{feedback}</p>}
        {like.error && <p role="alert" className="text-sm text-destructive">{like.error.message}</p>}
        {isLoading ? <CardSection><p role="status" className="text-sm text-muted-foreground">Loading feed…</p></CardSection> : isError ? <ApiErrorState message={error instanceof Error ? error.message : 'Failed to load feed'} onRetry={() => refetch()} /> : posts.length === 0 ? <CardSection><h2 className="font-semibold">No updates yet</h2><p className="mt-2 text-sm text-muted-foreground">Be the first to share what you are building with {audience === 'students' ? 'student makers' : 'the community'}.</p></CardSection> : posts.map((post) => (
          <CardSection key={post.id}>
            <article>
              <div className="mb-4 flex items-center gap-3"><Avatar className="size-10"><AvatarImage src={post.user.avatar} alt={post.user.name} /><AvatarFallback>{post.user.name.slice(0, 2)}</AvatarFallback></Avatar><div className="min-w-0"><p className="break-words font-semibold">{post.user.name}</p><p className="text-xs text-muted-foreground">{new Date(post.date).toLocaleDateString()}</p></div></div>
              <h2 className="whitespace-pre-wrap break-words text-lg font-semibold leading-relaxed">{post.caption}</h2>
              {post.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{post.description}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <Button variant="ghost" size="sm" aria-label={`Like update by ${post.user.name}; ${post.likes} likes`} disabled={like.isPending} onClick={() => like.mutate(post.id)}><Heart /><span>{post.likes}</span></Button>
                <span className="inline-flex items-center gap-2 text-muted-foreground"><MessageCircle className="size-4" /><span>{post.comments} comments</span></span>
                <Button variant="ghost" size="sm" aria-label={`Share update by ${post.user.name}`} onClick={() => share(post.caption)}><Share2 /><span>Share</span></Button>
              </div>
            </article>
          </CardSection>
        ))}
      </div>
      <aside className="space-y-4">
        <CardSection><h2 className="text-lg font-semibold">Your maker identity</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Showcase your work, choose your roles, and build trust with verified credentials.</p><div className="mt-4 space-y-1">{([['/profile', 'View your profile'], ['/account', 'Manage identity & credentials'], ['/messages', 'Open messages']] as const).map(([href, label]) => <Link key={href} href={href} className="flex items-center justify-between gap-3 rounded-md px-2 py-3 text-sm hover:bg-accent"><span>{label}</span><ArrowRight className="size-4 shrink-0" /></Link>)}</div></CardSection>
        <CardSection><h2 className="text-lg font-semibold">Build your network</h2><div className="mt-4 space-y-1">{([['/investors', 'Verified investors'], ['/recruit', 'Recruit teammates'], ['/team/tasks', 'Team tasks']] as const).map(([href, label]) => <Link key={href} href={href} className="flex items-center justify-between gap-3 rounded-md px-2 py-3 text-sm hover:bg-accent"><span>{label}</span><ArrowRight className="size-4 shrink-0" /></Link>)}</div></CardSection>
      </aside>
    </div>
  );
}
