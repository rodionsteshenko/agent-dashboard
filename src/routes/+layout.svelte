<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  let theme = 'lofi'; // Light, soft, minimal
  
  const themes = [
    'light', 'dark', 'cupcake', 'garden', 'forest', 'lofi', 
    'pastel', 'fantasy', 'autumn', 'coffee', 'winter', 'dim', 'nord', 'sunset'
  ];
  
  onMount(() => {
    const saved = localStorage.getItem('dashboard-theme');
    if (saved && themes.includes(saved)) {
      theme = saved;
    }
  });
  
  $: if (browser && theme) {
    localStorage.setItem('dashboard-theme', theme);
  }
</script>

<div data-theme={theme} class="min-h-screen bg-base-200">
  <div class="navbar bg-base-100 shadow-sm sticky top-0 z-50 rounded-b-2xl mx-auto max-w-3xl">
    <div class="flex-1">
      <a href="/" class="btn btn-ghost text-lg font-normal">Agent Dashboard</a>
    </div>
    <div class="flex-none gap-2">
      <select 
        bind:value={theme} 
        class="select select-sm rounded-xl bg-base-200 border-0"
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
</div>
