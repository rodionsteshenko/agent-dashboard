import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTodo, completeTodo, uncompleteTodo, deleteTodo, updateTodo } from '$lib/db';

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
  
  // Handle completion toggle
  if (body.completed !== undefined) {
    todo = body.completed ? completeTodo(params.id) : uncompleteTodo(params.id);
  }
  
  // Handle other updates (title, assignee, due_date, recurrence)
  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.assignee !== undefined) updates.assignee = body.assignee;
  if (body.due_date !== undefined) updates.due_date = body.due_date;
  if (body.recurrence !== undefined) updates.recurrence = body.recurrence;
  
  if (Object.keys(updates).length > 0) {
    todo = updateTodo(params.id, updates);
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
