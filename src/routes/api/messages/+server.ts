import { json } from '@sveltejs/kit';
import { getMessages, createMessage, deleteAllMessages } from '$lib/db';
import type { RequestHandler } from './$types';

// GET /api/messages - list messages
export const GET: RequestHandler = async ({ url }) => {
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const messages = getMessages(limit);
  return json(messages);
};

// POST /api/messages - create a message
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { role, content } = body;
  
  if (!role || !content) {
    return json({ error: 'role and content are required' }, { status: 400 });
  }
  
  if (role !== 'user' && role !== 'assistant') {
    return json({ error: 'role must be user or assistant' }, { status: 400 });
  }
  
  const message = createMessage(role, content);
  return json(message, { status: 201 });
};

// DELETE /api/messages - clear all messages
export const DELETE: RequestHandler = async () => {
  deleteAllMessages();
  return json({ success: true });
};
