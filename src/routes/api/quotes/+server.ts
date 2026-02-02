import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const DATA_DIR = join(homedir(), 'agent-dashboard', 'data');
const QUOTES_FILE = join(DATA_DIR, 'quotes.json');

interface Quote {
  id: string;
  text: string;
  author: string;
  source?: string;
  tags?: string[];
  createdAt: string;
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadQuotes(): Quote[] {
  ensureDataDir();
  if (existsSync(QUOTES_FILE)) {
    try {
      return JSON.parse(readFileSync(QUOTES_FILE, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}

function saveQuotes(quotes: Quote[]) {
  ensureDataDir();
  writeFileSync(QUOTES_FILE, JSON.stringify(quotes, null, 2));
}

// GET all quotes
export const GET: RequestHandler = async ({ url }) => {
  const quotes = loadQuotes();
  const tag = url.searchParams.get('tag');
  
  if (tag) {
    return json(quotes.filter(q => q.tags?.includes(tag)));
  }
  
  return json(quotes);
};

// POST new quote
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const quotes = loadQuotes();
  
  const newQuote: Quote = {
    id: crypto.randomUUID(),
    text: body.text,
    author: body.author,
    source: body.source,
    tags: body.tags || [],
    createdAt: new Date().toISOString()
  };
  
  quotes.push(newQuote);
  saveQuotes(quotes);
  
  return json(newQuote);
};
