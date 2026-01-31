import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllTiles, createTile, getTilesByType } from '$lib/db';

export const GET: RequestHandler = async ({ url }) => {
  const type = url.searchParams.get('type');
  const includeArchived = url.searchParams.get('archived') === 'true';
  
  const tiles = type ? getTilesByType(type) : getAllTiles(includeArchived);
  return json(tiles);
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  
  if (!body.type || !body.content) {
    return json({ error: 'type and content are required' }, { status: 400 });
  }
  
  const tile = createTile({
    id: body.id || crypto.randomUUID(),
    type: body.type,
    content: body.content,
    source: body.source,
    tags: body.tags || []
  });
  
  return json(tile, { status: 201 });
};
