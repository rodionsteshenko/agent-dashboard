import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProject, getProjectItems, createProjectItem } from '$lib/db';

export const GET: RequestHandler = async ({ params, url }) => {
  const project = getProject(params.id);
  if (!project) {
    return json({ error: 'Project not found' }, { status: 404 });
  }
  
  const status = url.searchParams.get('status') || undefined;
  const items = getProjectItems(params.id, status);
  return json(items);
};

export const POST: RequestHandler = async ({ params, request }) => {
  const project = getProject(params.id);
  if (!project) {
    return json({ error: 'Project not found' }, { status: 404 });
  }
  
  const body = await request.json();
  
  if (!body.title) {
    return json({ error: 'title is required' }, { status: 400 });
  }
  
  const item = createProjectItem(
    params.id,
    body.title,
    body.description,
    body.acceptance_criteria || body.acceptanceCriteria,
    body.priority,
    body.phase,
    body.assignee
  );
  
  return json(item, { status: 201 });
};
