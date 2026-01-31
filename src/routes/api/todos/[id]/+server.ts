import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTodo, completeTodo, uncompleteTodo, deleteTodo } from '$lib/db';

export const GET: RequestHandler = async ({ params }) => {
  const todo = getTodo(params.id);
  if (!todo) {
    return json({ error: 'Todo not found' }, { status: 404 });
  }
  return json(todo);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  const body = await request.json();
  let todo = getTodo(params.id);
  
  if (!todo) {
    return json({ error: 'Todo not found' }, { status: 404 });
  }
  
  if (body.completed !== undefined) {
    todo = body.completed ? completeTodo(params.id) : uncompleteTodo(params.id);
  }
  
  return json(todo);
};

export const DELETE: RequestHandler = async ({ params }) => {
  const success = deleteTodo(params.id);
  if (!success) {
    return json({ error: 'Todo not found' }, { status: 404 });
  }
  return json({ success: true });
};
