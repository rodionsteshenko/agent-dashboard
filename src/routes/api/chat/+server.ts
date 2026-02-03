import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createMessage, getMessages } from '$lib/db';

const GATEWAY_URL = 'http://127.0.0.1:18789/v1/chat/completions';
const GATEWAY_TOKEN = 'b2cd9c1ca38aa28f50ffc2356b827d459dac5b90d7629062';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { content } = body;
  
  if (!content) {
    return json({ error: 'content is required' }, { status: 400 });
  }
  
  // Save user message
  const userMessage = createMessage('user', content);
  
  // Get recent messages for context
  const recentMessages = getMessages(20);
  const chatMessages = recentMessages.map(m => ({
    role: m.role,
    content: m.content
  }));
  
  try {
    const response = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
        'x-openclaw-agent-id': 'main'
      },
      body: JSON.stringify({
        model: 'openclaw',
        messages: chatMessages,
        stream: false
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gateway error:', response.status, errorText);
      return json({ 
        error: `Gateway error: ${response.status}`,
        userMessage 
      }, { status: 502 });
    }
    
    const data = await response.json();
    const assistantContent = data.choices?.[0]?.message?.content || 'No response';
    
    // Save assistant message
    const assistantMessage = createMessage('assistant', assistantContent);
    
    return json({
      userMessage,
      assistantMessage
    });
    
  } catch (err) {
    console.error('Gateway connection error:', err);
    return json({ 
      error: 'Failed to connect to gateway',
      userMessage 
    }, { status: 502 });
  }
};
