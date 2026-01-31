<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import FeedbackButton from '$lib/FeedbackButton.svelte';
  
  let theme = $state('lofi');
  let initialized = $state(false);
  
  const themes = [
    'light', 'dark', 'cupcake', 'garden', 'forest', 'lofi', 
    'pastel', 'fantasy', 'autumn', 'coffee', 'winter', 'dim', 'nord', 'sunset'
  ];
  
  // Reactive current path
  let currentPath = $derived($page.url.pathname);
  
  onMount(() => {
    const saved = localStorage.getItem('dashboard-theme');
    if (saved && themes.includes(saved)) {
      theme = saved;
    }
    initialized = true;
  });
  
  $effect(() => {
    if (initialized && browser) {
      localStorage.setItem('dashboard-theme', theme);
    }
  });
</script>

<div data-theme={theme} class="min-h-screen bg-base-200">
  <div class="navbar bg-base-100 shadow-sm sticky top-0 z-50 rounded-b-2xl mx-auto max-w-3xl">
    <div class="flex-1">
      <span class="text-lg font-normal px-3">Agent Dashboard</span>
    </div>
    <div class="flex-none gap-1">
      <!-- Tab navigation -->
      <div class="tabs tabs-boxed bg-base-200 rounded-xl p-1">
        <a 
          href="/" 
          class="tab tab-sm"
          class:tab-active={currentPath === '/'}
        >
          📰 Feed
        </a>
        <a 
          href="/todos" 
          class="tab tab-sm"
          class:tab-active={currentPath === '/todos'}
        >
          📋 Todos
        </a>
        <a 
          href="/projects" 
          class="tab tab-sm"
          class:tab-active={currentPath.startsWith('/projects')}
        >
          🗂️ Projects
        </a>
      </div>
      <select 
        bind:value={theme} 
        class="select select-sm rounded-xl bg-base-200 border-0 ml-2"
      >
        {#each themes as t}
          <option value={t}>{t}</option>
        {/each}
      </select>
    </div>
  </div>
  
  <main class="container mx-auto px-4 py-6 max-w-3xl">
    <slot />
  </main>
  
  <FeedbackButton />
</div>
