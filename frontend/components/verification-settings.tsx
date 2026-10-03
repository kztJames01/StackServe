"use client";

import { useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { BadgeCheck, GraduationCap, Building2, ShieldCheck } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { AccountRole } from '@/lib/api/client';
import { getVerification, verifyStudent, submitInvestor, getInvestorQueue, reviewInvestor, InvestorCredentials, InvestorSubmission } from '@/lib/api/verification';
import { CardSection } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ApiErrorState from '@/components/ApiErrorState';

const message = (error: unknown) => error instanceof Error ? error.message : 'Please try again.';

export function VerificationSettings({ roles }: { roles: AccountRole[] }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['verification'], queryFn: getVerification });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['verification'] });
    queryClient.invalidateQueries({ queryKey: ['me'] });
    queryClient.invalidateQueries({ queryKey: ['userProfile'] });
  };
  const student = useMutation({ mutationFn: async () => {
    if (auth?.currentUser) { await auth.currentUser.reload(); await auth.currentUser.getIdToken(true); }
    return verifyStudent();
  }, onSuccess: refresh });
  const email = useMutation({ mutationFn: async () => {
    if (!auth?.currentUser) throw new Error('Sign in to verify your email.');
    await sendEmailVerification(auth.currentUser);
  } });
  const investor = useMutation({ mutationFn: submitInvestor, onSuccess: refresh });

  return (
    <CardSection>
      <div className="mb-6 flex items-center gap-3"><ShieldCheck className="size-5 text-foreground" /><h2 className="text-xl font-semibold">Trust & credentials</h2></div>
      {isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading verification status…</p> : error ? <ApiErrorState message={message(error)} onRetry={() => refetch()} /> : data ? (
        <div className="space-y-6">
          <section className="space-y-3 border-b pb-6">
            <div className="flex flex-wrap items-center gap-2"><GraduationCap className="size-5" /><h3 className="font-semibold">Student Maker</h3><span className="rounded-full bg-muted px-2 py-1 text-xs">{data.studentStatus === 'verified' ? 'Verified' : 'Not verified'}</span></div>
            <p className="max-w-2xl text-sm text-muted-foreground">A verified university .edu email unlocks your Student Maker badge and student-only discovery. SheerID verification is not configured yet.</p>
            {data.studentStatus === 'verified' ? <Button variant="outline" asChild><Link href="/explore?audience=students">Open student discovery</Link></Button> : (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={email.isPending} onClick={() => email.mutate()}>{email.isPending ? 'Sending…' : 'Send email verification'}</Button>
                <Button disabled={student.isPending} onClick={() => student.mutate()}>{student.isPending ? 'Checking…' : 'Check university email'}</Button>
              </div>
            )}
            {email.isSuccess && <p role="status" className="text-sm">Verification email sent. Open the email, then check your university email here.</p>}
            {(student.error || email.error) && <p role="alert" className="text-sm text-destructive">{message(student.error || email.error)}</p>}
          </section>
          <section className="space-y-3 border-b pb-6">
            <div className="flex items-center gap-2"><Building2 className="size-5" /><h3 className="font-semibold">Employer</h3><span className="rounded-full bg-muted px-2 py-1 text-xs">{data.employerStatus === 'verified' ? 'Verified' : 'Not available yet'}</span></div>
            <p className="max-w-2xl text-sm text-muted-foreground">Employer verification requires both company domain evidence and a connected verification provider. Provider access has not been configured; no employer badge will be granted.</p>
          </section>
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2"><BadgeCheck className="size-5" /><h3 className="font-semibold">Investor credentials</h3><span className="rounded-full bg-muted px-2 py-1 text-xs capitalize">{data.investor?.status || 'Not submitted'}</span></div>
            <p className="max-w-2xl text-sm text-muted-foreground">Use your verified organization email and submit your investment details for staff review. Only approved investors appear in discovery. AUM and investment details are self-declared.</p>
            {data.investor?.reviewNote && <p className="rounded-md bg-muted p-3 text-sm">Review feedback: {data.investor.reviewNote}</p>}
            {roles.includes('investor') ? <InvestorForm key={data.investor?.status || 'new'} initial={data.investor} pending={investor.isPending} onSubmit={(credentials) => investor.mutate(credentials)} /> : <p className="text-sm text-muted-foreground">Select and save the investor account role above to submit credentials.</p>}
            {investor.error && <p role="alert" className="text-sm text-destructive">{message(investor.error)}</p>}
            {investor.isSuccess && <p role="status" className="text-sm">Submitted for staff review. You will not be featured until approved.</p>}
          </section>
          {data.isAdmin && <InvestorReviewQueue />}
        </div>
      ) : null}
    </CardSection>
  );
}

