CREATE TABLE project_members (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}',
  UNIQUE (project_id, user_id)
);
INSERT INTO project_members (id, project_id, user_id, role, created_at, updated_at, data)
SELECT DISTINCT ON (data->>'projectId', data->>'userId') id, data->>'projectId', data->>'userId',
  COALESCE(NULLIF(data->>'role', ''), 'member'), created_at, updated_at, data
FROM app_entities WHERE kind = 'project_members'
  AND data->>'projectId' IN (SELECT id FROM projects)
  AND data->>'userId' IN (SELECT id FROM users)
ORDER BY data->>'projectId', data->>'userId', updated_at DESC, id;
INSERT INTO project_members (id, project_id, user_id, role, data)
SELECT 'owner:' || id, id, owner_id, 'owner', '{"membershipSource":"project"}'::jsonb
FROM projects WHERE owner_id IS NOT NULL
ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'owner';
INSERT INTO project_members (id, project_id, user_id, data)
SELECT 'member:' || p.id || ':' || member.uid, p.id, member.uid, '{"membershipSource":"project"}'::jsonb
FROM projects p CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE WHEN jsonb_typeof(p.data->'collaborators') = 'array' THEN p.data->'collaborators' ELSE '[]'::jsonb END
) member(uid) JOIN users u ON u.id = member.uid ON CONFLICT (project_id, user_id) DO NOTHING;
CREATE INDEX project_members_data_gin ON project_members USING GIN (data);
CREATE INDEX project_members_user ON project_members (user_id);
