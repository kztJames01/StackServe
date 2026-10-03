'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { fetchWithAuth } from '../../lib/api';
import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { PlusIcon } from '../Icon';
import { formatDateTime } from '../../lib/utils';

const WorkingSpace: React.FC<WorkingSpaceProps> = ({ teamId }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    status: 'planning' as const,
    dueDate: new Date(),
  });
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'todo' as const,
    assignedTo: '',
    dueDate: new Date(),
  });
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchProjects = async () => {
      if (!teamId) return;
      
      try {
        const response = await fetchWithAuth(`/api/teams/${teamId}/projects`);
        const projectsData = response.data;
        
        setProjects(projectsData);
        if (projectsData.length > 0 && !selectedProject) {
          setSelectedProject(projectsData[0].id);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };

    const fetchTeamMembers = async () => {
      if (!teamId) return;
      
      try {
        const response = await fetchWithAuth(`/api/teams/${teamId}/members`);
        setTeamMembers(response.data);
      } catch (error) {
        console.error('Error fetching team members:', error);
      }
    };

    fetchProjects();
    fetchTeamMembers();
  }, [teamId]);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetchWithAuth(`/api/teams/${teamId}/projects`, {
        method: 'POST',
        body: JSON.stringify({
          ...newProject,
          dueDate: newProject.dueDate.toISOString(),
        })
      });
      
      const newProjectData = response.data;
      
      setProjects(prev => [...prev, newProjectData]);
      
      setIsAddingProject(false);
      setNewProject({
        name: '',
        description: '',
        status: 'planning',
        dueDate: new Date(),
      });
      
      setSelectedProject(newProjectData.id);
    } catch (error) {
      console.error('Error adding project:', error);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProject) return;
    
    try {
      const response = await fetchWithAuth(`/api/teams/${teamId}/projects/${selectedProject}/tasks`, {
        method: 'POST',
        body: JSON.stringify({
          ...newTask,
          dueDate: newTask.dueDate.toISOString(),
        })
      });
      
      const newTaskData = response.data;
      
      setProjects(prev => prev.map(project => {
        if (project.id === selectedProject) {
          return {
            ...project,
            tasks: [...project.tasks, newTaskData]
          };
        }
        return project;
      }));
      
      setIsAddingTask(false);
      setNewTask({
        title: '',
        description: '',
        status: 'todo',
        assignedTo: '',
        dueDate: new Date(),
      });
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: 'todo' | 'in-progress' | 'done') => {
    try {
      await fetchWithAuth(`/api/teams/${teamId}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus
        })
      });
      
      setProjects(prev => prev.map(project => {
        if (project.id === selectedProject) {
          return {
            ...project,
            tasks: project.tasks.map(task => {
              if (task.id === taskId) {
                return {
                  ...task,
                  status: newStatus
                };
              }
              return task;
            })
          };
        }
        return project;
      }));
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const currentProject = projects.find(p => p.id === selectedProject);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-card border-b p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Working Space</h1>
        <button
          onClick={() => setIsAddingProject(true)}
          className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md"
        >
          <PlusIcon className="" />
          <span>New Project</span>
        </button>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Projects Sidebar */}
        <div className="w-64 bg-muted border-r overflow-y-auto p-4">
          <h2 className="text-lg font-medium mb-4">Projects</h2>
          <ul className="space-y-2">
            {projects.map(project => (
              <li key={project.id}>
                <button
                  onClick={() => setSelectedProject(project.id)}
                  className={`w-full text-left px-3 py-2 rounded-md ${
                    selectedProject === project.id
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="font-medium">{project.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Due: {formatDateTime(project.dueDate).dateDay}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Project Details */}
        <div className="flex-1 overflow-y-auto">
          {currentProject ? (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold">{currentProject.name}</h2>
                <div className="flex items-center space-x-4 mt-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    currentProject.status === 'planning' ? 'bg-info/15 text-info' :
                    currentProject.status === 'in-progress' ? 'bg-warning/15 text-warning' :
                    currentProject.status === 'review' ? 'bg-accent text-accent-foreground' :
                    'bg-success/15 text-success'
                  }`}>
                    {currentProject.status.replace('-', ' ')}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Due: {formatDateTime(currentProject.dueDate).dateTime}
                  </span>
                </div>
                <p className="mt-4 text-muted-foreground">{currentProject.description}</p>
              </div>
              
              {/* Tasks */}
              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Tasks</h3>
                  <button
                    onClick={() => setIsAddingTask(true)}
                    className="flex items-center space-x-1 text-sm bg-muted hover:bg-muted px-3 py-1 rounded-md"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>Add Task</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* To Do */}
                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="font-medium text-foreground mb-3">To Do</h4>
                    <div className="space-y-3">
                      {currentProject.tasks
                        .filter(task => task.status === 'todo')
                        .map(task => (
                          <div key={task.id} className="bg-card p-3 rounded-md shadow-sm">
                            <div className="font-medium">{task.title}</div>
                            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                            <div className="flex justify-between items-center mt-3">
                              <span className="text-xs text-muted-foreground">
                                Due: {formatDateTime(task.dueDate).dateDay}
                              </span>
                              <button
                                onClick={() => updateTaskStatus(task.id, 'in-progress')}
                                className="text-xs bg-info/15 text-info px-2 py-1 rounded hover:bg-info/15"
                              >
                                Start
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  {/* In Progress */}
                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="font-medium text-foreground mb-3">In Progress</h4>
                    <div className="space-y-3">
                      {currentProject.tasks
                        .filter(task => task.status === 'in-progress')
                        .map(task => (
                          <div key={task.id} className="bg-card p-3 rounded-md shadow-sm">
                            <div className="font-medium">{task.title}</div>
                            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                            <div className="flex justify-between items-center mt-3">
                              <span className="text-xs text-muted-foreground">
                                Due: {formatDateTime(task.dueDate).dateDay}
                              </span>
                              <button
                                onClick={() => updateTaskStatus(task.id, 'done')}
                                className="text-xs bg-success/15 text-success px-2 py-1 rounded hover:bg-success/15"
                              >
                                Complete
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  {/* Done */}
                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="font-medium text-foreground mb-3">Done</h4>
                    <div className="space-y-3">
                      {currentProject.tasks
                        .filter(task => task.status === 'done')
                        .map(task => (
                          <div key={task.id} className="bg-card p-3 rounded-md shadow-sm">
                            <div className="font-medium">{task.title}</div>
                            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                            <div className="flex justify-between items-center mt-3">
                              <span className="text-xs text-muted-foreground">
                                Completed
                              </span>
                              <button
                                onClick={() => updateTaskStatus(task.id, 'todo')}
                                className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded hover:bg-muted"
                              >
                                Reopen
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p>Select a project or create a new one</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Add Project Modal */}
      {isAddingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create New Project</h2>
            <form onSubmit={handleAddProject}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground">Project Name</label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground">Description</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground">Status</label>
                  <select
                    value={newProject.status}
                    onChange={(e) => setNewProject({ ...newProject, status: e.target.value as any })}
                    className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring"
                  >
                    <option value="planning">Planning</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground">Due Date</label>
                  <input
                    type="date"
                    value={newProject.dueDate.toISOString().split('T')[0]}
                    onChange={(e) => setNewProject({ ...newProject, dueDate: new Date(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddingProject(false)}
                  className="px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-card hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Add Task Modal */}
      {isAddingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add New Task</h2>
            <form onSubmit={handleAddTask}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground">Task Title</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground">Assigned To</label>
                  <select
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring"
                  >
                    <option value="">Select team member</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.userId}>
                        {member.firstName} {member.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground">Due Date</label>
                  <input
                    type="date"
                    value={newTask.dueDate.toISOString().split('T')[0]}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: new Date(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  className="px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-card hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-mdshadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Add Task Modal */}
        {isAddingTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Add New Task</h2>
              <form onSubmit={handleAddTask}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground">Task Title</label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground">Description</label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground">Assigned To</label>
                    <select
                      value={newTask.assignedTo}
                      onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                      className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring"
                    >
                      <option value="">Select team member</option>
                      {teamMembers.map(member => (
                        <option key={member.id} value={member.userId}>
                          {member.firstName} {member.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground">Due Date</label>
                    <input
                      type="date"
                      value={newTask.dueDate.toISOString().split('T')[0]}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: new Date(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring"
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    className="px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-card hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90"
                  >
                    Add Task
                  </button>
                </div>
                </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkingSpace;