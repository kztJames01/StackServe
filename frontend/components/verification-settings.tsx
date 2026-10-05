"use client";

import { sendEmailVerification } from 'firebase/auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Building2, ShieldCheck } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { getVerification, verifyStudent } from '@/lib/api/verification';
import { CardSection } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import ApiErrorState from '@/components/ApiErrorState';

const message = (error: unknown) => error instanceof Error ? error.message : 'Please try again.';

export function VerificationSettings() {
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

  return (
    <CardSection>
      <div className="mb-6 flex items-center gap-3"><ShieldCheck className="size-5 text-foreground" /><h2 className="text-xl font-semibold">Trust & credentials</h2></div>
      {isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading verification status…</p> : error ? <ApiErrorState message={message(error)} onRetry={() => refetch()} /> : data ? (
        <div className="space-y-6">
          <section className="space-y-3 border-b pb-6">
            <div className="flex flex-wrap items-center gap-2"><GraduationCap className="size-5" /><h3 className="font-semibold">Student status</h3><span className="rounded-full bg-muted px-2 py-1 text-xs">{data.studentStatus === 'verified' ? 'Verified' : 'Not verified'}</span></div>
            <p className="max-w-2xl text-sm text-muted-foreground">A verified university .edu email unlocks your Student badge. SheerID verification is not yet configured.</p>
            {data.studentStatus !== 'verified' && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={email.isPending} onClick={() => email.mutate()}>{email.isPending ? 'Sending…' : 'Send email verification'}</Button>
                <Button disabled={student.isPending} onClick={() => student.mutate()}>{student.isPending ? 'Checking…' : 'Check university email'}</Button>
              </div>
            )}
            {email.isSuccess && <p role="status" className="text-sm">Verification email sent. Check your inbox, then click check above.</p>}
            {(student.error || email.error) && <p role="alert" className="text-sm text-destructive">{message(student.error || email.error)}</p>}
          </section>
          <section className="space-y-3">
            <div className="flex items-center gap-2"><Building2 className="size-5" /><h3 className="font-semibold">Employer</h3><span className="rounded-full bg-muted px-2 py-1 text-xs">{data.employerStatus === 'verified' ? 'Verified' : 'Not available yet'}</span></div>
            <p className="max-w-2xl text-sm text-muted-foreground">Employer verification requires a connected provider. Not yet configured.</p>
          </section>
        </div>
      ) : null}
    </CardSection>
  );
}
