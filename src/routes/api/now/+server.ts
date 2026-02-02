import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const DATA_DIR = join(homedir(), 'agent-dashboard', 'data');
const NOW_FILE = join(DATA_DIR, 'now.json');
const QUOTES_FILE = join(DATA_DIR, 'quotes.json');

interface NowData {
  weather?: {
    temp: string;
    condition: string;
    high?: string;
    low?: string;
    location: string;
    updatedAt: string;
  };
  image?: {
    url: string;
    description: string;
    updatedAt: string;
  };
  quote?: {
    text: string;
    author: string;
    source?: string;
  };
}

interface Quote {
  text: string;
  author: string;
  source?: string;
  tags?: string[];
}

function loadNowData(): NowData {
  if (existsSync(NOW_FILE)) {
    try {
      return JSON.parse(readFileSync(NOW_FILE, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveNowData(data: NowData) {
  writeFileSync(NOW_FILE, JSON.stringify(data, null, 2));
}

function loadQuotes(): Quote[] {
  if (existsSync(QUOTES_FILE)) {
    try {
      return JSON.parse(readFileSync(QUOTES_FILE, 'utf-8'));
    } catch {
      return getDefaultQuotes();
    }
  }
  return getDefaultQuotes();
}

function getDefaultQuotes(): Quote[] {
  return [
    { text: "The best way to predict the future is to invent it.", author: "Alan Kay", tags: ["tech", "innovation"] },
    { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci", tags: ["design"] },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", tags: ["work", "passion"] },
    { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House", tags: ["programming"] },
    { text: "First, solve the problem. Then, write the code.", author: "John Johnson", tags: ["programming"] },
    { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler", tags: ["programming"] },
    { text: "The best error message is the one that never shows up.", author: "Thomas Fuchs", tags: ["ux", "programming"] },
    { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein", tags: ["motivation"] },
    { text: "Stay hungry, stay foolish.", author: "Stewart Brand", tags: ["motivation", "tech"] },
    { text: "Move fast and break things. Unless you're breaking stuff, you're not moving fast enough.", author: "Mark Zuckerberg", tags: ["tech", "startups"] },
    { text: "The computer was born to solve problems that did not exist before.", author: "Bill Gates", tags: ["tech", "humor"] },
    { text: "It's not a bug, it's a feature.", author: "Anonymous", tags: ["programming", "humor"] },
    { text: "There are only two hard things in Computer Science: cache invalidation and naming things.", author: "Phil Karlton", tags: ["programming", "humor"] },
    { text: "Programming today is a race between software engineers striving to build bigger and better idiot-proof programs, and the Universe trying to produce bigger and better idiots.", author: "Rick Cook", tags: ["programming", "humor"] },
    { text: "Weeks of coding can save you hours of planning.", author: "Anonymous", tags: ["programming", "humor"] }
  ];
}

function getRandomQuote(quotes: Quote[]): Quote {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export const GET: RequestHandler = async () => {
  const data = loadNowData();
  const quotes = loadQuotes();
  
  // Always return a fresh random quote
  const quote = getRandomQuote(quotes);
  
  return json({
    weather: data.weather || null,
    image: data.image || null,
    quote
  });
};

// POST to update weather or image
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const data = loadNowData();
  
  if (body.weather) {
    data.weather = {
      ...body.weather,
      updatedAt: new Date().toISOString()
    };
  }
  
  if (body.image) {
    data.image = {
      ...body.image,
      updatedAt: new Date().toISOString()
    };
  }
  
  saveNowData(data);
  
  return json({ ok: true });
};
