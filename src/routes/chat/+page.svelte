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
  
  async function sendMessage() {
    if (!inputText.trim() || sending) return;
    
    const content = inputText.trim();
    inputText = '';
    sending = true;
    
    try {
      // Add user message
      const userRes = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content })
      });
      const userMsg = await userRes.json();
      messages = [...messages, userMsg];
      await tick();
      scrollToBottom();
      
      // TODO: Send to OpenClaw gateway and get response
      // For now, just echo back
      const assistantRes = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          role: 'assistant', 
          content: `Echo: ${content}` 
        })
      });
      const assistantMsg = await assistantRes.json();
      messages = [...messages, assistantMsg];
      await tick();
      scrollToBottom();
      
    } catch (err) {
      console.error('Failed to send message:', err);
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
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
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
  <div class="pt-4 border-t border-base-300">
    <div class="join w-full">
      <input
        type="text"
        placeholder="Type a message..."
        class="input input-bordered join-item flex-1"
        bind:value={inputText}
        onkeydown={handleKeydown}
        disabled={sending}
      />
      <button 
        class="btn btn-primary join-item"
        onclick={sendMessage}
        disabled={!inputText.trim() || sending}
      >
        {#if sending}
          <span class="loading loading-spinner loading-sm"></span>
        {:else}
          Send
        {/if}
      </button>
    </div>
  </div>
</div>
