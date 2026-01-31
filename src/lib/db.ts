import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';

const dbPath = join(homedir(), 'agent-dashboard', 'data', 'tiles.db');

// Ensure data directory exists
import { mkdirSync } from 'fs';
mkdirSync(join(homedir(), 'agent-dashboard', 'data'), { recursive: true });

const db = new Database(dbPath);

// Initialize schema (base table only)
db.exec(`
  CREATE TABLE IF NOT EXISTS tiles (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT,
    tags TEXT DEFAULT '[]',
    read INTEGER DEFAULT 0,
    starred INTEGER DEFAULT 0,
    archived INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_tiles_type ON tiles(type);
  CREATE INDEX IF NOT EXISTS idx_tiles_created ON tiles(created_at);
  CREATE INDEX IF NOT EXISTS idx_tiles_archived ON tiles(archived);
`);

// Migrations - add columns if they don't exist
try { db.exec(`ALTER TABLE tiles ADD COLUMN pinned INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE tiles ADD COLUMN saved_for_later INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE tiles ADD COLUMN reactions TEXT DEFAULT '[]'`); } catch {}

// Index for new columns (after migrations)
try { db.exec(`CREATE INDEX IF NOT EXISTS idx_tiles_pinned ON tiles(pinned)`); } catch {}

// Todos table (separate from tiles)
db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    assignee TEXT DEFAULT 'coby',
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    created_by TEXT DEFAULT 'coby'
  );
  CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
  CREATE INDEX IF NOT EXISTS idx_todos_assignee ON todos(assignee);
`);

// Todo migrations
try { db.exec(`ALTER TABLE todos ADD COLUMN due_date TEXT`); } catch {}
try { db.exec(`CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date)`); } catch {}
try { db.exec(`ALTER TABLE todos ADD COLUMN project_item_id TEXT`); } catch {}
try { db.exec(`CREATE INDEX IF NOT EXISTS idx_todos_project_item ON todos(project_item_id)`); } catch {}

// Projects tables
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS project_items (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    acceptance_criteria TEXT DEFAULT '[]',
    status TEXT DEFAULT 'backlog',
    priority INTEGER DEFAULT 3,
    assignee TEXT DEFAULT 'coby',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    started_at TEXT,
    completed_at TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_project_items_project ON project_items(project_id);
  CREATE INDEX IF NOT EXISTS idx_project_items_status ON project_items(status);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS project_docs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_project_docs_project ON project_docs(project_id);
  CREATE INDEX IF NOT EXISTS idx_project_docs_type ON project_docs(doc_type);
`);

