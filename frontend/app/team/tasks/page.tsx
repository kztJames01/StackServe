'use client'

import TasksPage from '@/components/TasksPage';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function TeamTasksRoute() {
  return (
    <DashboardShell
      title="Team Tasks"
      description="Track delivery across TODO, in-progress, and done columns."
    >
      <TasksPage />
    </DashboardShell>
  );
}


