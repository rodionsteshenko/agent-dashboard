import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllProjects, createProject } from '$lib/db';

export const GET: RequestHandler = async ({ url }) => {
  const includeArchived = url.searchParams.get('archived') === 'true';
  const projects = getAllProjects(includeArchived);
  return json(projects);
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  
  if (!body.name) {
    return json({ error: 'name is required' }, { status: 400 });
  }
  
  const project = createProject(body.name, body.description);
  return json(project, { status: 201 });
};
