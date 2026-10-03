import { request } from './client';

export type InvestorCredentials = {
  orgDomain: string;
  checkSize: string;
  stage: string;
  aumRange: string;
  thesis: string;
  portfolio: string[];
  focusAreas?: string[];
};

export type VerificationStatus = {
  studentStatus: 'unverified' | 'verified';
  employerStatus: 'unverified' | 'verified';
  universityEmailEligible: boolean;
  isAdmin: boolean;
  providers: { sheerId: boolean; employer: boolean };
  investor: (InvestorCredentials & { status: 'unverified' | 'pending' | 'verified' | 'rejected'; reviewNote: string }) | null;
};

export type InvestorSubmission = InvestorCredentials & { id: string; name: string; submittedAt: string };

export const getVerification = () => request<VerificationStatus>('/api/verification');
export const verifyStudent = () => request<{ message: string }>('/api/verification/student', { method: 'POST' });
export const submitInvestor = (credentials: InvestorCredentials) => request<{ message: string }>('/api/verification/investor', { method: 'POST', body: JSON.stringify(credentials) });
export const getInvestorQueue = (page = 1) => request<InvestorSubmission[]>(`/api/verification/investors/review?page=${page}`);
export const reviewInvestor = (submission: InvestorSubmission, decision: 'verified' | 'rejected', note: string) => request<{ message: string }>(`/api/verification/investors/${encodeURIComponent(submission.id)}/review`, { method: 'PATCH', body: JSON.stringify({ decision, note, submittedAt: submission.submittedAt }) });
