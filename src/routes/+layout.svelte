<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import FeedbackButton from '$lib/FeedbackButton.svelte';
  
  let theme = $state('lofi');
  let textSize = $state(100); // Percentage: 50-150
  let fontFamily = $state('system');
  let borderRadius = $state('default');
  let primaryColor = $state('');
  let dashboardName = $state('Agent Dashboard');
  let initialized = $state(false);
  let showSettings = $state(false);
  let isMobile = $state(false);
  
  // Device detection
  function detectMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }
  
  // Storage key suffix based on device type
  let deviceSuffix = $derived(isMobile ? '-mobile' : '-desktop');
  
  const themes = [
    'light', 'dark', 'cupcake', 'garden', 'forest', 'lofi', 
    'pastel', 'fantasy', 'autumn', 'coffee', 'winter', 'dim', 'nord', 'sunset'
  ];
  
  const fonts = [
    { value: 'system', label: 'System', stack: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    { value: 'inter', label: 'Inter', stack: '"Inter", -apple-system, sans-serif' },
    { value: 'georgia', label: 'Georgia', stack: 'Georgia, "Times New Roman", serif' },
    { value: 'palatino', label: 'Palatino', stack: '"Palatino Linotype", Palatino, serif' },
    { value: 'times', label: 'Times', stack: '"Times New Roman", Times, serif' },
    { value: 'arial', label: 'Arial', stack: 'Arial, Helvetica, sans-serif' },
    { value: 'verdana', label: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
    { value: 'trebuchet', label: 'Trebuchet', stack: '"Trebuchet MS", sans-serif' },
    { value: 'courier', label: 'Courier', stack: '"Courier New", Courier, monospace' },
    { value: 'monaco', label: 'Monaco', stack: 'Monaco, "Lucida Console", monospace' },
    { value: 'comic', label: 'Comic Sans', stack: '"Comic Sans MS", cursive' }
  ];
  
  const radiusOptions = [
    { value: 'none', label: 'Sharp', css: '0' },
    { value: 'sm', label: 'Slight', css: '0.25rem' },
    { value: 'default', label: 'Default', css: '' },
    { value: 'lg', label: 'Rounded', css: '1rem' },
    { value: 'xl', label: 'Very Round', css: '1.5rem' },
    { value: 'full', label: 'Pill', css: '9999px' }
  ];
  
  // oklch values for DaisyUI compatibility
  const primaryColors = [
    { value: '', label: 'Default', hex: '' },
    { value: '0.6 0.25 250', label: 'Blue', hex: '#3b82f6' },
    { value: '0.65 0.2 145', label: 'Green', hex: '#22c55e' },
    { value: '0.55 0.25 25', label: 'Red', hex: '#ef4444' },
    { value: '0.6 0.25 300', label: 'Purple', hex: '#a855f7' },
    { value: '0.65 0.2 45', label: 'Orange', hex: '#f97316' },
    { value: '0.65 0.15 180', label: 'Teal', hex: '#14b8a6' },
    { value: '0.65 0.25 330', label: 'Pink', hex: '#ec4899' },
    { value: '0.75 0.2 90', label: 'Yellow', hex: '#eab308' }
  ];
  
  // Reactive current path
  let currentPath = $derived($page.url.pathname);
  
  // Calculate zoom level from text size (100 = 100%)
  let zoomPercent = $derived(textSize);
  
  // Build custom styles - use transform scale for true zoom
  let customStyles = $derived(() => {
    const fontDef = fonts.find(f => f.value === fontFamily);
    let styles = '';
    if (fontDef) {
      styles += `font-family: ${fontDef.stack};`;
    }
    return styles;
  });
  
  // Scale factor for transform
  let scaleFactor = $derived(textSize / 100);
  
  let cssVariables = $derived(() => {
    let vars = '';
    
    // Border radius
    const radiusDef = radiusOptions.find(r => r.value === borderRadius);
    if (radiusDef && radiusDef.css) {
      vars += `--rounded-box: ${radiusDef.css}; --rounded-btn: ${radiusDef.css}; --rounded-badge: ${radiusDef.css};`;
    }
    
    return vars;
  });
  
  // Primary color needs to be applied via style tag for proper oklch
  let primaryStyle = $derived(() => {
    if (!primaryColor) return '';
    return `[data-theme] { --p: oklch(from ${primaryColor} l c h); --pf: oklch(from ${primaryColor} calc(l - 0.1) c h); }`;
  });
  
  onMount(() => {
    // Detect device type first
    isMobile = detectMobile();
    const suffix = isMobile ? '-mobile' : '-desktop';
    
    // Load device-specific settings
    const savedTheme = localStorage.getItem('dashboard-theme' + suffix) || localStorage.getItem('dashboard-theme');
    const savedTextSize = localStorage.getItem('dashboard-text-size' + suffix) || localStorage.getItem('dashboard-text-size');
    const savedFont = localStorage.getItem('dashboard-font' + suffix) || localStorage.getItem('dashboard-font');
    const savedRadius = localStorage.getItem('dashboard-radius' + suffix) || localStorage.getItem('dashboard-radius');
    const savedPrimary = localStorage.getItem('dashboard-primary' + suffix) ?? localStorage.getItem('dashboard-primary');
    const savedName = localStorage.getItem('dashboard-name');
    
    if (savedTheme && themes.includes(savedTheme)) theme = savedTheme;
    if (savedTextSize) textSize = parseInt(savedTextSize) || 100;
    if (savedFont && fonts.some(f => f.value === savedFont)) fontFamily = savedFont;
    if (savedRadius && radiusOptions.some(r => r.value === savedRadius)) borderRadius = savedRadius;
    if (savedPrimary !== null) primaryColor = savedPrimary;
    if (savedName) dashboardName = savedName;
    
    // Apply initial font-size to html root
    document.documentElement.style.fontSize = `${textSize}%`;
    
    initialized = true;
    
    // Listen for resize to update mobile detection
    window.addEventListener('resize', () => {
      isMobile = detectMobile();
    });
  });
  
  $effect(() => {
    if (initialized && browser) {
      const suffix = isMobile ? '-mobile' : '-desktop';
      localStorage.setItem('dashboard-theme' + suffix, theme);
      localStorage.setItem('dashboard-text-size' + suffix, textSize.toString());
      localStorage.setItem('dashboard-font' + suffix, fontFamily);
      localStorage.setItem('dashboard-radius' + suffix, borderRadius);
      localStorage.setItem('dashboard-primary' + suffix, primaryColor);
      localStorage.setItem('dashboard-name', dashboardName);
      
      // Apply font-size to html root so ALL rem-based sizes scale
      document.documentElement.style.fontSize = `${textSize}%`;
    }
  });
  
  function resetSettings() {
    theme = 'lofi';
    textSize = 100;
    fontFamily = 'system';
    borderRadius = 'default';
    primaryColor = '';
    dashboardName = 'Agent Dashboard';
    document.documentElement.style.fontSize = '100%';
    // Note: This only resets the current device's settings
  }
</script>

<!-- Load Inter font + dynamic primary color -->
<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  {#if primaryColor}
    {@html `<style>[data-theme] { --p: ${primaryColor}; --pf: ${primaryColor}; --pc: 1 0 0; }</style>`}
  {/if}
</svelte:head>

<div data-theme={theme} class="min-h-screen bg-base-200" style="{customStyles()} {cssVariables()}">
  <!-- Header - Two lines for mobile -->
  <div class="bg-base-100 shadow-sm sticky top-0 z-50 rounded-b-2xl mx-auto max-w-3xl" style={cssVariables()}>
    <!-- Line 1: Title -->
    <div class="text-center py-2 border-b border-base-200">
      <span class="text-lg font-semibold">{dashboardName}</span>
    </div>
    
    <!-- Line 2: Navigation + Settings -->
    <div class="flex items-center justify-center gap-2 py-2 px-2">
      <div class="tabs tabs-boxed bg-base-200 rounded-xl p-1">
        <a 
          href="/" 
          class="tab tab-sm"
          class:tab-active={currentPath === '/'}
          title="Feed"
        >
          📰
        </a>
        <a 
          href="/todos" 
          class="tab tab-sm"
          class:tab-active={currentPath === '/todos'}
          title="Todos"
        >
          📋
        </a>
        <a 
          href="/projects" 
          class="tab tab-sm"
          class:tab-active={currentPath.startsWith('/projects')}
          title="Projects"
        >
          🗂️
        </a>
        <a 
          href="/activity" 
          class="tab tab-sm"
          class:tab-active={currentPath === '/activity'}
          title="Activity"
        >
          📜
        </a>
        <a 
          href="/chat" 
          class="tab tab-sm"
          class:tab-active={currentPath === '/chat'}
          title="Chat"
        >
          💬
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
    <div class="modal-box max-w-lg max-h-[90vh] overflow-y-auto" style="{customStyles()} {cssVariables()}">
      <div class="flex justify-between items-center mb-6">
        <h3 class="font-bold text-lg">Settings</h3>
        <p class="text-xs opacity-60 mt-1">{isMobile ? '📱 Mobile' : '🖥️ Desktop'} settings (saved separately)</p>
        <button class="btn btn-ghost btn-sm btn-square" on:click={() => showSettings = false}>✕</button>
      </div>
      
      <div class="space-y-8">
        <!-- Dashboard Name -->
        <div>
          <label class="label">
            <span class="label-text font-medium">Dashboard Name</span>
          </label>
          <input 
            type="text" 
            bind:value={dashboardName}
            placeholder="Agent Dashboard"
            class="input input-bordered w-full"
          />
        </div>
        
        <!-- Theme -->
        <div>
          <label class="label">
            <span class="label-text font-medium">Theme</span>
          </label>
          <div class="grid grid-cols-4 gap-2">
            {#each themes as t}
              <button 
                class="btn btn-xs"
                class:btn-primary={theme === t}
                class:btn-ghost={theme !== t}
                on:click={() => theme = t}
              >
                {t}
              </button>
            {/each}
          </div>
        </div>
        
        <!-- Primary Color -->
        <div>
          <label class="label">
            <span class="label-text font-medium">Accent Color</span>
          </label>
          <div class="flex flex-wrap gap-2">
            {#each primaryColors as pc}
              <button 
                class="btn btn-sm gap-1"
                class:btn-primary={primaryColor === pc.value}
                class:btn-ghost={primaryColor !== pc.value}
                on:click={() => primaryColor = pc.value}
              >
                {#if pc.hex}
                  <span class="w-3 h-3 rounded-full" style="background: {pc.hex}"></span>
                {/if}
                {pc.label}
              </button>
            {/each}
          </div>
        </div>
        
        <!-- Border Radius -->
        <div>
          <label class="label">
            <span class="label-text font-medium">Corner Roundness</span>
          </label>
          <div class="flex flex-wrap gap-2">
            {#each radiusOptions as r}
              <button 
                class="btn btn-sm"
                class:btn-primary={borderRadius === r.value}
                class:btn-ghost={borderRadius !== r.value}
                on:click={() => borderRadius = r.value}
              >
                {r.label}
              </button>
            {/each}
          </div>
        </div>
        
        <!-- Text Size Slider -->
        <div>
          <label class="label">
            <span class="label-text font-medium">Size: {textSize}%</span>
          </label>
          <input 
            type="range" 
            min="50" 
            max="150" 
            step="5"
            bind:value={textSize}
            class="range range-primary range-sm w-full"
          />
          <div class="flex justify-between text-xs opacity-50 mt-1">
            <span>50%</span>
            <span>100%</span>
            <span>150%</span>
          </div>
        </div>
        
        <!-- Font Family -->
        <div>
          <label class="label">
            <span class="label-text font-medium">Font</span>
          </label>
          <div class="grid grid-cols-3 gap-2">
            {#each fonts as font}
              <button 
                class="btn btn-sm"
                class:btn-primary={fontFamily === font.value}
                class:btn-ghost={fontFamily !== font.value}
                style="font-family: {font.stack}"
                on:click={() => fontFamily = font.value}
              >
                {font.label}
              </button>
            {/each}
          </div>
        </div>
      </div>
      
      <div class="modal-action mt-8 flex justify-between">
        <button class="btn btn-ghost btn-sm" on:click={resetSettings}>Reset to Defaults</button>
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
