<script lang="ts">
  import { onMount, tick } from 'svelte';
  
  interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
  }
  
  let messages = $state<Message[]>([]);
  let inputText = $state('');
  let sending = $state(false);
  let messagesContainer: HTMLDivElement;
  let debugLog = $state<string[]>([]);
  let showDebug = $state(true);
  
  onMount(async () => {
    await loadMessages();
  });
  
  async function loadMessages() {
    const res = await fetch('/api/messages');
    messages = await res.json();
    await tick();
    scrollToBottom();
  }
  
  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }
  
  function debug(msg: string) {
    debugLog = [...debugLog.slice(-19), `${new Date().toLocaleTimeString()}: ${msg}`];
    // Also log to server
    fetch('/api/debug', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg }) 
    }).catch(() => {});
  }
  
  async function sendMessage() {
    debug('sendMessage called');
    if (!inputText.trim() || sending) {
      debug(`blocked: trim=${!inputText.trim()}, sending=${sending}`);
      return;
    }
    
    const content = inputText.trim();
    debug(`content: "${content.substring(0, 20)}..."`);
    inputText = '';
    
    debug('creating temp msg...');
    // Show user message immediately (optimistic UI)
    const tempUserMsg: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      role: 'user',
      content,
      created_at: new Date().toISOString()
    };
    debug('adding to messages...');
    messages = [...messages, tempUserMsg];
    debug('tick 1...');
    await tick();
    debug('scroll...');
    scrollToBottom();
    
    // NOW show loading indicator (after user message is visible)
    debug('setting sending=true...');
    sending = true;
    debug('tick 2...');
    await tick();
    
    try {
      debug('fetching /api/chat (streaming)...');
      
      // Create placeholder for streaming response
      const streamingMsg: Message = {
        id: 'streaming-' + Date.now(),
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString()
      };
      messages = [...messages, streamingMsg];
      await tick();
      scrollToBottom();
      
      // Send with streaming enabled
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, stream: true })
      });
      debug(`response status: ${res.status}`);
      
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let finalId = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'user') {
                // Update user message with real ID
                messages = messages.map(m => 
                  m.id === tempUserMsg.id ? { ...m, id: data.id } : m
                );
              } else if (data.type === 'delta') {
                // Append streaming content
                messages = messages.map(m => 
                  m.id === streamingMsg.id ? { ...m, content: m.content + data.content } : m
                );
                await tick();
                scrollToBottom();
              } else if (data.type === 'done') {
                // Replace streaming message with final one
                finalId = data.id;
                messages = messages.map(m => 
                  m.id === streamingMsg.id ? { ...m, id: data.id, content: data.content } : m
                );
              }
            } catch {}
          }
        }
      }
      
      debug('streaming complete');
      
    } catch (err) {
      console.error('Failed to send message:', err);
      debug(`error: ${err instanceof Error ? err.message : String(err)}`);
      // Show error to user
      messages = [...messages, {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: `⚠️ Connection error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        created_at: new Date().toISOString()
      }];
      await tick();
      scrollToBottom();
    } finally {
      sending = false;
    }
  }
  
  async function clearChat() {
    if (confirm('Clear all messages?')) {
      await fetch('/api/messages', { method: 'DELETE' });
      messages = [];
    }
  }
  
  function handleSubmit(e: SubmitEvent) {
    debug('form submit');
    e.preventDefault();
    sendMessage();
  }
  
  function handleTouchEnd(e: TouchEvent) {
    debug(`touch end, inputText="${inputText}"`);
    if (!sending && inputText.trim()) {
      e.preventDefault();
      sendMessage();
    }
  }
  
  function formatTime(dateStr: string): string {
    // Handle both ISO strings (2026-02-03T12:30:00.000Z) and DB format (2026-02-03 12:30:00)
    const date = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'Z');
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="flex flex-col h-[calc(100vh-140px)]">
  <!-- Header -->
  <div class="flex justify-between items-center mb-4">
    <h1 class="text-xl font-bold">💬 Chat</h1>
    <button class="btn btn-ghost btn-sm" onclick={clearChat}>🗑️ Clear</button>
  </div>
  
  <!-- Debug toggle in header -->
  <div class="flex justify-end mb-2">
    <button class="btn btn-xs btn-ghost" onclick={() => showDebug = !showDebug}>
      {showDebug ? '🐛 Hide Debug' : '🐛 Show Debug'}
    </button>
  </div>
  
  <!-- Debug panel -->
  {#if showDebug && debugLog.length > 0}
    <div class="bg-warning/20 text-warning-content text-xs p-2 rounded mb-2 font-mono relative">
      <button 
        class="btn btn-xs btn-ghost absolute right-1 top-1"
        onclick={() => navigator.clipboard.writeText(debugLog.join('\n'))}
      >📋</button>
      {#each debugLog as log}
        <div>{log}</div>
      {/each}
    </div>
  {/if}
  
  <!-- Messages -->
  <div 
    bind:this={messagesContainer}
    class="flex-1 overflow-y-auto space-y-4 pb-4"
  >
    {#if messages.length === 0}
      <div class="text-center text-base-content/50 py-12">
        No messages yet. Say something!
      </div>
    {:else}
      {#each messages as msg (msg.id)}
        <div class="chat {msg.role === 'user' ? 'chat-end' : 'chat-start'}">
          <div class="chat-image avatar placeholder">
            <div class="bg-base-300 text-base-content rounded-full w-10">
              <span class="text-lg">{msg.role === 'user' ? '👤' : '🤖'}</span>
            </div>
          </div>
          <div class="chat-header opacity-50 text-xs">
            {msg.role === 'user' ? 'You' : 'Coby'}
            <time class="ml-1">{formatTime(msg.created_at)}</time>
          </div>
          <div class="chat-bubble {msg.role === 'user' ? 'chat-bubble-primary' : ''}">
            {#if msg.content}
              {msg.content}
            {:else if msg.role === 'assistant'}
              <span class="loading loading-dots loading-sm"></span>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
    
  </div>
  
  <!-- Input -->
  <form 
    class="pt-4 border-t border-base-300"
    onsubmit={handleSubmit}
  >
    <div class="join w-full">
      <input
        type="text"
        placeholder="Type a message..."
        class="input input-bordered join-item flex-1 text-base"
        style="font-size: 16px;"
        bind:value={inputText}
        oninput={(e) => debug(`input: "${(e.target as HTMLInputElement).value}"`)}
        disabled={sending}
      />
      <button 
        type="submit"
        class="btn btn-primary join-item"
        disabled={!inputText.trim() || sending}
        ontouchend={handleTouchEnd}
      >
        {#if sending}
          <span class="loading loading-spinner loading-sm"></span>
        {:else}
          Send
        {/if}
      </button>
    </div>
  </form>
</div>