function InvestorForm({ initial, pending, onSubmit }: { initial: InvestorCredentials | null; pending: boolean; onSubmit: (data: InvestorCredentials) => void }) {
  const [values, setValues] = useState({ orgDomain: initial?.orgDomain || '', checkSize: initial?.checkSize || '', stage: initial?.stage || '', aumRange: initial?.aumRange || '', thesis: initial?.thesis || '', portfolio: initial?.portfolio.join(', ') || '' });
  return (
    <form className="grid max-w-3xl gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); onSubmit({ ...values, portfolio: values.portfolio.split(',').map((value) => value.trim()).filter(Boolean) }); }}>
      {([['orgDomain', 'Organization domain', 'company.com'], ['checkSize', 'Check size range', '$25k–$100k'], ['stage', 'Investment stage', 'Pre-seed, seed'], ['aumRange', 'AUM range (self-declared)', '$1m–$5m']] as const).map(([field, label, placeholder]) => (
        <div key={field} className="space-y-2"><label htmlFor={`investor-${field}`} className="text-sm font-medium">{label}</label><Input id={`investor-${field}`} value={values[field]} placeholder={placeholder} required maxLength={field === 'orgDomain' ? 253 : 100} disabled={pending} onChange={(event) => setValues({ ...values, [field]: event.target.value })} /></div>
      ))}
      <div className="space-y-2 sm:col-span-2"><label htmlFor="investor-thesis" className="text-sm font-medium">Investment thesis</label><Textarea id="investor-thesis" value={values.thesis} required minLength={20} maxLength={2000} rows={4} disabled={pending} onChange={(event) => setValues({ ...values, thesis: event.target.value })} /><p className="text-xs text-muted-foreground">20–2000 characters. Describe the teams and markets you invest in.</p></div>
      <div className="space-y-2 sm:col-span-2"><label htmlFor="investor-portfolio" className="text-sm font-medium">Portfolio companies</label><Input id="investor-portfolio" value={values.portfolio} disabled={pending} onChange={(event) => setValues({ ...values, portfolio: event.target.value })} /><p className="text-xs text-muted-foreground">Separate company names with commas. Leave blank if you have not invested yet.</p></div>
      <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? 'Submitting…' : 'Submit for review'}</Button></div>
    </form>
  );
}

function InvestorReviewQueue() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ['investor-review', page], queryFn: () => getInvestorQueue(page) });
  const review = useMutation({ mutationFn: ({ submission, decision, note }: { submission: InvestorSubmission; decision: 'verified' | 'rejected'; note: string }) => reviewInvestor(submission, decision, note), onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['investor-review'] });
    queryClient.invalidateQueries({ queryKey: ['investors'] });
  } });
  return (
    <section className="space-y-4 border-t pt-6">
      <h3 className="text-lg font-semibold">Staff review queue</h3>
      {isLoading ? <p role="status">Loading submissions…</p> : error ? <ApiErrorState message={message(error)} onRetry={() => refetch()} /> : data.length === 0 ? <p className="text-sm text-muted-foreground">No pending submissions on this page.</p> : data.map((submission) => <ReviewSubmission key={submission.id} submission={submission} disabled={review.isPending} onReview={(decision, note) => review.mutate({ submission, decision, note })} />)}
      {review.error && <p role="alert" className="text-sm text-destructive">{message(review.error)}</p>}
      {review.isSuccess && <p role="status" className="text-sm">Review recorded.</p>}
      <div className="flex items-center gap-3"><Button variant="outline" disabled={page === 1 || isLoading} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-sm">Page {page}</span><Button variant="outline" disabled={data.length < 25 || isLoading} onClick={() => setPage(page + 1)}>Next</Button></div>
    </section>
  );
}

function ReviewSubmission({ submission, disabled, onReview }: { submission: InvestorSubmission; disabled: boolean; onReview: (decision: 'verified' | 'rejected', note: string) => void }) {
  const [note, setNote] = useState('');
  return (
    <article className="space-y-3 rounded-lg border p-4">
      <h4 className="font-semibold">{submission.name}</h4>
      <p className="break-words text-sm text-muted-foreground">{submission.orgDomain} · {submission.stage} · Check size: {submission.checkSize} · AUM: {submission.aumRange}</p>
      <p className="whitespace-pre-wrap text-sm">{submission.thesis}</p>
      <p className="text-sm">Portfolio: {submission.portfolio.join(', ') || 'None declared'}</p>
      <label htmlFor={`review-${submission.id}`} className="block text-sm font-medium">Review evidence and decision note (required)</label>
      <Textarea id={`review-${submission.id}`} value={note} maxLength={2000} disabled={disabled} onChange={(event) => setNote(event.target.value)} />
      <div className="flex flex-wrap gap-2"><Button disabled={disabled || !note.trim()} onClick={() => onReview('verified', note)}>Approve</Button><Button variant="outline" disabled={disabled || !note.trim()} onClick={() => onReview('rejected', note)}>Reject</Button></div>
    </article>
  );
}
