import { auth } from './firebase';
import { DEFAULT_API_BASE, parseErrorMessage, API_PATHS } from '@synthpass/core/apiHelpers';

// on a real phone set EXPO_PUBLIC_API_BASE_URL to your computer's LAN ip
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE;

async function getToken() {
  try {
    if (!auth || !auth.currentUser) return null;
    return await auth.currentUser.getIdToken();
  } catch {
    return null;
  }
}

export async function apiRequest(path, options = {}) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(parseErrorMessage(text, res.status));
  }
  return res.json();
}

export function getFeed() {
  return apiRequest(API_PATHS.feed);
}

export function getProfile() {
  return apiRequest(API_PATHS.profile);
}

export function updateMe(data) {
  return apiRequest(API_PATHS.me, { method: 'PATCH', body: JSON.stringify(data) });
}
