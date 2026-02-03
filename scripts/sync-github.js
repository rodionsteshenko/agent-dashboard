#!/usr/bin/env node
/**
 * Sync GitHub Project items → Dashboard todos
 * GitHub is source of truth
 * 
 * Usage: node sync-github.js [--project NUMBER] [--owner OWNER]
 */

const { execSync } = require('child_process');
const Database = require('better-sqlite3');
const { join } = require('path');
const { homedir } = require('os');

const PROJECT_NUMBER = process.argv.includes('--project') 
  ? process.argv[process.argv.indexOf('--project') + 1] 
  : '1';
const OWNER = process.argv.includes('--owner')
  ? process.argv[process.argv.indexOf('--owner') + 1]
  : 'rodionsteshenko';

const dbPath = join(homedir(), 'agent-dashboard', 'data', 'tiles.db');
const db = new Database(dbPath);

// Ensure github_id column exists
try { 
  db.exec(`ALTER TABLE todos ADD COLUMN github_id TEXT`); 
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_todos_github_id ON todos(github_id)`);
} catch {}

function getGitHubItems() {
  try {
    const result = execSync(
      `gh project item-list ${PROJECT_NUMBER} --owner ${OWNER} --format json`,
      { encoding: 'utf-8', env: { ...process.env, GH_TOKEN: process.env.GH_TOKEN } }
    );
    const data = JSON.parse(result);
    return data.items || [];
  } catch (err) {
    console.error('Failed to fetch GitHub items:', err.message);
    return [];
  }
}

function getGitHubItemDetails(itemId) {
  // Get field values for an item (status, assignee, etc.)
  try {
    const result = execSync(
      `gh project item-list ${PROJECT_NUMBER} --owner ${OWNER} --format json`,
      { encoding: 'utf-8' }
    );
    const data = JSON.parse(result);
    const item = (data.items || []).find(i => i.id === itemId);
    return item || null;
  } catch {
    return null;
  }
}

function syncToDb(items) {
  const upsert = db.prepare(`
    INSERT INTO todos (id, title, github_id, assignee, completed, created_by)
    VALUES (@id, @title, @github_id, @assignee, @completed, 'github-sync')
    ON CONFLICT(github_id) DO UPDATE SET
      title = @title,
      completed = @completed
  `);

  const existingGithubIds = db.prepare(
    `SELECT github_id FROM todos WHERE github_id IS NOT NULL`
  ).all().map(r => r.github_id);

  let created = 0, updated = 0, archived = 0;

  const githubIds = items.map(i => i.id);

  // Upsert items from GitHub
  for (const item of items) {
    const isNew = !existingGithubIds.includes(item.id);
    
    // Check if item has "Done" status (you may need to adjust based on your project fields)
    const isDone = item.status?.toLowerCase() === 'done';
    
    upsert.run({
      id: isNew ? crypto.randomUUID() : db.prepare(`SELECT id FROM todos WHERE github_id = ?`).get(item.id)?.id,
      title: item.title,
      github_id: item.id,
      assignee: item.assignees?.[0]?.login || 'coby',
      completed: isDone ? 1 : 0
    });

    if (isNew) created++;
    else updated++;
  }

  // Mark items not in GitHub as archived (soft delete)
  const toArchive = existingGithubIds.filter(id => !githubIds.includes(id));
  if (toArchive.length > 0) {
    const archiveStmt = db.prepare(`UPDATE todos SET completed = 1, completed_at = datetime('now') WHERE github_id = ?`);
    for (const id of toArchive) {
      archiveStmt.run(id);
      archived++;
    }
  }

  return { created, updated, archived };
}

function main() {
  console.log(`Syncing GitHub Project #${PROJECT_NUMBER} (owner: ${OWNER})...`);
  
  const items = getGitHubItems();
  console.log(`Found ${items.length} items in GitHub`);

  if (items.length === 0) {
    console.log('No items to sync');
    return;
  }

  const stats = syncToDb(items);
  console.log(`Sync complete: ${stats.created} created, ${stats.updated} updated, ${stats.archived} archived`);
}

main();
