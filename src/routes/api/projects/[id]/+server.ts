import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProject, updateProject, deleteProject, getProjectItems, getProjectDocs } from '$lib/db';

export const GET: RequestHandler = async ({ params }) => {
  const project = getProject(params.id);
  if (!project) {
    return json({ error: 'Project not found' }, { status: 404 });
  }
  
  // Include items and docs
  const items = getProjectItems(params.id);
  const docs = getProjectDocs(params.id);
  
  return json({ ...project, items, docs });
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  const body = await request.json();
  const project = updateProject(params.id, body);
  
  if (!project) {
    return json({ error: 'Project not found' }, { status: 404 });
  }
  
  return json(project);
};

export const DELETE: RequestHandler = async ({ params }) => {
  const success = deleteProject(params.id);
  if (!success) {
    return json({ error: 'Project not found' }, { status: 404 });
  }
  return json({ success: true });
};
