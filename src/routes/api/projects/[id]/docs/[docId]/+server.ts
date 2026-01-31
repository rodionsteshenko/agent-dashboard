import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProjectDoc, updateProjectDoc, appendToProjectDoc } from '$lib/db';

export const GET: RequestHandler = async ({ params }) => {
  const doc = getProjectDoc(params.docId);
  if (!doc) {
    return json({ error: 'Document not found' }, { status: 404 });
  }
  return json(doc);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  const body = await request.json();
  
  // Support append mode for progress notes
  if (body.append) {
    const doc = appendToProjectDoc(params.docId, body.append);
    if (!doc) {
      return json({ error: 'Document not found' }, { status: 404 });
    }
    return json(doc);
  }
  
  const doc = updateProjectDoc(params.docId, body);
  if (!doc) {
    return json({ error: 'Document not found' }, { status: 404 });
  }
  return json(doc);
};
