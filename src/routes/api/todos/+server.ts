import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllTodos, getTodosByAssignee, createTodo } from '$lib/db';

export const GET: RequestHandler = async ({ url }) => {
  const assignee = url.searchParams.get('assignee');
  const includeCompleted = url.searchParams.get('completed') === 'true';
  
  const todos = assignee 
    ? getTodosByAssignee(assignee, includeCompleted)
    : getAllTodos(includeCompleted);
  return json(todos);
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  
  if (!body.title) {
    return json({ error: 'title is required' }, { status: 400 });
  }
  
  const todo = createTodo(body.title, body.assignee || 'coby', body.createdBy || 'coby');
  return json(todo, { status: 201 });
};
