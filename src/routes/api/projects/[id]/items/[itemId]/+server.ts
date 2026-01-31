import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProjectItem, updateProjectItem, deleteProjectItem } from '$lib/db';

export const GET: RequestHandler = async ({ params }) => {
  const item = getProjectItem(params.itemId);
  if (!item) {
    return json({ error: 'Item not found' }, { status: 404 });
  }
  return json(item);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  const body = await request.json();
  
  // Normalize acceptance_criteria field name
  if (body.acceptanceCriteria && !body.acceptance_criteria) {
    body.acceptance_criteria = body.acceptanceCriteria;
  }
  
  const item = updateProjectItem(params.itemId, body);
  if (!item) {
    return json({ error: 'Item not found' }, { status: 404 });
  }
  return json(item);
};

export const DELETE: RequestHandler = async ({ params }) => {
  const success = deleteProjectItem(params.itemId);
  if (!success) {
    return json({ error: 'Item not found' }, { status: 404 });
  }
  return json({ success: true });
};
