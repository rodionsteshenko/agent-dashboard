import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTile, updateTile, deleteTile } from '$lib/db';

export const GET: RequestHandler = async ({ params }) => {
  const tile = getTile(params.id);
  if (!tile) {
    return json({ error: 'Tile not found' }, { status: 404 });
  }
  return json(tile);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  const body = await request.json();
  const tile = updateTile(params.id, body);
  
  if (!tile) {
    return json({ error: 'Tile not found' }, { status: 404 });
  }
  
  return json(tile);
};

export const DELETE: RequestHandler = async ({ params }) => {
  const deleted = deleteTile(params.id);
  if (!deleted) {
    return json({ error: 'Tile not found' }, { status: 404 });
  }
  return json({ success: true });
};
