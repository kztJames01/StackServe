const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
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

export async function getFeedPosts(): Promise<FeedPost[]> {
  try {
    return await request<FeedPost[]>("/api/feed");
  } catch {
    return fallbackFeed;
  }
}

export async function getProfile(): Promise<ProfileData> {
  try {
    return await request<ProfileData>("/api/profile");
  } catch {
    return fallbackProfile;
  }
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

export { request };
