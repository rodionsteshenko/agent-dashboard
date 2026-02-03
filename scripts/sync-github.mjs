#!/usr/bin/env node
/**
 * Sync GitHub Project items ↔ Dashboard todos
 * GitHub is source of truth
 * 
 * Usage: node sync-github.mjs [--project NUMBER] [--owner OWNER] [--push]
 */

import { execSync } from 'child_process';
import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : null;
};

const PROJECT_NUMBER = getArg('--project') || '1';
const OWNER = getArg('--owner') || 'rodionsteshenko';
const PUSH_MODE = args.includes('--push');

const dbPath = join(homedir(), 'agent-dashboard', 'data', 'tiles.db');
const db = new Database(dbPath);

// Ensure github_id column exists
try { 
  db.exec(`ALTER TABLE todos ADD COLUMN github_id TEXT`); 
} catch {}
try {
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_todos_github_id ON todos(github_id)`);
} catch {}

function gh(cmd) {
  return execSync(`gh ${cmd}`, { 
    encoding: 'utf-8', 
    env: { ...process.env }
  }).trim();
}

function getGitHubItems() {
  try {
    const result = gh(`project item-list ${PROJECT_NUMBER} --owner ${OWNER} --format json`);
    const data = JSON.parse(result);
    return data.items || [];
  } catch (err) {
    console.error('Failed to fetch GitHub items:', err.message);
    return [];
  }
}

function pullFromGitHub(items) {
  const getByGithubId = db.prepare(`SELECT id FROM todos WHERE github_id = ?`);
  const insert = db.prepare(`
    INSERT INTO todos (id, title, github_id, assignee, completed, created_by)
    VALUES (?, ?, ?, ?, ?, 'github-sync')
  `);
  const update = db.prepare(`
    UPDATE todos SET title = ?, completed = ? WHERE github_id = ?
  `);

  const existingGithubIds = db.prepare(
    `SELECT github_id FROM todos WHERE github_id IS NOT NULL`
  ).all().map(r => r.github_id);

  let created = 0, updated = 0;
  const githubIds = items.map(i => i.id);

  for (const item of items) {
    const exists = existingGithubIds.includes(item.id);
    const isDone = (item.status || '').toLowerCase() === 'done';
    
    if (exists) {
      update.run(item.title, isDone ? 1 : 0, item.id);
      updated++;
    } else {
      insert.run(randomUUID(), item.title, item.id, 'coby', isDone ? 1 : 0);
      created++;
    }
  }

  // Items removed from GitHub - mark completed locally
  const removed = existingGithubIds.filter(id => !githubIds.includes(id));
  if (removed.length > 0) {
    const markDone = db.prepare(`UPDATE todos SET completed = 1, completed_at = datetime('now') WHERE github_id = ?`);
    removed.forEach(id => markDone.run(id));
  }

  return { created, updated, removed: removed.length };
}

function pushToGitHub() {
  // Get local todos without github_id (created locally)
  const localOnly = db.prepare(`
    SELECT id, title FROM todos 
    WHERE github_id IS NULL AND completed = 0
  `).all();

  let pushed = 0;
  const updateGithubId = db.prepare(`UPDATE todos SET github_id = ? WHERE id = ?`);

  for (const todo of localOnly) {
    try {
      const result = gh(`project item-create ${PROJECT_NUMBER} --owner ${OWNER} --title "${todo.title.replace(/"/g, '\\"')}" --format json`);
      const data = JSON.parse(result);
      if (data.id) {
        updateGithubId.run(data.id, todo.id);
        pushed++;
        console.log(`  Pushed: ${todo.title}`);
      }
    } catch (err) {
      console.error(`  Failed to push "${todo.title}": ${err.message}`);
    }
  }

  return { pushed };
}

function main() {
  console.log(`GitHub Project #${PROJECT_NUMBER} (owner: ${OWNER})`);
  console.log('---');

  // Always pull first
  console.log('Pulling from GitHub...');
  const items = getGitHubItems();
  console.log(`  Found ${items.length} items`);
  
  const pullStats = pullFromGitHub(items);
  console.log(`  Created: ${pullStats.created}, Updated: ${pullStats.updated}, Removed: ${pullStats.removed}`);

  // Push local items to GitHub if requested
  if (PUSH_MODE) {
    console.log('Pushing local items to GitHub...');
    const pushStats = pushToGitHub();
    console.log(`  Pushed: ${pushStats.pushed} items`);
  }

  console.log('---');
  console.log('Sync complete!');
}

main();
