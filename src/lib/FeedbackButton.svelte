<script lang="ts">
  import { onMount } from 'svelte';
  
  let isOpen = false;
  let feedbackText = '';
  let sending = false;
  let sent = false;
  
  async function submitFeedback() {
    if (!feedbackText.trim()) return;
    
    sending = true;
    
    try {
      // Try to capture screenshot, but don't fail if it doesn't work
      let screenshot: string | null = null;
      try {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(document.body, {
          scale: 0.5,
          logging: false,
          useCORS: true,
          allowTaint: true
        });
        screenshot = canvas.toDataURL('image/png');
      } catch (screenshotErr) {
        console.warn('Screenshot capture failed, sending without:', screenshotErr);
      }
      
      // Send feedback
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: feedbackText.trim(),
          screenshot,
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      sent = true;
      feedbackText = '';
      
      // Reset after 2 seconds
      setTimeout(() => {
        sent = false;
        isOpen = false;
      }, 2000);
      
    } catch (err) {
      console.error('Failed to send feedback:', err);
      alert('Failed to send feedback: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      sending = false;
    }
  }
</script>

<!-- Floating feedback button -->
<div class="fixed bottom-4 right-4 z-50">
  {#if isOpen}
    <div class="card bg-base-100 shadow-xl w-80 rounded-2xl">
      <div class="card-body p-4">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-semibold">Feedback</h3>
          <button class="btn btn-ghost btn-xs" on:click={() => isOpen = false}>✕</button>
        </div>
        
        {#if sent}
          <div class="text-center py-4">
            <span class="text-2xl">✓</span>
            <p class="text-sm opacity-70 mt-1">Sent! I'll see this with a screenshot.</p>
          </div>
        {:else}
          <textarea 
            bind:value={feedbackText}
            placeholder="What's on your mind? Bug, idea, feedback..."
            class="textarea textarea-bordered w-full h-24 rounded-xl"
            style="font-size: 16px;"
            disabled={sending}
          ></textarea>
          <p class="text-xs opacity-50 mt-1">📷 Auto-captures screenshot when you send</p>
          <button 
            class="btn btn-primary btn-sm w-full mt-2 rounded-xl"
            on:click={submitFeedback}
            disabled={sending || !feedbackText.trim()}
          >
            {sending ? 'Capturing & Sending...' : 'Send Feedback'}
          </button>
        {/if}
      </div>
    </div>
  {:else}
    <button 
      class="btn btn-circle btn-primary shadow-lg"
      on:click={() => isOpen = true}
      title="Send feedback"
    >
      💬
    </button>
  {/if}
</div>
