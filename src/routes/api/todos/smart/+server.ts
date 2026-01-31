import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createTodo, searchTodos, completeTodo, updateTodo, getAllTodos } from '$lib/db';

interface ParsedIntent {
  action: 'create' | 'complete' | 'update' | 'unclear';
  title?: string;
  assignee?: string;
  dueDate?: string;
  matchTodoId?: string;
  originalText: string;
}

function parseDate(text: string): string | null {
  const lower = text.toLowerCase();
  const now = new Date();
  
  // Today
  if (lower.includes('today')) {
    return now.toISOString().split('T')[0];
  }
  
  // Tomorrow
  if (lower.includes('tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  
  // Next week
  if (lower.includes('next week')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }
  
  // In X days
  const inDaysMatch = lower.match(/in (\d+) days?/);
  if (inDaysMatch) {
    const d = new Date(now);
    d.setDate(d.getDate() + parseInt(inDaysMatch[1]));
    return d.toISOString().split('T')[0];
  }
  
  // By/on day of week
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (lower.includes(days[i])) {
      const d = new Date(now);
      const currentDay = d.getDay();
      let daysUntil = i - currentDay;
      if (daysUntil <= 0) daysUntil += 7; // Next occurrence
      d.setDate(d.getDate() + daysUntil);
      return d.toISOString().split('T')[0];
    }
  }
  
  // Month day format (e.g., "feb 15", "march 3")
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  for (let i = 0; i < months.length; i++) {
    const monthMatch = lower.match(new RegExp(`${months[i]}\\w*\\s+(\\d{1,2})`));
    if (monthMatch) {
      const d = new Date(now.getFullYear(), i, parseInt(monthMatch[1]));
      if (d < now) d.setFullYear(d.getFullYear() + 1); // Next year if past
      return d.toISOString().split('T')[0];
    }
  }
  
  return null;
}

function parseAssignee(text: string): string {
  const lower = text.toLowerCase();
  
  // Explicit assignee mentions
  if (lower.startsWith('coby') || lower.includes(' coby ') || lower.includes('for coby')) {
    return 'coby';
  }
  if (lower.startsWith('rodion') || lower.includes(' rodion ') || lower.includes('for rodion') ||
      lower.startsWith('i need') || lower.startsWith('remind me') || lower.startsWith('i should') ||
      lower.includes('remind me')) {
    return 'rodion';
  }
  
  // Default: if it sounds like a personal reminder, assign to rodion
  if (lower.includes('call ') || lower.includes('email ') || lower.includes('buy ') || 
      lower.includes('pick up') || lower.includes('schedule ')) {
    return 'rodion';
  }
  
  // Default to coby for research/work tasks
  return 'coby';
}

function parseIntent(text: string, existingTodos: { id: string; title: string }[]): ParsedIntent {
  const lower = text.toLowerCase().trim();
  const result: ParsedIntent = { action: 'create', originalText: text };
  
  // Completion patterns
  const completionPatterns = [
    /^(?:done|finished|completed|complete|did|checked off?)\s+(?:with\s+)?(?:the\s+)?(.+)/i,
    /^(?:mark|check)\s+(?:off\s+)?(?:the\s+)?(.+?)(?:\s+(?:as\s+)?(?:done|complete|finished))?$/i,
    /^(.+?)\s+(?:is\s+)?(?:done|complete|finished)$/i
  ];
  
  for (const pattern of completionPatterns) {
    const match = text.match(pattern);
    if (match) {
      const searchTerm = match[1].trim();
      // Find matching todo
      const matches = existingTodos.filter(t => 
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        searchTerm.toLowerCase().includes(t.title.toLowerCase().split(' ')[0])
      );
      if (matches.length > 0) {
        return {
          action: 'complete',
          matchTodoId: matches[0].id,
          originalText: text
        };
      }
      // No match found, unclear
      return { action: 'unclear', originalText: text };
    }
  }
  
  // Update patterns (push/move/reschedule)
  const updatePatterns = [
    /^(?:push|move|reschedule|delay)\s+(?:the\s+)?(.+?)\s+(?:to|until|by)\s+(.+)$/i,
    /^(?:change|update)\s+(?:the\s+)?(.+?)\s+(?:due\s+)?(?:date\s+)?(?:to|until|by)\s+(.+)$/i
  ];
  
  for (const pattern of updatePatterns) {
    const match = text.match(pattern);
    if (match) {
      const searchTerm = match[1].trim();
      const newDateText = match[2].trim();
      const matches = existingTodos.filter(t => 
        t.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (matches.length > 0) {
        const dueDate = parseDate(newDateText);
        return {
          action: 'update',
          matchTodoId: matches[0].id,
          dueDate: dueDate || undefined,
          originalText: text
        };
      }
    }
  }
  
  // Create: extract title, assignee, due date
  let title = text;
  
  // Remove assignee mentions from title
  title = title.replace(/^(?:coby|rodion)[,:]?\s*/i, '');
  title = title.replace(/\s+for\s+(?:coby|rodion)\s*$/i, '');
  
  // Remove date phrases from title (but parse them first)
  const dueDate = parseDate(text);
  if (dueDate) {
    title = title
      .replace(/\s+(?:by|on|due|before)\s+(?:today|tomorrow|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi, '')
      .replace(/\s+(?:by|on|due|before)\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}/gi, '')
      .replace(/\s+in\s+\d+\s+days?/gi, '')
      .replace(/\s+tomorrow$/gi, '')
      .replace(/\s+today$/gi, '');
  }
  
  // Clean up "remind me to" style phrases
  title = title.replace(/^(?:remind\s+me\s+to|i\s+need\s+to|i\s+should|need\s+to)\s*/i, '');
  
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);
  
  return {
    action: 'create',
    title: title.trim(),
    assignee: parseAssignee(text),
    dueDate: dueDate || undefined,
    originalText: text
  };
}

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const text = body.text?.trim();
  
  if (!text) {
    return json({ error: 'text is required' }, { status: 400 });
  }
  
  // Get existing incomplete todos for matching
  const existingTodos = getAllTodos(false).map(t => ({ id: t.id, title: t.title }));
  
  const intent = parseIntent(text, existingTodos);
  
  switch (intent.action) {
    case 'complete': {
      if (intent.matchTodoId) {
        const todo = completeTodo(intent.matchTodoId);
        return json({ 
          action: 'completed',
          message: `Marked "${todo?.title}" as done`,
          todo 
        });
      }
      return json({ 
        action: 'unclear',
        message: "Couldn't find a matching todo to complete" 
      }, { status: 400 });
    }
    
    case 'update': {
      if (intent.matchTodoId) {
        const updates: Record<string, unknown> = {};
        if (intent.dueDate) updates.due_date = intent.dueDate;
        const todo = updateTodo(intent.matchTodoId, updates);
        return json({ 
          action: 'updated',
          message: `Updated "${todo?.title}"${intent.dueDate ? ` - due ${intent.dueDate}` : ''}`,
          todo 
        });
      }
      return json({ 
        action: 'unclear',
        message: "Couldn't find a matching todo to update" 
      }, { status: 400 });
    }
    
    case 'create': {
      const todo = createTodo(
        intent.title || text,
        intent.assignee || 'coby',
        'rodion', // UI always creates as rodion
        intent.dueDate || null
      );
      return json({ 
        action: 'created',
        message: `Created "${todo.title}" for ${todo.assignee}${todo.due_date ? ` - due ${todo.due_date}` : ''}`,
        todo 
      });
    }
    
    default:
      return json({ 
        action: 'unclear',
        message: "I couldn't understand that. Try something like 'call dentist tomorrow' or 'done with the dentist call'" 
      }, { status: 400 });
  }
};
