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

// Todo types
export interface Todo {
  id: string;
  title: string;
  assignee: string;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
  created_by: string;
}

interface TodoRow {
  id: string;
  title: string;
  assignee: string;
  completed: number;
  created_at: string;
  completed_at: string | null;
  created_by: string;
}

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    assignee: row.assignee,
    completed: row.completed === 1,
    created_at: row.created_at,
    completed_at: row.completed_at,
    created_by: row.created_by
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

export function createTodo(title: string, assignee = 'coby', createdBy = 'coby'): Todo {
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO todos (id, title, assignee, created_by)
    VALUES (?, ?, ?, ?)
  `).run(id, title, assignee, createdBy);
  return getTodo(id)!;
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

export default db;
