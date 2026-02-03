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
    
    // Show user message immediately (optimistic UI)
    const tempUserMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      created_at: new Date().toISOString()
    };
    messages = [...messages, tempUserMsg];
    await tick();
    scrollToBottom();
    
    // NOW show loading indicator (after user message is visible)
    sending = true;
    await tick();
    
    try {
      // Send to gateway via proxy
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      
      const data = await res.json();
      
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
        class="input input-bordered join-item flex-1 text-base"
        style="font-size: 16px;"
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
