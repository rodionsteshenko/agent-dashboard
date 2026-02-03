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
      debug('fetching /api/chat...');
      // Send to gateway via proxy
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      debug(`response status: ${res.status}`);
      
      const data = await res.json();
      debug(`got data: ${JSON.stringify(data).substring(0, 50)}...`);
      
      // Replace temp message with real one (has DB id)
      if (data.userMessage) {
        messages = messages.map(m => 
          m.id === tempUserMsg.id ? data.userMessage : m
        );
      }
      
      if (data.assistantMessage) {
        messages = [...messages, data.assistantMessage];
        await tick();
        scrollToBottom();
      }
      
      if (data.error) {
        console.error('Chat error:', data.error);
        // Show error as system message
        messages = [...messages, {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: `⚠️ ${data.error}`,
          created_at: new Date().toISOString()
        }];
        await tick();
        scrollToBottom();
      }
      
    } catch (err) {
      console.error('Failed to send message:', err);
      // Show error to user
      messages = [...messages, {
        id: crypto.randomUUID(),
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
    const date = new Date(dateStr + 'Z');
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
            {msg.content}
          </div>
        </div>
      {/each}
    {/if}
    
    {#if sending}
      <div class="chat chat-start">
        <div class="chat-image avatar placeholder">
          <div class="bg-base-300 text-base-content rounded-full w-10">
            <span class="text-lg">🤖</span>
          </div>
        </div>
        <div class="chat-bubble">
          <span class="loading loading-dots loading-sm"></span>
        </div>
      </div>
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
