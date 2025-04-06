import { getSession } from "next-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const session = await getSession();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (session) {
    headers['Authorization'] = `Bearer ${session.user.id}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'An error occurred');
  }
  
  return response.json();
}

// Job Listing API Functions

export interface JobListing {
  id?: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  salary?: string;
  contactEmail: string;
  postedDate?: string;
  deadline?: string;
  isActive?: boolean;
}

/**
 * Fetch all job listings
 */
export async function getJobListings() {
  return fetchWithAuth('/api/jobs');
}

/**
 * Fetch a single job listing by ID
 */
export async function getJobListing(id: string) {
  return fetchWithAuth(`/api/jobs/${id}`);
}

/**
 * Create a new job listing
 */
export async function createJobListing(jobData: JobListing) {
  return fetchWithAuth('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(jobData),
  });
}

/**
 * Update an existing job listing
 */
export async function updateJobListing(id: string, jobData: Partial<JobListing>) {
  return fetchWithAuth(`/api/jobs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(jobData),
  });
}

/**
 * Delete a job listing
 */
export async function deleteJobListing(id: string) {
  return fetchWithAuth(`/api/jobs/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Apply for a job listing
 */
export async function applyForJob(jobId: string, applicationData: {
  name: string;
  email: string;
  resume: string; // This could be a file URL or base64 encoded string
  coverLetter?: string;
}) {
  return fetchWithAuth(`/api/jobs/${jobId}/apply`, {
    method: 'POST',
    body: JSON.stringify(applicationData),
  });
}

/**
 * Search job listings with filters
 */
export async function searchJobListings(filters: {
  query?: string;
  location?: string;
  company?: string;
  sortBy?: 'recent' | 'relevance' | 'salary';
}) {
  const queryParams = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      queryParams.append(key, value);
    }
  });
  
  return fetchWithAuth(`/api/jobs/search?${queryParams.toString()}`);
}
