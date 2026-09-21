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

export const taskActions = {
  async createTask(task: Omit<Task, "id" | "createdAt">) {
    return request<Task>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(task),
    });
  },

  async getTasksByTeam(teamId: string) {
    return request<Task[]>(`/api/tasks?teamId=${encodeURIComponent(teamId)}`);
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
  },
};
