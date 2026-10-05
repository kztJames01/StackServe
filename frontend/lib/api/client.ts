import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import * as Sentry from "@sentry/nextjs";
import { sha256 } from "@noble/hashes/sha2.js";
// shared with the mobile app
import { DEFAULT_API_BASE, parseErrorMessage } from "../../../shared/apiHelpers";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const currentAuth = auth;
    if (!currentAuth) return {};
    const user = await new Promise<import('firebase/auth').User | null>((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(currentAuth, (user) => { unsubscribe(); resolve(user); }, reject);
    });
    const token = await user?.getIdToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      const message = parseErrorMessage(errorText, response.status);
      const err = new ApiError(message, response.status);
      Sentry.captureException(err, { extra: { path, status: response.status } });
      throw err;
    }

    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    Sentry.captureException(err, { extra: { path } });
    throw new ApiError("Network request failed", 0);
  }
}

export type AccountRole = 'maker' | 'employer' | 'investor' | 'educator';

export type ProfileData = {
  id?: string;
  email?: string;
  handle: string | null;
  roles: AccountRole[];
  studentStatus: 'unverified' | 'verified';
  employerStatus: 'unverified' | 'verified';
  isAdmin?: boolean;
  name: string;
  bio: string;
  avatar: string;
  skills: string[];
  socials: { github: string; linkedin: string; twitter: string };
};

export type ProjectItem = {
  id: string;
  slug: string;
  workspaceId?: string;
  title: string;
  description: string;
  image: string;
  tags: string[];
  status?: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeId: string;
  teamId: string;
  dueDate: string;
};

export type Conversation = {
  id: string;
  participants: { id: string; name: string; avatar: string }[];
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export type HistoryEntry = {
  id: string;
  title: string;
  description: string;
  date: string;
  type: string;
};

export type BillingStatus = {
  plan: string;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  priceId: string | null;
};

export type StorageUploadData = {
  key: string;
  uploadUrl: string;
  fileUrl: string;
  method: string;
  headers?: Record<string, string>;
};

export async function getProfile() {
  return request<ProfileData>("/api/profile");
}

export async function updateProfile(data: Partial<ProfileData>) {
  return request<{ data: ProfileData; message: string }>("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getProfileProjects() {
  return request<ProjectItem[]>("/api/profile/projects");
}

export async function getProjects(workspaceId: string, tag?: string) {
  const qs = tag ? `?tag=${encodeURIComponent(tag)}` : "";
  return request<ProjectItem[]>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/shoots${qs}`);
}

export async function getProject(workspaceId: string, slug: string) {
  return request<ProjectItem>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/shoots/${encodeURIComponent(slug)}`);
}

export async function createProject(workspaceId: string, data: Omit<ProjectItem, "id" | "slug" | "workspaceId">) {
  return request<{ data: ProjectItem; message: string }>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/shoots`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProject(workspaceId: string, id: string, data: Partial<ProjectItem>) {
  return request<{ data: ProjectItem; message: string; warning?: string | null }>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/shoots/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteProject(workspaceId: string, id: string) {
  await request(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/shoots/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getConversations() {
  return request<Conversation[]>("/api/conversations");
}

export async function getMessages(conversationId: string) {
  return request<Message[]>(`/api/messages?conversationId=${conversationId}`);
}

export async function sendMessage(data: {
  conversationId: string;
  receiverId: string;
  content: string;
}) {
  return request<{ data: Message; message: string }>("/api/messages", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getNotifications() {
  return request<Notification[]>("/api/notifications");
}

export async function markNotificationRead(id: string) {
  await request(`/api/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead() {
  await request("/api/notifications/read-all", { method: "PATCH" });
}

export async function getMe() {
  return request<ProfileData>("/api/users/me");
}

export async function updateMe(data: Partial<ProfileData>) {
  return request<{ data: ProfileData; message: string }>("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export type AuthConfig = {
  google: boolean;
  apple: boolean;
  authMode: string;
};

export async function getAuthConfig() {
  return request<AuthConfig>("/api/auth/config");
}

export async function syncAuthSession() {
  return request<{
    ok: boolean;
    signInProvider: string | null;
    profile: { id: string; email?: string; name: string; handle: string | null };
  }>("/api/auth/sync", { method: "POST" });
}

export async function getHistory() {
  return request<HistoryEntry[]>("/api/history");
}

export async function createHistoryEntry(data: Omit<HistoryEntry, "id">) {
  return request<{ data: HistoryEntry; message: string }>("/api/history", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export type AvailabilityRow = {
  id: string;
  freelancerId: string;
  start: string;
  end: string;
  status: "available" | "booked" | "hold";
  shootId?: string | null;
};

export async function getAvailability(freelancerId?: string) {
  const query = freelancerId ? `?freelancerId=${encodeURIComponent(freelancerId)}` : "";
  return request<AvailabilityRow[]>(`/api/availability${query}`);
}

export async function createAvailability(data: Omit<AvailabilityRow, "id">) {
  return request<{ data: AvailabilityRow; message: string }>("/api/availability", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteAvailability(id: string) {
  return request<{ message: string }>(`/api/availability/${id}`, {
    method: "DELETE",
  });
}

export type License = {
  id: string;
  workspace_id: string;
  shoot_id: string;
  freelancer_id: string;
  media_ref: string;
  usage_type: string[];
  territories: string[];
  duration_months: number | null;
  starts_at: string;
  expires_at: string | null;
  fee_cents: number | null;
  status: "draft" | "sent" | "signed" | "expired" | "disputed";
  signed_pdf_ref: string | null;
  signed_name: string | null;
  signed_at: string | null;
  created_at: string;
};

export type ComplianceReport = {
  red: { shootId: string; title: string; reason: string; licenseIds?: string[] }[];
  amber: { licenseId: string; shootId: string; freelancerId: string; expiresAt: string; reason: string }[];
  yellow: { shootId: string; title: string; freelancerId: string; reason: string }[];
  green: boolean;
  counts: { red: number; amber: number; yellow: number };
};

export async function getLicenses(workspaceId: string, shootId?: string) {
  const qs = new URLSearchParams({ workspaceId, ...(shootId ? { shootId } : {}) }).toString();
  return request<License[]>(`/api/licenses?${qs}`);
}

export async function createLicense(data: {
  workspaceId: string;
  shootId: string;
  freelancerId: string;
  mediaRef?: string;
  usageType?: string[];
  territories?: string[];
  durationMonths?: number | null;
  startsAt: string;
  feeCents?: number | null;
}) {
  return request<{ data: License; message: string }>("/api/licenses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateLicense(id: string, data: { status?: string; feeCents?: number | null }) {
  return request<{ data: License; message: string }>(`/api/licenses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function signLicense(id: string, typedName: string) {
  return request<{ data: License; message: string }>(`/api/licenses/${id}/sign`, {
    method: "POST",
    body: JSON.stringify({ typedName }),
  });
}

export async function deleteLicense(id: string) {
  return request<{ message: string }>(`/api/licenses/${id}`, { method: "DELETE" });
}

// studio tier only, downloads the audit csv
export async function downloadLicensesCsv(workspaceId: string, shootId?: string) {
  const authHeaders = await getAuthHeaders();
  const qs = `?${new URLSearchParams({ workspaceId, ...(shootId ? { shootId } : {}) }).toString()}`;
  const response = await fetch(`${API_BASE}/api/licenses/export${qs}`, { headers: authHeaders });
  if (!response.ok) {
    const message = parseErrorMessage(await response.text(), response.status);
    throw new ApiError(message, response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `licenses${shootId ? `-${shootId}` : ""}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function getCompliance(workspaceId: string) {
  return request<ComplianceReport>(`/api/compliance?workspaceId=${encodeURIComponent(workspaceId)}`);
}

export async function getBillingStatus() {
  return request<BillingStatus>("/api/billing/status");
}

export async function getSeats() {
  return request<{ seats: number; freeSeatLimit: number }>("/api/billing/seats");
}

export async function updateSeats(seats: number) {
  return request<{ seats: number; message: string }>("/api/billing/seats", {
    method: "POST",
    body: JSON.stringify({ seats }),
  });
}

export async function createBillingCheckoutSession(priceId?: string, seats?: number) {
  return request<{ url: string }>("/api/billing/create-checkout-session", {
    method: "POST",
    body: JSON.stringify({ ...(priceId ? { priceId } : {}), ...(seats ? { seats } : {}) }),
  });
}

export async function createBillingPortalSession() {
  return request<{ url: string }>("/api/billing/create-portal-session", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function createStorageUploadUrl(folder: "avatars" | "projects", file: File) {
  return request<StorageUploadData>("/api/storage/upload-url", {
    method: "POST",
    body: JSON.stringify({
      folder,
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  });
}

export async function uploadFileToStorage(folder: "avatars" | "projects", file: File) {
  const signed = await createStorageUploadUrl(folder, file);
  const response = await fetch(signed.uploadUrl, {
    method: signed.method || "PUT",
    headers: {
      "Content-Type": file.type,
      ...(signed.headers || {}),
    },
    body: file,
  });

  if (!response.ok) {
    const err = new ApiError("Upload failed", response.status);
    Sentry.captureException(err, { extra: { folder, key: signed.key, status: response.status } });
    throw err;
  }

  return signed;
}

export { request };

export type WorkspaceRole = 'admin' | 'producer' | 'clearance_counsel' | 'performer';

export type Workspace = {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  member_role: WorkspaceRole;
  created_at: string;
};

export type WorkspaceMember = {
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
  email: string;
  name: string;
  handle: string | null;
  avatar: string | null;
};

export type RateCard = {
  id: string;
  job_category: string;
  union_code: string;
  scale_type: string;
  day_rate_cents: number;
  half_day_rate_cents: number | null;
  session_rate_cents: number | null;
  notes: string;
};

export async function getWorkspaces() {
  return request<Workspace[]>('/api/v1/workspaces');
}

export async function createWorkspace(data: { name: string; description?: string }) {
  return request<{ data: Workspace; message: string }>('/api/v1/workspaces', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getWorkspaceMembers(workspaceId: string) {
  return request<WorkspaceMember[]>(`/api/v1/workspaces/${workspaceId}/members`);
}

export async function getWorkspaceRoster(workspaceId: string) {
  return request<WorkspaceMember[]>(`/api/v1/workspaces/${workspaceId}/roster`);
}

export async function updateMemberRole(workspaceId: string, userId: string, role: WorkspaceRole) {
  return request<{ data: WorkspaceMember; message: string }>(
    `/api/v1/workspaces/${workspaceId}/members/${userId}/role`,
    { method: 'PATCH', body: JSON.stringify({ role }) }
  );
}

export async function removeMember(workspaceId: string, userId: string) {
  return request<{ message: string }>(
    `/api/v1/workspaces/${workspaceId}/members/${userId}`,
    { method: 'DELETE' }
  );
}

export async function inviteToWorkspace(workspaceId: string, email: string, role: WorkspaceRole) {
  return request<{ data: { token: string; email: string; role: string }; message: string }>(
    `/api/v1/workspaces/${workspaceId}/invite`,
    { method: 'POST', body: JSON.stringify({ email, role }) }
  );
}

export async function acceptWorkspaceInvite(token: string) {
  return request<{ message: string }>(`/api/v1/workspaces/invites/${token}/accept`, {
    method: 'POST',
  });
}

export async function getRateCards() {
  return request<RateCard[]>('/api/v1/rate-cards');
}

export type MediaAsset = {
  id: string;
  workspace_id: string;
  shoot_id: string | null;
  uploader_id: string;
  filename: string;
  mime_type: string;
  file_size_bytes: number;
  sha256_hash: string;
  b2_storage_key: string | null;
  b2_public_url: string | null;
  upload_state: 'pending' | 'uploaded' | 'verified' | 'failed';
  ai_generated: boolean;
  ai_model_name: string | null;
  created_at: string;
};

export type UploadRequest = {
  asset_id: string;
  upload_url: string;
  key: string;
  method: string;
  headers: Record<string, string>;
};

// calculate SHA-256 of a File using the Web Crypto API (chunked)
export async function sha256File(file: File, onProgress?: (percent: number) => void): Promise<string> {
  const CHUNK = 8 * 1024 * 1024; // 8MB chunks
  const hasher = sha256.create();
  let offset = 0;
  while (offset < file.size) {
    const chunk = new Uint8Array(await file.slice(offset, offset + CHUNK).arrayBuffer());
    hasher.update(chunk);
    offset += CHUNK;
    onProgress?.(Math.min(100, Math.round((offset / file.size) * 100)));
  }
  return Array.from(hasher.digest()).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function requestMediaUpload(data: {
  workspace_id: string;
  shoot_id?: string;
  filename: string;
  mime_type: string;
  file_size_bytes: number;
  sha256_hash: string;
  ai_model_name?: string;
}) {
  return request<UploadRequest>('/api/v1/media/request-upload', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function completeMediaUpload(assetId: string) {
  return request<{ data: MediaAsset; message: string }>(`/api/v1/media/${assetId}/complete`, {
    method: 'POST',
  });
}

export async function getShootMedia(workspaceId: string, shootId?: string) {
  const qs = shootId ? `?shoot_id=${encodeURIComponent(shootId)}` : '';
  return request<MediaAsset[]>(`/api/v1/workspaces/${workspaceId}/media${qs}`);
}

// full upload pipeline: hash → request presign → PUT to B2 → complete
export async function uploadMediaAsset(
  file: File,
  opts: { workspace_id: string; shoot_id?: string; ai_model_name?: string },
  onProgress?: (stage: string) => void
): Promise<MediaAsset> {
  onProgress?.('Calculating SHA-256…');
  const sha256_hash = await sha256File(file, (percent) => onProgress?.(`Calculating SHA-256… ${percent}%`));

  onProgress?.('Requesting upload URL…');
  const { asset_id, upload_url, headers } = await requestMediaUpload({
    ...opts,
    filename: file.name,
    mime_type: file.type,
    file_size_bytes: file.size,
    sha256_hash,
  });

  onProgress?.('Uploading to storage… 0%');
  await new Promise<void>((resolve, reject) => {
    const upload = new XMLHttpRequest();
    upload.open('PUT', upload_url);
    for (const [key, value] of Object.entries({ 'Content-Type': file.type, ...headers })) upload.setRequestHeader(key, value);
    upload.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(`Uploading to storage… ${Math.round((event.loaded / event.total) * 100)}%`);
    };
    upload.onerror = () => reject(new ApiError('Upload to storage failed', 0));
    upload.onload = () => upload.status >= 200 && upload.status < 300
      ? resolve()
      : reject(new ApiError('Upload to storage failed', upload.status));
    upload.send(file);
  });

  onProgress?.('Verifying SHA-256 in storage…');
  const completed = await completeMediaUpload(asset_id);
  return completed.data;
}

export type DigitalRider = {
  id: string;
  shoot_id: string;
  performer_name: string;
  performer_email: string;
  agent_email: string | null;
  union_status: string;
  replica_type: string;
  permitted_media: string[];
  geographic_territory: string[];
  intended_use_description: string;
  exclusionary_clauses: string[];
  advance_notice_given_at: string | null;
  starts_at: string;
  expires_at: string;
  base_scale_rate_cents: number;
  replica_multiplier: number | string;
  total_session_fee_cents: number;
  pension_health_cents: number;
  compensation_status: string;
  status: string;
  typed_name: string | null;
  signed_at: string | null;
  signed_pdf_ref?: string | null;
  notice_token?: string | null;
};

export async function getShootRiders(workspaceId: string, shootId: string) {
  return request<DigitalRider[]>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/contracts?shoot_id=${encodeURIComponent(shootId)}`);
}

export async function getWorkspaceRiders(workspaceId: string) {
  return request<DigitalRider[]>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/contracts`);
}

export async function draftRider(data: {
  workspace_id: string;
  shoot_id: string;
  performer_id?: string;
  performer_name: string;
  performer_email: string;
  agent_email?: string;
  union_status: string;
  replica_type: string;
  permitted_media: string[];
  geographic_territory: string[];
  intended_use_description: string;
  exclusionary_clauses: string[];
  starts_at: string;
  duration_months: number;
  base_scale_rate_cents: number;
}) {
  return request<{ data: DigitalRider; message: string }>('/api/v1/contracts/draft', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function sendRiderNotice(id: string, workspaceId: string) {
  return request<{ data: DigitalRider; message: string }>(`/api/v1/contracts/${id}/send-notice`, {
    method: 'POST',
    body: JSON.stringify({ workspace_id: workspaceId }),
  });
}

export async function getRiderReview(token: string) {
  return request<DigitalRider>(`/api/v1/contracts/review/${encodeURIComponent(token)}`);
}

export async function signRiderReview(token: string, typedName: string) {
  return request<{ data: DigitalRider; message: string }>(`/api/v1/contracts/review/${encodeURIComponent(token)}/sign`, {
    method: 'POST',
    body: JSON.stringify({ typed_name: typedName }),
  });
}

export type PaypalInvoice = {
  id: string;
  workspace_id: string;
  shoot_id: string | null;
  paypal_invoice_id: string | null;
  recipient_email: string | null;
  status: string;
  total_cents: number;
  created_at: string;
};

export type PaypalDispute = {
  id: string;
  workspace_id: string;
  paypal_dispute_id: string;
  reason: string | null;
  status: string | null;
  amount_cents: number | null;
  last_note: string | null;
};

export async function createPaypalSubscription(workspaceId: string) {
  return request<{ url: string; subscription_id: string; status: string }>('/api/v1/paypal/subscribe', {
    method: 'POST',
    body: JSON.stringify({ workspace_id: workspaceId }),
  });
}

export async function getPaypalInvoices(workspaceId: string) {
  return request<PaypalInvoice[]>(`/api/v1/paypal/invoices?workspaceId=${encodeURIComponent(workspaceId)}`);
}

export async function createShootInvoice(workspaceId: string, shootId: string, recipientEmail?: string) {
  return request<{ data: PaypalInvoice; message: string }>(`/api/v1/workspaces/${workspaceId}/invoices`, {
    method: 'POST',
    body: JSON.stringify({ shoot_id: shootId, recipient_email: recipientEmail }),
  });
}

export async function getPaypalDisputes(workspaceId: string) {
  return request<PaypalDispute[]>(`/api/v1/paypal/disputes?workspaceId=${encodeURIComponent(workspaceId)}`);
}

export async function sendPaypalDisputeNote(id: string, note: string) {
  return request<{ message: string }>(`/api/v1/paypal/disputes/${id}/note`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function exportPayrollBatch(workspaceId: string, shootId: string, format: 'WRAPBOOK_CSV' | 'GREENSLATE_JSON') {
  return request<{ data: { id: string }; filename: string; contentType: string; body: string; message: string }>(
    '/api/v1/payroll/export-batch',
    {
      method: 'POST',
      body: JSON.stringify({ workspace_id: workspaceId, shoot_id: shootId, format }),
    },
  );
}

export async function downloadClearanceCertificate(workspaceId: string) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE}/api/v1/workspaces/${encodeURIComponent(workspaceId)}/clearance-certificate`,
    { headers: authHeaders, cache: 'no-store' },
  );
  if (!response.ok) {
    throw new ApiError('Failed to download clearance certificate', response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'clearance-certificate.pdf';
  a.click();
  URL.revokeObjectURL(url);
}



