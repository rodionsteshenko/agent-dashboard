import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createTile } from '$lib/db';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  
  if (!body.text) {
    return json({ error: 'text is required' }, { status: 400 });
  }
  
  // Save screenshot if provided
  let screenshotPath: string | null = null;
  if (body.screenshot) {
    const screenshotDir = join(homedir(), 'agent-dashboard', 'data', 'screenshots');
    mkdirSync(screenshotDir, { recursive: true });
    
    const filename = `feedback-${Date.now()}.png`;
    screenshotPath = join(screenshotDir, filename);
    
    // Remove data URL prefix and save
    const base64Data = body.screenshot.replace(/^data:image\/png;base64,/, '');
    writeFileSync(screenshotPath, base64Data, 'base64');
  }
  
  // Create a feedback tile (type: feedback)
  const tile = createTile({
    id: crypto.randomUUID(),
    type: 'feedback',
    content: {
      text: body.text,
      screenshot: screenshotPath,
      url: body.url || null,
      userAgent: body.userAgent || null
    },
    source: 'dashboard',
    tags: ['feedback']
  });
  
  return json({ success: true, id: tile.id }, { status: 201 });
};
