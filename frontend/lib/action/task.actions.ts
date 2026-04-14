import { request } from "@/lib/api/client";

export interface Task {
  id?: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  assignedTo: string;
  teamId: string;
  createdAt?: string;
}

const fallbackTasks: Task[] = [
  {
    id: "task-1",
    title: "Draft investor one-pager",
    description: "Share traction and runway summary.",
    status: "todo",
    priority: "high",
    assignedTo: "current-user",
    teamId: "default-team",
    createdAt: new Date().toISOString(),
  },
  {
    id: "task-2",
    title: "Set up onboarding flow",
    description: "Define first-use activation for new founders.",
    status: "in-progress",
    priority: "medium",
    assignedTo: "current-user",
    teamId: "default-team",
    createdAt: new Date().toISOString(),
  },
];

export const taskActions = {
  async createTask(task: Omit<Task, "id" | "createdAt">) {
    try {
      return await request<Task>("/api/tasks", {
        method: "POST",
        body: JSON.stringify(task),
      });
    } catch {
      return {
        ...task,
        id: `${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
    }
  },

  async getTasksByTeam(teamId: string) {
    try {
      return await request<Task[]>(`/api/tasks?teamId=${encodeURIComponent(teamId)}`);
    } catch {
      return fallbackTasks.filter((task) => task.teamId === teamId);
    }
  },

  async updateTaskStatus(taskId: string, status: Task["status"]) {
    await request<Task>(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async deleteTask(taskId: string) {
    await request<{ ok: boolean }>(`/api/tasks/${taskId}`, {
      method: "DELETE",
    });
  }
};
