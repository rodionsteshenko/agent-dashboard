import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllTodos, getTodosByAssignee, createTodo, searchTodos, getTodosDueSoon } from '$lib/db';

export const GET: RequestHandler = async ({ url }) => {
  const assignee = url.searchParams.get('assignee');
  const includeCompleted = url.searchParams.get('completed') === 'true';
  const search = url.searchParams.get('search') || url.searchParams.get('q');
  const due = url.searchParams.get('due');
  
  // Search takes priority
  if (search) {
    const todos = searchTodos(search);
    return json(todos);
  }
  
  // Due date filters
  if (due) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let todos = getAllTodos(includeCompleted);
    
    switch (due) {
      case 'overdue':
        todos = todos.filter(t => {
          if (!t.due_date || t.completed) return false;
          const dueDate = new Date(t.due_date + 'T00:00:00');
          return dueDate < today;
        });
        break;
      case 'today':
        todos = todos.filter(t => {
          if (!t.due_date) return false;
          const dueDate = new Date(t.due_date + 'T00:00:00');
          return dueDate.getTime() === today.getTime();
        });
        break;
      case 'soon':
        // Due within 2 days
        todos = getTodosDueSoon(2);
        break;
      case 'week':
        // Due within 7 days
        todos = getTodosDueSoon(7);
        break;
      case 'no-date':
        todos = todos.filter(t => !t.due_date && !t.completed);
        break;
    }
    
    // Apply assignee filter if also provided
    if (assignee) {
      todos = todos.filter(t => t.assignee === assignee);
    }
    
    return json(todos);
  }
  
  // Standard filters
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
  
  const todo = createTodo(
    body.title, 
    body.assignee || 'coby', 
    body.createdBy || 'coby',
    body.due_date || body.dueDate || null
  );
  return json(todo, { status: 201 });
};
