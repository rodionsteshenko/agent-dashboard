import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createMessage, getMessages } from '$lib/db';

const GATEWAY_URL = 'http://127.0.0.1:18789/v1/chat/completions';
const GATEWAY_TOKEN = 'b2cd9c1ca38aa28f50ffc2356b827d459dac5b90d7629062';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { content, stream } = body;
  
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
  
  // Streaming response
  if (stream) {
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
        stream: true,
        user: 'dashboard-chat'
      })
    });
    
    if (!response.ok || !response.body) {
      return json({ error: `Gateway error: ${response.status}`, userMessage }, { status: 502 });
    }
    
    // Return SSE stream
    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        
        // Send user message ID first
        controller.enqueue(`data: ${JSON.stringify({ type: 'user', id: userMessage.id })}\n\n`);
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  // Save complete message to DB
                  const assistantMessage = createMessage('assistant', fullContent);
                  controller.enqueue(`data: ${JSON.stringify({ type: 'done', id: assistantMessage.id, content: fullContent })}\n\n`);
                } else {
                  try {
                    const parsed = JSON.parse(data);
                    const delta = parsed.choices?.[0]?.delta?.content;
                    if (delta) {
                      fullContent += delta;
                      controller.enqueue(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`);
                    }
                  } catch {}
                }
              }
            }
          }
        } finally {
          controller.close();
        }
      }
    });
    
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  }
  
  // Non-streaming response (original)
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
        stream: false,
        user: 'dashboard-chat'
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
