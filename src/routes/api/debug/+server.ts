import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { appendFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const debugLogPath = join(homedir(), 'agent-dashboard', 'data', 'chat-debug.log');

export const POST: RequestHandler = async ({ request }) => {
  const { msg } = await request.json();
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${msg}\n`;
  
  try {
    appendFileSync(debugLogPath, logLine);
    console.log(`[CHAT DEBUG] ${msg}`);
  } catch (err) {
    console.error('Failed to write debug log:', err);
  }
  
  return json({ ok: true });
};

export const GET: RequestHandler = async () => {
  const { readFileSync, existsSync } = await import('fs');
  
  if (!existsSync(debugLogPath)) {
    return json({ logs: [] });
  }
  
  const content = readFileSync(debugLogPath, 'utf-8');
  const logs = content.split('\n').filter(Boolean).slice(-50);
  
  return json({ logs });
};

export const DELETE: RequestHandler = async () => {
  const { writeFileSync } = await import('fs');
  writeFileSync(debugLogPath, '');
  return json({ ok: true });
};
