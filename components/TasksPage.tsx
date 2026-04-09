'use client'

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskSkeleton } from '@/components/TaskSkeleton';
import { taskActions, Task } from '@/lib/action/task.actions';
import { PlusIcon, TrashIcon } from 'lucide-react';

const TASK_COLUMNS: Task['status'][] = ['todo', 'in-progress', 'done'];

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const teamId = 'default-team';

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', teamId],
    queryFn: () => taskActions.getTasksByTeam(teamId),
  });

  const createMutation = useMutation({
    mutationFn: taskActions.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', teamId] });
      setIsAdding(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => taskActions.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', teamId] });
    },
  });

  if (isLoading) {
    return <TaskSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Task Board</h2>
        <Button onClick={() => setIsAdding(true)} className="flex gap-2 bg-[#252422] text-white hover:bg-[#1f1e1b]">
          <PlusIcon className="h-4 w-4" /> Add Task
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {TASK_COLUMNS.map((status) => (
          <div key={status} className="space-y-3">
            <CardHeader className="px-0 pb-0">
              <CardTitle className="capitalize">{status}</CardTitle>
            </CardHeader>
            {tasks?.filter((task) => task.status === status).map((task) => (
              <Card key={task.id} className="group bg-white">
                <CardContent className="flex items-start justify-between p-4">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(task.id as string)}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <TrashIcon className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md space-y-4 p-6">
            <h2 className="text-xl font-bold">Create New Task</h2>
            <div className="space-y-2">
              <input className="w-full rounded border p-2" placeholder="Title" id="task-title" />
              <textarea className="w-full rounded border p-2" placeholder="Description" id="task-desc" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button
                className="bg-[#252422] text-white hover:bg-[#1f1e1b]"
                onClick={() => {
                  const title = (document.getElementById('task-title') as HTMLInputElement).value;
                  const description = (document.getElementById('task-desc') as HTMLTextAreaElement).value;

                  createMutation.mutate({
                    title,
                    description,
                    status: 'todo',
                    priority: 'medium',
                    assignedTo: 'current-user',
                    teamId,
                  });
                }}
              >
                Create
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
