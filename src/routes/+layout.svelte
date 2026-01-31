<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import FeedbackButton from '$lib/FeedbackButton.svelte';
  
  let theme = $state('lofi');
  let textSize = $state('normal');
  let fontFamily = $state('system');
  let initialized = $state(false);
  let showSettings = $state(false);
  
  const themes = [
    'light', 'dark', 'cupcake', 'garden', 'forest', 'lofi', 
    'pastel', 'fantasy', 'autumn', 'coffee', 'winter', 'dim', 'nord', 'sunset'
  ];
  
  const textSizes = [
    { value: 'small', label: 'Small', class: 'text-sm' },
    { value: 'normal', label: 'Normal', class: 'text-base' },
    { value: 'large', label: 'Large', class: 'text-lg' },
    { value: 'xl', label: 'Extra Large', class: 'text-xl' }
  ];
  
  const fonts = [
    { value: 'system', label: 'System Default', class: 'font-sans' },
    { value: 'serif', label: 'Serif', class: 'font-serif' },
    { value: 'mono', label: 'Monospace', class: 'font-mono' }
  ];
  
  // Reactive current path
  let currentPath = $derived($page.url.pathname);
  
  // Get current classes
  let textSizeClass = $derived(textSizes.find(t => t.value === textSize)?.class || 'text-base');
  let fontClass = $derived(fonts.find(f => f.value === fontFamily)?.class || 'font-sans');
  
  onMount(() => {
    const savedTheme = localStorage.getItem('dashboard-theme');
    const savedTextSize = localStorage.getItem('dashboard-text-size');
    const savedFont = localStorage.getItem('dashboard-font');
    
    if (savedTheme && themes.includes(savedTheme)) theme = savedTheme;
    if (savedTextSize && textSizes.some(t => t.value === savedTextSize)) textSize = savedTextSize;
    if (savedFont && fonts.some(f => f.value === savedFont)) fontFamily = savedFont;
    
    initialized = true;
  });
  
  $effect(() => {
    if (initialized && browser) {
      localStorage.setItem('dashboard-theme', theme);
      localStorage.setItem('dashboard-text-size', textSize);
      localStorage.setItem('dashboard-font', fontFamily);
    }
  });
</script>

<div data-theme={theme} class="min-h-screen bg-base-200 {textSizeClass} {fontClass}">
  <!-- Header - Two lines for mobile -->
  <div class="bg-base-100 shadow-sm sticky top-0 z-50 rounded-b-2xl mx-auto max-w-3xl">
    <!-- Line 1: Title -->
    <div class="text-center py-2 border-b border-base-200">
      <span class="text-lg font-semibold">Agent Dashboard</span>
    </div>
    
    <!-- Line 2: Navigation + Settings -->
    <div class="flex items-center justify-center gap-2 py-2 px-2">
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
      
      <button 
        class="btn btn-ghost btn-sm btn-square"
        on:click={() => showSettings = true}
        title="Settings"
      >
        ⚙️
      </button>
    </div>
  </div>
  
  <main class="container mx-auto px-4 py-6 max-w-3xl">
    <slot />
  </main>
  
  <FeedbackButton />
</div>

<!-- Settings Modal -->
{#if showSettings}
  <div class="modal modal-open" data-theme={theme}>
    <div class="modal-box {textSizeClass} {fontClass}">
      <div class="flex justify-between items-center mb-6">
        <h3 class="font-bold text-lg">Settings</h3>
        <button class="btn btn-ghost btn-sm btn-square" on:click={() => showSettings = false}>✕</button>
      </div>
      
      <div class="space-y-6">
        <!-- Theme -->
        <div>
          <label class="label">
            <span class="label-text font-medium">Theme</span>
          </label>
          <div class="grid grid-cols-4 gap-2">
            {#each themes as t}
              <button 
                class="btn btn-sm"
                class:btn-primary={theme === t}
                class:btn-ghost={theme !== t}
                on:click={() => theme = t}
              >
                {t}
              </button>
            {/each}
          </div>
        </div>
        
        <!-- Text Size -->
        <div>
          <label class="label">
            <span class="label-text font-medium">Text Size</span>
          </label>
          <div class="flex gap-2">
            {#each textSizes as size}
              <button 
                class="btn btn-sm flex-1"
                class:btn-primary={textSize === size.value}
                class:btn-ghost={textSize !== size.value}
                on:click={() => textSize = size.value}
              >
                {size.label}
              </button>
            {/each}
          </div>
          <p class="text-xs opacity-50 mt-1">Preview: The quick brown fox jumps over the lazy dog.</p>
        </div>
        
        <!-- Font -->
        <div>
          <label class="label">
            <span class="label-text font-medium">Font</span>
          </label>
          <div class="flex gap-2">
            {#each fonts as font}
              <button 
                class="btn btn-sm flex-1 {font.class}"
                class:btn-primary={fontFamily === font.value}
                class:btn-ghost={fontFamily !== font.value}
                on:click={() => fontFamily = font.value}
              >
                {font.label}
              </button>
            {/each}
          </div>
        </div>
      </div>
      
      <div class="modal-action">
        <button class="btn btn-primary" on:click={() => showSettings = false}>Done</button>
      </div>
    </div>
    <div 
      class="modal-backdrop bg-black/50" 
      on:click={() => showSettings = false}
      on:keydown={(e) => e.key === 'Escape' && (showSettings = false)}
      role="button" 
      tabindex="0"
    ></div>
  </div>
{/if}
