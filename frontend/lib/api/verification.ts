import { request } from './client';

export type VerificationStatus = {
  studentStatus: 'unverified' | 'verified';
  employerStatus: 'unverified' | 'verified';
  universityEmailEligible: boolean;
  isAdmin: boolean;
  providers: { sheerId: boolean; employer: boolean };
};

export const getVerification = () => request<VerificationStatus>('/api/verification');
export const verifyStudent = () => request<{ message: string }>('/api/verification/student', { method: 'POST' });
