import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllTiles, createTile, getTilesByType, searchTiles, type FilterMode } from '$lib/db';

export const GET: RequestHandler = async ({ url }) => {
  const type = url.searchParams.get('type');
  const mode = (url.searchParams.get('mode') || 'new') as FilterMode;
  const includeArchived = url.searchParams.get('archived') === 'true';
  const query = url.searchParams.get('q');
  
  // If search query provided, use search
  if (query) {
    const tiles = searchTiles(query);
    return json(tiles);
  }
  
  const tiles = type ? getTilesByType(type, mode) : getAllTiles(includeArchived);
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