// Project types
export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ProjectItem {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  acceptance_criteria: string[];
  status: 'backlog' | 'in-progress' | 'complete';
  priority: number;
  assignee: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface ProjectDoc {
  id: string;
  project_id: string;
  doc_type: 'features' | 'technical' | 'progress' | 'notes';
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ProjectItemRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  acceptance_criteria: string;
  status: string;
  priority: number;
  assignee: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface ProjectDocRow {
  id: string;
  project_id: string;
  doc_type: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status as 'active' | 'archived',
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function rowToProjectItem(row: ProjectItemRow): ProjectItem {
  return {
    id: row.id,
    project_id: row.project_id,
    title: row.title,
    description: row.description,
    acceptance_criteria: JSON.parse(row.acceptance_criteria || '[]'),
    status: row.status as 'backlog' | 'in-progress' | 'complete',
    priority: row.priority,
    assignee: row.assignee,
    created_at: row.created_at,
    updated_at: row.updated_at,
    started_at: row.started_at,
    completed_at: row.completed_at
  };
}

function rowToProjectDoc(row: ProjectDocRow): ProjectDoc {
  return {
    id: row.id,
    project_id: row.project_id,
    doc_type: row.doc_type as ProjectDoc['doc_type'],
    title: row.title,
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

// Project CRUD
export function getAllProjects(includeArchived = false): Project[] {
  const query = includeArchived
    ? 'SELECT * FROM projects ORDER BY created_at DESC'
    : "SELECT * FROM projects WHERE status = 'active' ORDER BY created_at DESC";
  const rows = db.prepare(query).all() as ProjectRow[];
  return rows.map(rowToProject);
}

export function getProject(id: string): Project | null {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined;
  return row ? rowToProject(row) : null;
}

export function createProject(name: string, description?: string): Project {
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO projects (id, name, description)
    VALUES (?, ?, ?)
  `).run(id, name, description || null);
  
  // Create default docs
  const docsToCreate = [
    { type: 'features', title: 'Features Design' },
    { type: 'technical', title: 'Technical Design' },
    { type: 'progress', title: 'Progress Notes' }
  ];
  for (const doc of docsToCreate) {
    db.prepare(`
      INSERT INTO project_docs (id, project_id, doc_type, title, content)
      VALUES (?, ?, ?, ?, '')
    `).run(crypto.randomUUID(), id, doc.type, doc.title);
  }
  
  return getProject(id)!;
}

export function updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'description' | 'status'>>): Project | null {
  const sets: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) { sets.push('name = ?'); values.push(updates.name); }
  if (updates.description !== undefined) { sets.push('description = ?'); values.push(updates.description); }
  if (updates.status !== undefined) { sets.push('status = ?'); values.push(updates.status); }

  if (sets.length === 0) return getProject(id);
  
  sets.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return getProject(id);
}

export function deleteProject(id: string): boolean {
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return result.changes > 0;
}

// Project Items CRUD
export function getProjectItems(projectId: string, status?: string): ProjectItem[] {
  let query = 'SELECT * FROM project_items WHERE project_id = ?';
  const params: unknown[] = [projectId];
  
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY priority ASC, created_at ASC';
  const rows = db.prepare(query).all(...params) as ProjectItemRow[];
  return rows.map(rowToProjectItem);
}

export function getProjectItem(id: string): ProjectItem | null {
  const row = db.prepare('SELECT * FROM project_items WHERE id = ?').get(id) as ProjectItemRow | undefined;
  return row ? rowToProjectItem(row) : null;
}

export function createProjectItem(
  projectId: string, 
  title: string, 
  description?: string,
  acceptanceCriteria?: string[],
  priority?: number,
  assignee?: string
): ProjectItem {
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO project_items (id, project_id, title, description, acceptance_criteria, priority, assignee)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, 
    projectId, 
    title, 
    description || null,
    JSON.stringify(acceptanceCriteria || []),
    priority || 3,
    assignee || 'coby'
  );
  return getProjectItem(id)!;
}

export function updateProjectItem(id: string, updates: Partial<Pick<ProjectItem, 'title' | 'description' | 'acceptance_criteria' | 'status' | 'priority' | 'assignee'>>): ProjectItem | null {
  const sets: string[] = [];
  const values: unknown[] = [];

  if (updates.title !== undefined) { sets.push('title = ?'); values.push(updates.title); }
  if (updates.description !== undefined) { sets.push('description = ?'); values.push(updates.description); }
  if (updates.acceptance_criteria !== undefined) { sets.push('acceptance_criteria = ?'); values.push(JSON.stringify(updates.acceptance_criteria)); }
  if (updates.priority !== undefined) { sets.push('priority = ?'); values.push(updates.priority); }
  if (updates.assignee !== undefined) { sets.push('assignee = ?'); values.push(updates.assignee); }
  
  if (updates.status !== undefined) {
    sets.push('status = ?');
    values.push(updates.status);
    
    // Track status transitions
    const current = getProjectItem(id);
    if (current) {
      if (updates.status === 'in-progress' && current.status === 'backlog') {
        sets.push("started_at = datetime('now')");
      } else if (updates.status === 'complete' && current.status !== 'complete') {
        sets.push("completed_at = datetime('now')");
      }
    }
  }

  if (sets.length === 0) return getProjectItem(id);
  
  sets.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE project_items SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return getProjectItem(id);
}

export function deleteProjectItem(id: string): boolean {
  const result = db.prepare('DELETE FROM project_items WHERE id = ?').run(id);
  return result.changes > 0;
}

// Project Docs CRUD
export function getProjectDocs(projectId: string): ProjectDoc[] {
  const rows = db.prepare('SELECT * FROM project_docs WHERE project_id = ? ORDER BY doc_type').all(projectId) as ProjectDocRow[];
  return rows.map(rowToProjectDoc);
}

export function getProjectDoc(id: string): ProjectDoc | null {
  const row = db.prepare('SELECT * FROM project_docs WHERE id = ?').get(id) as ProjectDocRow | undefined;
  return row ? rowToProjectDoc(row) : null;
}

export function getProjectDocByType(projectId: string, docType: string): ProjectDoc | null {
  const row = db.prepare('SELECT * FROM project_docs WHERE project_id = ? AND doc_type = ?').get(projectId, docType) as ProjectDocRow | undefined;
  return row ? rowToProjectDoc(row) : null;
}

export function updateProjectDoc(id: string, updates: Partial<Pick<ProjectDoc, 'title' | 'content'>>): ProjectDoc | null {
  const sets: string[] = [];
  const values: unknown[] = [];

  if (updates.title !== undefined) { sets.push('title = ?'); values.push(updates.title); }
  if (updates.content !== undefined) { sets.push('content = ?'); values.push(updates.content); }

  if (sets.length === 0) return getProjectDoc(id);
  
  sets.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE project_docs SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return getProjectDoc(id);
}

export function appendToProjectDoc(id: string, text: string): ProjectDoc | null {
  const doc = getProjectDoc(id);
  if (!doc) return null;
  
  const newContent = doc.content ? doc.content + '\n\n' + text : text;
  return updateProjectDoc(id, { content: newContent });
}

// Todo types
export interface Todo {
  id: string;
  title: string;
  assignee: string;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
  created_by: string;
  due_date: string | null;
  project_item_id: string | null;
}

interface TodoRow {
  id: string;
  title: string;
  assignee: string;
  completed: number;
  created_at: string;
  completed_at: string | null;
  created_by: string;
  due_date: string | null;
  project_item_id: string | null;
}

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    assignee: row.assignee,
    completed: row.completed === 1,
    created_at: row.created_at,
    completed_at: row.completed_at,
    created_by: row.created_by,
    due_date: row.due_date,
    project_item_id: row.project_item_id
  };
}

export function getAllTodos(includeCompleted = false): Todo[] {
  const query = includeCompleted
    ? 'SELECT * FROM todos ORDER BY completed ASC, created_at DESC'
    : 'SELECT * FROM todos WHERE completed = 0 ORDER BY created_at DESC';
  const rows = db.prepare(query).all() as TodoRow[];
  return rows.map(rowToTodo);
}

export function getTodosByAssignee(assignee: string, includeCompleted = false): Todo[] {
  const query = includeCompleted
    ? 'SELECT * FROM todos WHERE assignee = ? ORDER BY completed ASC, created_at DESC'
    : 'SELECT * FROM todos WHERE assignee = ? AND completed = 0 ORDER BY created_at DESC';
  const rows = db.prepare(query).all(assignee) as TodoRow[];
  return rows.map(rowToTodo);
}

export function getTodo(id: string): Todo | null {
  const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as TodoRow | undefined;
  return row ? rowToTodo(row) : null;
}

export function createTodo(title: string, assignee = 'coby', createdBy = 'coby', dueDate: string | null = null, projectItemId: string | null = null): Todo {
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO todos (id, title, assignee, created_by, due_date, project_item_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, title, assignee, createdBy, dueDate, projectItemId);
  return getTodo(id)!;
}

export function getTodosByProjectItem(projectItemId: string, includeCompleted = false): Todo[] {
  const query = includeCompleted
    ? 'SELECT * FROM todos WHERE project_item_id = ? ORDER BY completed ASC, created_at DESC'
    : 'SELECT * FROM todos WHERE project_item_id = ? AND completed = 0 ORDER BY created_at DESC';
  const rows = db.prepare(query).all(projectItemId) as TodoRow[];
  return rows.map(rowToTodo);
}

export function updateTodo(id: string, updates: Partial<Pick<Todo, 'title' | 'assignee' | 'due_date' | 'project_item_id'>>): Todo | null {
  const sets: string[] = [];
  const values: unknown[] = [];

  if (updates.title !== undefined) {
    sets.push('title = ?');
    values.push(updates.title);
  }
  if (updates.assignee !== undefined) {
    sets.push('assignee = ?');
    values.push(updates.assignee);
  }
  if (updates.due_date !== undefined) {
    sets.push('due_date = ?');
    values.push(updates.due_date);
  }
  if (updates.project_item_id !== undefined) {
    sets.push('project_item_id = ?');
    values.push(updates.project_item_id);
  }

  if (sets.length === 0) return getTodo(id);
  values.push(id);

  db.prepare(`UPDATE todos SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return getTodo(id);
}

export function getTodosDueSoon(withinDays = 2): Todo[] {
  const rows = db.prepare(`
    SELECT * FROM todos 
    WHERE completed = 0 
    AND due_date IS NOT NULL 
    AND date(due_date) <= date('now', '+' || ? || ' days')
    ORDER BY due_date ASC
  `).all(withinDays) as TodoRow[];
  return rows.map(rowToTodo);
}

export function searchTodos(query: string): Todo[] {
  const searchPattern = `%${query.toLowerCase()}%`;
  const rows = db.prepare(`
    SELECT * FROM todos 
    WHERE completed = 0 
    AND LOWER(title) LIKE ?
    ORDER BY created_at DESC
  `).all(searchPattern) as TodoRow[];
  return rows.map(rowToTodo);
}

export function completeTodo(id: string): Todo | null {
  db.prepare(`
    UPDATE todos SET completed = 1, completed_at = datetime('now') WHERE id = ?
  `).run(id);
  return getTodo(id);
}

export function uncompleteTodo(id: string): Todo | null {
  db.prepare(`
    UPDATE todos SET completed = 0, completed_at = NULL WHERE id = ?
  `).run(id);
  return getTodo(id);
}

export function deleteTodo(id: string): boolean {
  const result = db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  return result.changes > 0;
}

export interface Tile {
  id: string;
  type: string;
  content: Record<string, unknown>;
  source?: string;
  tags: string[];
  read: boolean;
  starred: boolean;
  archived: boolean;
  pinned: boolean;
  savedForLater: boolean;
  reactions: string[];
  created_at: string;
  updated_at: string;
}

interface TileRow {
  id: string;
  type: string;
  content: string;
  source: string | null;
  tags: string;
  read: number;
  starred: number;
  archived: number;
  pinned: number;
  saved_for_later: number;
  reactions: string;
  created_at: string;
  updated_at: string;
}

function rowToTile(row: TileRow): Tile {
  return {
    id: row.id,
    type: row.type,
    content: JSON.parse(row.content),
    source: row.source ?? undefined,
    tags: JSON.parse(row.tags),
    read: row.read === 1,
    starred: row.starred === 1,
    archived: row.archived === 1,
    pinned: row.pinned === 1,
    savedForLater: row.saved_for_later === 1,
    reactions: JSON.parse(row.reactions || '[]'),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export function getAllTiles(includeArchived = false): Tile[] {
  const query = includeArchived
    ? 'SELECT * FROM tiles ORDER BY pinned DESC, created_at DESC'
    : 'SELECT * FROM tiles WHERE archived = 0 AND saved_for_later = 0 ORDER BY pinned DESC, created_at DESC';
  const rows = db.prepare(query).all() as TileRow[];
  return rows.map(rowToTile);
}

export function getSavedForLaterTiles(): Tile[] {
  const rows = db.prepare(
    'SELECT * FROM tiles WHERE saved_for_later = 1 AND archived = 0 ORDER BY created_at DESC'
  ).all() as TileRow[];
  return rows.map(rowToTile);
}

export type FilterMode = 'new' | 'saved' | 'all';

export function getTilesByType(type: string, mode: FilterMode = 'new'): Tile[] {
  let query: string;
  
  switch (mode) {
    case 'saved':
      // Only saved for later items
      query = 'SELECT * FROM tiles WHERE type = ? AND saved_for_later = 1 AND archived = 0 ORDER BY created_at DESC';
      break;
    case 'all':
      // Everything including archived
      query = 'SELECT * FROM tiles WHERE type = ? ORDER BY created_at DESC';
      break;
    case 'new':
    default:
      // New items only (not archived, not saved)
      query = 'SELECT * FROM tiles WHERE type = ? AND archived = 0 AND saved_for_later = 0 ORDER BY created_at DESC';
      break;
  }
  
  const rows = db.prepare(query).all(type) as TileRow[];
  return rows.map(rowToTile);
}

export function getTile(id: string): Tile | null {
  const row = db.prepare('SELECT * FROM tiles WHERE id = ?').get(id) as TileRow | undefined;
  return row ? rowToTile(row) : null;
}

export function createTile(tile: Omit<Tile, 'created_at' | 'updated_at' | 'read' | 'starred' | 'archived'>): Tile {
  const id = tile.id || crypto.randomUUID();
  db.prepare(`
    INSERT INTO tiles (id, type, content, source, tags)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    id,
    tile.type,
    JSON.stringify(tile.content),
    tile.source ?? null,
    JSON.stringify(tile.tags || [])
  );
  return getTile(id)!;
}

export function updateTile(id: string, updates: Partial<Pick<Tile, 'content' | 'tags' | 'read' | 'starred' | 'archived' | 'pinned' | 'savedForLater' | 'reactions'>>): Tile | null {
  const sets: string[] = [];
  const values: unknown[] = [];

  if (updates.content !== undefined) {
    sets.push('content = ?');
    values.push(JSON.stringify(updates.content));
  }
  if (updates.tags !== undefined) {
    sets.push('tags = ?');
    values.push(JSON.stringify(updates.tags));
  }
  if (updates.read !== undefined) {
    sets.push('read = ?');
    values.push(updates.read ? 1 : 0);
  }
  if (updates.starred !== undefined) {
    sets.push('starred = ?');
    values.push(updates.starred ? 1 : 0);
  }
  if (updates.archived !== undefined) {
    sets.push('archived = ?');
    values.push(updates.archived ? 1 : 0);
  }
  if (updates.pinned !== undefined) {
    sets.push('pinned = ?');
    values.push(updates.pinned ? 1 : 0);
  }
  if (updates.savedForLater !== undefined) {
    sets.push('saved_for_later = ?');
    values.push(updates.savedForLater ? 1 : 0);
  }
  if (updates.reactions !== undefined) {
    sets.push('reactions = ?');
    values.push(JSON.stringify(updates.reactions));
  }

  if (sets.length === 0) return getTile(id);

  sets.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE tiles SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return getTile(id);
}

export function deleteTile(id: string): boolean {
  const result = db.prepare('DELETE FROM tiles WHERE id = ?').run(id);
  return result.changes > 0;
}

export function searchTiles(query: string): Tile[] {
  const searchPattern = `%${query}%`;
  const rows = db.prepare(`
    SELECT * FROM tiles 
    WHERE archived = 0 
    AND (
      content LIKE ? 
      OR tags LIKE ? 
      OR type LIKE ?
    )
    ORDER BY created_at DESC
    LIMIT 50
  `).all(searchPattern, searchPattern, searchPattern) as TileRow[];
  return rows.map(rowToTile);
}

export default db;
