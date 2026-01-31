import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProject, getProjectDocs, getProjectDocByType } from '$lib/db';

export const GET: RequestHandler = async ({ params, url }) => {
  const project = getProject(params.id);
  if (!project) {
    return json({ error: 'Project not found' }, { status: 404 });
  }
  
  // If type is specified, return that specific doc
  const docType = url.searchParams.get('type');
  if (docType) {
    const doc = getProjectDocByType(params.id, docType);
    if (!doc) {
      return json({ error: 'Document not found' }, { status: 404 });
    }
    return json(doc);
  }
  
  const docs = getProjectDocs(params.id);
  return json(docs);
};
