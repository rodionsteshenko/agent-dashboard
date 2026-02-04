<script lang="ts">
  import { onMount } from 'svelte';
  
  let isRecording = $state(false);
  let isProcessing = $state(false);
  let isPlaying = $state(false);
  let transcript = $state('');
  let response = $state('');
  let error = $state('');
  let audioContext: AudioContext | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  let holdTimer: number | null = null;
  let micPermission = $state<'prompt' | 'granted' | 'denied'>('prompt');
  
  // Conversation history for display
  let history = $state<Array<{role: 'user' | 'assistant', text: string}>>([]);
  
  onMount(async () => {
    // Check mic permission
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      micPermission = result.state as 'prompt' | 'granted' | 'denied';
      result.addEventListener('change', () => {
        micPermission = result.state as 'prompt' | 'granted' | 'denied';
      });
    } catch {
      // permissions API not supported, we'll find out when we try
    }
  });
  
  async function startRecording() {
    error = '';
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micPermission = 'granted';
      
      // Prefer webm but fall back to whatever is supported
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/wav';
      
      mediaRecorder = new MediaRecorder(stream, { mimeType });
      audioChunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunks.length > 0) {
          const audioBlob = new Blob(audioChunks, { type: mimeType });
          await sendAudio(audioBlob);
        }
      };
      
      mediaRecorder.start();
      isRecording = true;
    } catch (err) {
      console.error('Mic error:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        micPermission = 'denied';
        error = 'Microphone access denied. Please allow mic access in your browser settings.';
      } else {
        error = 'Could not access microphone';
      }
    }
  }
  
  function stopRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      isRecording = false;
    }
  }
  
  async function sendAudio(audioBlob: Blob) {
    isProcessing = true;
    transcript = '';
    response = '';
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const res = await fetch('/api/voice', {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      
      const data = await res.json();
      transcript = data.transcript || '';
      response = data.response || '';
      
      // Add to history
      if (transcript) {
        history = [...history, { role: 'user', text: transcript }];
      }
      if (response) {
        history = [...history, { role: 'assistant', text: response }];
      }
      
      // Play audio response
      if (data.audio) {
        await playAudio(data.audio);
      }
    } catch (err) {
      console.error('Voice API error:', err);
      error = err instanceof Error ? err.message : 'Failed to process voice';
    } finally {
      isProcessing = false;
    }
  }
  
  async function playAudio(base64Audio: string) {
    isPlaying = true;
    try {
      // Decode base64 to array buffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create audio context if needed
      if (!audioContext) {
        audioContext = new AudioContext();
      }
      
      // Decode and play
      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => {
        isPlaying = false;
      };
      source.start();
    } catch (err) {
      console.error('Audio playback error:', err);
      isPlaying = false;
    }
  }
  
  // Handle touch/mouse events for push-to-talk
  function handleStart(e: MouseEvent | TouchEvent) {
    e.preventDefault();
    startRecording();
  }
  
  function handleEnd(e: MouseEvent | TouchEvent) {
    e.preventDefault();
    stopRecording();
  }
</script>

<div class="flex flex-col h-[calc(100vh-140px)]">
  <!-- Header -->
  <div class="text-center mb-4">
    <h1 class="text-xl font-bold">🎤 Voice</h1>
    <p class="text-sm opacity-60">Hold to talk, release to send</p>
  </div>
  
  <!-- Conversation History -->
  <div class="flex-1 overflow-y-auto space-y-3 mb-4 px-2">
    {#if history.length === 0}
      <div class="text-center opacity-40 mt-8">
        <p>No conversation yet</p>
        <p class="text-sm">Hold the button and speak</p>
      </div>
    {:else}
      {#each history as msg}
        <div class="chat {msg.role === 'user' ? 'chat-end' : 'chat-start'}">
          <div class="chat-bubble {msg.role === 'user' ? 'chat-bubble-primary' : 'chat-bubble-secondary'}">
            {msg.text}
          </div>
        </div>
      {/each}
    {/if}
    
    {#if isProcessing}
      <div class="chat chat-start">
        <div class="chat-bubble chat-bubble-secondary">
          <span class="loading loading-dots loading-sm"></span>
        </div>
      </div>
    {/if}
  </div>
  
  <!-- Error display -->
  {#if error}
    <div class="alert alert-error mb-4">
      <span>{error}</span>
      <button class="btn btn-ghost btn-xs" on:click={() => error = ''}>✕</button>
    </div>
  {/if}
  
  <!-- Push-to-talk button -->
  <div class="flex flex-col items-center gap-4 pb-4">
    <!-- Status indicator -->
    <div class="text-sm opacity-60">
      {#if isRecording}
        <span class="text-error animate-pulse">● Recording...</span>
      {:else if isProcessing}
        <span class="text-warning">Processing...</span>
      {:else if isPlaying}
        <span class="text-success">🔊 Playing...</span>
      {:else}
        <span>Ready</span>
      {/if}
    </div>
    
    <!-- Big push-to-talk button -->
    <button
      class="btn btn-circle w-24 h-24 text-4xl transition-all duration-150"
      class:btn-primary={!isRecording && !isProcessing}
      class:btn-error={isRecording}
      class:btn-disabled={isProcessing}
      class:scale-110={isRecording}
      disabled={isProcessing}
      on:mousedown={handleStart}
      on:mouseup={handleEnd}
      on:mouseleave={handleEnd}
      on:touchstart={handleStart}
      on:touchend={handleEnd}
      on:touchcancel={handleEnd}
    >
      {#if isRecording}
        🎙️
      {:else if isProcessing}
        <span class="loading loading-spinner"></span>
      {:else}
        🎤
      {/if}
    </button>
    
    {#if micPermission === 'denied'}
      <p class="text-sm text-error text-center max-w-xs">
        Microphone blocked. Check browser settings and reload.
      </p>
    {/if}
  </div>
</div>
