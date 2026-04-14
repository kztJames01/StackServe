import { auth } from "@/lib/firebase";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const token = await auth?.currentUser?.getIdToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
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
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Fallback data ────────────────────────────────────────────────────────────

const fallbackFeed: FeedPost[] = [
  {
    id: "1",
    user: { name: "Sarah Maker", avatar: "/home.jpg", rating: "4.9" },
    date: "2h ago",
    caption: "Building an AI mentor for early-stage founders",
    description: "Looking for a UI engineer and a growth operator to join this sprint.",
    likes: 42,
    comments: 15,
    shares: 8,
  },
];

const fallbackProfile: ProfileData = {
  name: "John Doe",
  bio: "Founder in Residence | Building products for creators",
  avatar: "/home.jpg",
  skills: ["React", "TypeScript", "Node.js", "Product Strategy"],
  socials: {
    github: "https://github.com/johndoe",
    linkedin: "https://linkedin.com/in/johndoe",
    twitter: "https://twitter.com/johndoe",
  },
};

const fallbackProjects: ProjectItem[] = [
  {
    id: 1,
    title: "AI Chatbot",
    description: "Conversational assistant for startup ops.",
    image: "/home.jpg",
    tags: ["AI", "Python"],
  },
  {
    id: 2,
    title: "Founder CRM",
    description: "Track outreach, investors, and user interviews.",
    image: "/home.jpg",
    tags: ["Next.js", "Node.js"],
  },
];

const fallbackPosts: PostItem[] = [
  {
    id: 1,
    content: "Shipped our MVP landing page today.",
    likes: 24,
    comments: 8,
    date: "2 days ago",
  },
];

// ─── Feed ─────────────────────────────────────────────────────────────────────

export async function getFeedPosts(): Promise<FeedPost[]> {
  try {
    return await request<FeedPost[]>("/api/feed");
  } catch {
    return fallbackFeed;
  }
}

export async function createPost(content: string): Promise<{ data: FeedPost; message: string }> {
  return request("/api/posts", {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function likePost(postId: string): Promise<{ likes: number }> {
  return request(`/api/posts/${postId}/like`, { method: "POST" });
}

export async function deletePost(postId: string): Promise<void> {
  await request(`/api/posts/${postId}`, { method: "DELETE" });
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<ProfileData> {
  try {
    return await request<ProfileData>("/api/profile");
  } catch {
    return fallbackProfile;
  }
}

export async function updateProfile(data: Partial<ProfileData>): Promise<{ data: ProfileData; message: string }> {
  return request("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getProfileProjects(): Promise<ProjectItem[]> {
  try {
    return await request<ProjectItem[]>("/api/profile/projects");
  } catch {
    return fallbackProjects;
  }
}

export async function getProfilePosts(): Promise<PostItem[]> {
  try {
    return await request<PostItem[]>("/api/profile/posts");
  } catch {
    return fallbackPosts;
  }
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function getProjects(tag?: string): Promise<ProjectItem[]> {
  try {
    const qs = tag ? `?tag=${encodeURIComponent(tag)}` : "";
    return await request<ProjectItem[]>(`/api/projects${qs}`);
  } catch {
    return [];
  }
}

export async function getProject(slug: string): Promise<ProjectItem> {
  return request<ProjectItem>(`/api/projects/${slug}`);
}

export async function createProject(
  data: Omit<ProjectItem, "id">
): Promise<{ data: ProjectItem; message: string }> {
  return request("/api/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProject(
  id: string | number,
  data: Partial<ProjectItem>
): Promise<{ data: ProjectItem; message: string }> {
  return request(`/api/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string | number): Promise<void> {
  await request(`/api/projects/${id}`, { method: "DELETE" });
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export async function getTeams(): Promise<Team[]> {
  try {
    return await request<Team[]>("/api/teams");
  } catch {
    return [];
  }
}

export async function getTeam(id: string): Promise<Team> {
  return request<Team>(`/api/teams/${id}`);
}

export async function createTeam(data: {
  name: string;
  description: string;
}): Promise<{ data: Team; message: string }> {
  return request("/api/teams", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getConversations(): Promise<Conversation[]> {
  try {
    return await request<Conversation[]>("/api/conversations");
  } catch {
    return [];
  }
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  try {
    return await request<Message[]>(`/api/messages?conversationId=${conversationId}`);
  } catch {
    return [];
  }
}

export async function sendMessage(data: {
  conversationId: string;
  receiverId: string;
  content: string;
}): Promise<{ data: Message; message: string }> {
  return request("/api/messages", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── Notifications ───────────────────────────────────────────────────────────

export async function getNotifications(): Promise<Notification[]> {
  try {
    return await request<Notification[]>("/api/notifications");
  } catch {
    return [];
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  await request(`/api/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await request("/api/notifications/read-all", { method: "PATCH" });
}

// ─── Recruit ──────────────────────────────────────────────────────────────────

export async function getRecruitListings(tag?: string): Promise<RecruitListing[]> {
  try {
    const qs = tag ? `?tag=${encodeURIComponent(tag)}` : "";
    return await request<RecruitListing[]>(`/api/recruit${qs}`);
  } catch {
    return [];
  }
}

export async function createRecruitListing(
  data: Omit<RecruitListing, "id" | "createdAt">
): Promise<{ data: RecruitListing; message: string }> {
  return request("/api/recruit", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── Investors ───────────────────────────────────────────────────────────────

export async function getInvestors(stage?: string): Promise<Investor[]> {
  try {
    const qs = stage ? `?stage=${encodeURIComponent(stage)}` : "";
    return await request<Investor[]>(`/api/investors${qs}`);
  } catch {
    return [];
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getMe(): Promise<ProfileData> {
  try {
    return await request<ProfileData>("/api/users/me");
  } catch {
    return fallbackProfile;
  }
}

export async function updateMe(data: Partial<ProfileData>): Promise<{ data: ProfileData; message: string }> {
  return request("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function getHistory(): Promise<HistoryEntry[]> {
  try {
    return await request<HistoryEntry[]>("/api/history");
  } catch {
    return [];
  }
}

export async function createHistoryEntry(
  data: Omit<HistoryEntry, "id">
): Promise<{ data: HistoryEntry; message: string }> {
  return request("/api/history", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export { request };
