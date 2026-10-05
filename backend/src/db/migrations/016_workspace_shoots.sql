-- workspace_id on projects/shoots (Sprint 1)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS workspace_id TEXT REFERENCES agency_workspaces(id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id);
