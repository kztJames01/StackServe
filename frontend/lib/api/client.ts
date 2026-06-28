import { auth } from "@/lib/firebase";
import * as Sentry from "@sentry/nextjs";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

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
    const token = await auth?.currentUser?.getIdToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

function parseErrorMessage(text: string, status: number) {
  try {
    const body = JSON.parse(text);
    if (body?.message) return body.message;
  } catch {
    // not json
  }
  return text || `Request failed with status ${status}`;
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

export type FeedPost = {
  id: string;
  user: { name: string; avatar: string; rating: string };
  date: string;
  caption: string;
  description: string;
  likes: number;
  comments: number;
  shares: number;
};

export type ProfileData = {
  name: string;
  bio: string;
  avatar: string;
  skills: string[];
  socials: { github: string; linkedin: string; twitter: string };
};

export type ProjectItem = {
  id: number;
  title: string;
  description: string;
  image: string;
  tags: string[];
};

export type PostItem = {
  id: number;
  content: string;
  likes: number;
  comments: number;
  date: string;
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

export type Team = {
  id: string;
  name: string;
  description: string;
  members: { id: string; name: string; avatar: string; role: string }[];
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

export type RecruitListing = {
  id: string;
  title: string;
  description: string;
  skills: string[];
  commitment: string;
  equity: string;
  createdAt: string;
};

export type Investor = {
  id: string;
  name: string;
  bio: string;
  focusAreas: string[];
  stage: string;
  avatar: string;
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

export async function getFeedPosts() {
  return request<FeedPost[]>("/api/feed");
}

export async function createPost(content: string) {
  return request<{ data: FeedPost; message: string }>("/api/posts", {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function likePost(postId: string) {
  return request<{ likes: number }>(`/api/posts/${postId}/like`, { method: "POST" });
}

export async function deletePost(postId: string) {
  await request(`/api/posts/${postId}`, { method: "DELETE" });
}

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

export async function getProfilePosts() {
  return request<PostItem[]>("/api/profile/posts");
}

export async function getProjects(tag?: string) {
  const qs = tag ? `?tag=${encodeURIComponent(tag)}` : "";
  return request<ProjectItem[]>(`/api/projects${qs}`);
}

export async function getProject(slug: string) {
  return request<ProjectItem>(`/api/projects/${slug}`);
}

export async function createProject(data: Omit<ProjectItem, "id">) {
  return request<{ data: ProjectItem; message: string }>("/api/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProject(id: string | number, data: Partial<ProjectItem>) {
  return request<{ data: ProjectItem; message: string }>(`/api/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string | number) {
  await request(`/api/projects/${id}`, { method: "DELETE" });
}

export async function getTeams() {
  return request<Team[]>("/api/teams");
}

export async function getTeam(id: string) {
  return request<Team>(`/api/teams/${id}`);
}

export async function createTeam(data: { name: string; description: string }) {
  return request<{ data: Team; message: string }>("/api/teams", {
    method: "POST",
    body: JSON.stringify(data),
  });
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

export async function getRecruitListings(tag?: string) {
  const qs = tag ? `?tag=${encodeURIComponent(tag)}` : "";
  return request<RecruitListing[]>(`/api/recruit${qs}`);
}

export async function createRecruitListing(data: Omit<RecruitListing, "id" | "createdAt">) {
  return request<{ data: RecruitListing; message: string }>("/api/recruit", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getInvestors(stage?: string) {
  const qs = stage ? `?stage=${encodeURIComponent(stage)}` : "";
  return request<Investor[]>(`/api/investors${qs}`);
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

export async function getHistory() {
  return request<HistoryEntry[]>("/api/history");
}

export async function createHistoryEntry(data: Omit<HistoryEntry, "id">) {
  return request<{ data: HistoryEntry; message: string }>("/api/history", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getBillingStatus() {
  return request<BillingStatus>("/api/billing/status");
}

export async function createBillingCheckoutSession(priceId?: string) {
  return request<{ url: string }>("/api/billing/create-checkout-session", {
    method: "POST",
    body: JSON.stringify(priceId ? { priceId } : {}),
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
