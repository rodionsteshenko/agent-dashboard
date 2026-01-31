<script lang="ts">
  import { onMount } from 'svelte';
  import Swipeable from '$lib/Swipeable.svelte';
  
  const REACTIONS = [
    { emoji: '👍', label: 'Good' },
    { emoji: '🤔', label: 'Interesting' },
    { emoji: '🥱', label: 'Boring' },
    { emoji: '❌', label: 'Irrelevant' },
    { emoji: '⚠️', label: 'Incorrect' },
    { emoji: '🔍', label: 'Research' },
    { emoji: '😬', label: 'Weird' }
  ];
  
  interface Tile {
    id: string;
    type: string;
    content: Record<string, unknown>;
    source?: string;
    tags: string[];
    read: boolean;
    starred: boolean;
    archived: boolean;
    pinned: boolean;
    savedForLater: boolean;
    reactions: string[];
    created_at: string;
  }
  
  let tiles: Tile[] = [];
  let filter: string = 'all';
  let filterMode: 'new' | 'saved' | 'all' = 'new';
  let loading = true;
  let showCategoryGrid = false;
  let totalCounts: Record<string, number> = {};
  let totalAll = 0;
  let searchQuery = '';
  let searchMode = false;
  let searchTimeout: ReturnType<typeof setTimeout>;
  
  // Detail view state
  let selectedTile: Tile | null = null;
  let touchStartX = 0;
  let touchStartY = 0;
  
  function openDetail(tile: Tile) {
    selectedTile = tile;
  }
  
  function closeDetail() {
    selectedTile = null;
  }
  
  function handleModalTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
  
  function handleModalTouchEnd(e: TouchEvent) {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = Math.abs(touchEndY - touchStartY);
    
    // Require horizontal swipe (more X than Y movement) and minimum distance
    if (Math.abs(deltaX) > 80 && deltaY < 100) {
      closeDetail();
    }
  }
  
  async function loadTotalCounts() {
    // Always fetch unfiltered counts for the category selector (excluding logs)
    const res = await fetch('/api/tiles');
    const allTiles: Tile[] = await res.json();
    // Exclude log tiles from feed counts
    const feedTiles = allTiles.filter(t => t.type !== 'log');
    totalAll = feedTiles.length;
    totalCounts = feedTiles.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
  
  async function loadTiles(typeFilter?: string, mode?: string) {
    loading = true;
    let url = '/api/tiles';
    if (typeFilter && typeFilter !== 'all') {
      url += `?type=${typeFilter}&mode=${mode || 'new'}`;
    }
    const res = await fetch(url);
    let fetchedTiles: Tile[] = await res.json();
    // Exclude log tiles from feed (they go in Activity tab)
    if (!typeFilter || typeFilter === 'all') {
      fetchedTiles = fetchedTiles.filter(t => t.type !== 'log');
    }
    tiles = fetchedTiles;
    loading = false;
  }
  
  async function doSearch(query: string) {
    if (!query.trim()) {
      searchMode = false;
      loadTiles(filter, filterMode);
      return;
    }
    
    loading = true;
    searchMode = true;
    const res = await fetch(`/api/tiles?q=${encodeURIComponent(query)}`);
    tiles = await res.json();
    loading = false;
  }
  
  function handleSearchInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    searchQuery = value;
    
    // Debounce search
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      doSearch(value);
    }, 300);
  }
  
  function clearSearch() {
    searchQuery = '';
    searchMode = false;
    loadTiles(filter, filterMode);
  }
  
  function setFilter(newFilter: string) {
    filter = newFilter;
    filterMode = 'new';
    loadTiles(newFilter, 'new');
  }
  
  function setFilterMode(mode: 'new' | 'saved' | 'all') {
    filterMode = mode;
    loadTiles(filter, mode);
  }
  
  async function markRead(id: string, read: boolean) {
    // Update local state immediately
    tiles = tiles.map(t => t.id === id ? { ...t, read } : t);
    
    // Persist to API
    await fetch(`/api/tiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read })
    });
  }
  
  async function toggleStar(id: string, starred: boolean) {
    // Update local state immediately
    tiles = tiles.map(t => t.id === id ? { ...t, starred } : t);
    
    // Persist to API
    await fetch(`/api/tiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred })
    });
  }
  
  async function archive(id: string) {
    // Update local state immediately (remove from view)
    tiles = tiles.filter(t => t.id !== id);
    
    // Persist to API
    await fetch(`/api/tiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true })
    });
    loadTotalCounts();
  }
  
  async function unarchive(id: string) {
    // Update local state immediately (remove from view)
    tiles = tiles.filter(t => t.id !== id);
    
    // Persist to API
    await fetch(`/api/tiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: false, savedForLater: false })
    });
    loadTotalCounts();
  }
  
  async function togglePin(id: string, pinned: boolean) {
    // Update local state immediately
    tiles = tiles.map(t => t.id === id ? { ...t, pinned } : t);
    
    // Persist to API
    await fetch(`/api/tiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned })
    });
  }
  
  async function saveForLater(id: string) {
    // Update local state immediately (remove from "new" view)
    tiles = tiles.filter(t => t.id !== id);
    
    // Persist to API
    await fetch(`/api/tiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ savedForLater: true })
    });
    loadTotalCounts();
  }
  
  async function unsave(id: string) {
    // Update local state immediately (remove from "saved" view)
    tiles = tiles.filter(t => t.id !== id);
    
    // Persist to API
    await fetch(`/api/tiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ savedForLater: false })
    });
    loadTotalCounts();
  }
  
  async function toggleReaction(id: string, emoji: string, currentReactions: string[]) {
    const reactions = currentReactions.includes(emoji)
      ? currentReactions.filter(r => r !== emoji)
      : [...currentReactions, emoji];
    
    // Update local state immediately
    tiles = tiles.map(t => t.id === id ? { ...t, reactions } : t);
    if (selectedTile?.id === id) {
      selectedTile = { ...selectedTile, reactions };
    }
    
    // Persist to API
    await fetch(`/api/tiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reactions })
    });
  }
  
  async function toggleSubtask(tile: Tile, subtaskIndex: number) {
    const subtasks = [...(tile.content.subtasks as Array<{text: string, done: boolean}>)];
    subtasks[subtaskIndex] = { ...subtasks[subtaskIndex], done: !subtasks[subtaskIndex].done };
    const content = { ...tile.content, subtasks };
    
    // Update local state immediately
    tiles = tiles.map(t => t.id === tile.id ? { ...t, content } : t);
    
    // Persist to API
    await fetch(`/api/tiles/${tile.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
  }
  
  let showReactionsFor: string | null = null;
  
  function formatDate(dateStr: string): string {
    // SQLite stores UTC, append Z to parse correctly then display in local time
    const date = new Date(dateStr + 'Z');
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
  
  // Tiles are now filtered server-side
  $: filteredTiles = tiles;
  
  // All possible tile types (always show these)
  const allTileTypes = ['brief', 'note', 'short', 'image', 'article', 'song', 'quote', 'code', 'digest'];
  
  // Emoji mapping for tile types
  const typeEmoji: Record<string, string> = {
    'all': '📰',
    'brief': '☀️',
    'note': '📝',
    'short': '💬',
    'image': '🖼️',
    'article': '📄',
    'song': '🎵',
    'quote': '💭',
    'code': '💻',
    'digest': '📋',
    'todo': '✅',
    'log': '📜',
    'feedback': '💬'
  };
  
  // Which types have tiles
  $: activeTileTypes = new Set(tiles.map(t => t.type));
  
  // Count tiles per type
  $: tileCounts = tiles.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  onMount(() => {
    loadTotalCounts();
    loadTiles();
  });
</script>

<svelte:head>
  <title>Agent Dashboard</title>
</svelte:head>

<!-- Search bar -->
<div class="mb-4">
  <div class="relative">
    <input 
      type="text"
      placeholder="Search tiles..."
      value={searchQuery}
      on:input={handleSearchInput}
      class="input input-bordered w-full rounded-xl pl-10"
      style="font-size: 16px;"
    />
    <span class="absolute left-3 top-1/2 -translate-y-1/2 opacity-50">🔍</span>
    {#if searchQuery}
      <button 
        class="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
        on:click={clearSearch}
      >
        ✕
      </button>
    {/if}
  </div>
  {#if searchMode}
    <div class="text-sm opacity-70 mt-2">
      Found {tiles.length} result{tiles.length !== 1 ? 's' : ''} for "{searchQuery}"
      <button class="link link-primary ml-2" on:click={clearSearch}>Clear</button>
    </div>
  {/if}
</div>

<!-- Filter selector (hidden during search) -->
{#if !searchMode}
<div class="mb-4">
  <div class="flex items-center gap-2">
    <!-- Main dropdown -->
    <div class="dropdown">
      <button tabindex="0" class="btn btn-sm rounded-full gap-1">
        {typeEmoji[filter] || '📰'}
        {#if filter === 'all' && totalAll > 0}
          <span class="badge badge-xs badge-primary">{totalAll}</span>
        {:else if filter !== 'all' && totalCounts[filter]}
          <span class="badge badge-xs badge-primary">{totalCounts[filter]}</span>
        {/if}
        <span class="text-xs">▼</span>
      </button>
      <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-44 mt-1">
        <li>
          <button 
            class:active={filter === 'all'}
            on:click={() => setFilter('all')}
          >
            <span>{typeEmoji['all']}</span>
            <span class="badge badge-sm">{totalAll}</span>
          </button>
        </li>
        <div class="divider my-1"></div>
        {#each allTileTypes as type}
          {@const count = totalCounts[type] || 0}
          <li>
            <button 
              class:active={filter === type}
              class:opacity-50={count === 0}
              on:click={() => setFilter(type)}
            >
              <span>{typeEmoji[type] || '📄'}</span>
              <span class="badge badge-sm">{count}</span>
            </button>
          </li>
        {/each}
      </ul>
    </div>
    
    <!-- Expand toggle for grid view -->
    <button 
      class="btn btn-sm btn-ghost btn-square"
      on:click={() => showCategoryGrid = !showCategoryGrid}
      title={showCategoryGrid ? 'Hide categories' : 'Show all categories'}
    >
      {showCategoryGrid ? '▲' : '▼'}
    </button>
  </div>
  
  <!-- Expanded grid view -->
  {#if showCategoryGrid}
    <div class="flex flex-wrap gap-1 mt-3 p-2 bg-base-300 rounded-xl">
      <button 
        class="btn btn-sm gap-1"
        class:btn-primary={filter === 'all'}
        class:btn-ghost={filter !== 'all'}
        on:click={() => setFilter('all')}
      >
        {typeEmoji['all']}
        <span class="badge badge-xs">{totalAll}</span>
      </button>
      {#each allTileTypes as type}
        {@const count = totalCounts[type] || 0}
        <button 
          class="btn btn-sm gap-1"
          class:btn-primary={filter === type}
          class:btn-ghost={filter !== type}
          class:opacity-40={count === 0 && filter !== type}
          on:click={() => setFilter(type)}
          title={type}
        >
          {typeEmoji[type] || '📄'}
          <span class="badge badge-xs">{count}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>
{/if}

<!-- Mode toggle (only shown when viewing a specific type, and not searching) -->
{#if filter !== 'all' && !searchMode}
  <div class="flex gap-1 mb-6">
    <button 
      class="btn btn-xs"
      class:btn-primary={filterMode === 'new'}
      class:btn-ghost={filterMode !== 'new'}
      on:click={() => setFilterMode('new')}
    >
      New
    </button>
    <button 
      class="btn btn-xs"
      class:btn-primary={filterMode === 'saved'}
      class:btn-ghost={filterMode !== 'saved'}
      on:click={() => setFilterMode('saved')}
    >
      Saved
    </button>
    <button 
      class="btn btn-xs"
      class:btn-primary={filterMode === 'all'}
      class:btn-ghost={filterMode !== 'all'}
      on:click={() => setFilterMode('all')}
    >
      All
    </button>
  </div>
{/if}

{#if loading}
  <div class="flex justify-center p-8">
    <span class="loading loading-spinner loading-lg"></span>
  </div>
{:else if filteredTiles.length === 0}
  <div class="hero min-h-[50vh]">
    <div class="hero-content text-center">
      <div>
        <h2 class="text-2xl font-bold">No tiles yet</h2>
        <p class="py-4 opacity-70">I'll start posting here soon!</p>
      </div>
    </div>
  </div>
{:else}
  <div class="flex flex-col gap-5">
    {#each filteredTiles as tile (tile.id)}
      <Swipeable
        on:swipeleft={() => {
          if (tile.archived) {
            // In All mode viewing archived - restore it
            unarchive(tile.id);
          } else if (tile.savedForLater) {
            // In Saved mode - unsave it
            unsave(tile.id);
          } else {
            // In New mode - archive it
            archive(tile.id);
          }
        }}
        on:swiperight={() => {
          if (tile.archived) {
            // Archived tile - restore it
            unarchive(tile.id);
          } else if (tile.savedForLater) {
            // Already saved - archive it
            archive(tile.id);
          } else {
            // New tile - save for later
            saveForLater(tile.id);
          }
        }}
      >
      <div 
        class="card bg-base-100 shadow-md rounded-2xl border border-base-300"
        class:ring-2={tile.starred}
        class:ring-warning={tile.starred}
        class:opacity-60={tile.read}
      >
        <div class="card-body p-5">
          <!-- Header -->
          <div class="flex justify-between items-center text-sm opacity-70">
            <div class="flex gap-2 items-center">
              <div class="badge badge-ghost">{tile.type}</div>
              {#if tile.archived}
                <div class="badge badge-error badge-sm">archived</div>
              {:else if tile.savedForLater}
                <div class="badge badge-success badge-sm">saved</div>
              {/if}
            </div>
            <time>{formatDate(tile.created_at)}</time>
          </div>
          
          <!-- Content based on type (clickable for detail view) -->
          <button 
            class="mt-2 text-left w-full cursor-pointer hover:opacity-80 transition-opacity"
            on:click={() => openDetail(tile)}
          >
            {#if tile.type === 'brief'}
              <!-- Morning Brief tile - summary view -->
              <div class="flex items-start gap-3">
                <span class="text-3xl">☀️</span>
                <div class="flex-1">
                  <h3 class="font-bold text-lg">{tile.content.title || 'Good Morning'}</h3>
                  <p class="text-sm opacity-70">{tile.content.date}</p>
                  <p class="mt-2">{tile.content.summary}</p>
                  {#if tile.content.weather}
                    <div class="mt-2 text-sm flex items-center gap-2">
                      <span>🌡️ {tile.content.weather.current}</span>
                      {#if tile.content.weather.high}
                        <span class="opacity-70">H:{tile.content.weather.high}° L:{tile.content.weather.low}°</span>
                      {/if}
                    </div>
                  {/if}
                  <p class="text-xs text-primary mt-2">Tap for full details →</p>
                </div>
              </div>
              
            {:else if tile.type === 'todo'}
              <!-- Todo tiles are now activity notifications, not interactive -->
              <div class="flex items-center gap-2">
                {#if tile.content.action === 'completed'}
                  <span class="text-success text-lg">✓</span>
                {:else if tile.content.action === 'added'}
                  <span class="text-primary text-lg">+</span>
                {:else}
                  <span class="text-info text-lg">•</span>
                {/if}
                <div>
                  <span class="font-medium">{tile.content.who || tile.content.assignee || 'Someone'}</span>
                  <span class="opacity-70">
                    {#if tile.content.action === 'completed'}
                      completed
                    {:else if tile.content.action === 'added'}
                      added
                    {:else}
                      updated
                    {/if}
                  </span>
                  <span class="font-medium">"{tile.content.title}"</span>
                </div>
              </div>
              {#if tile.content.note}
                <p class="text-sm opacity-70 mt-1 ml-6">{tile.content.note}</p>
              {/if}
              <a href="/todos" class="link link-primary text-xs mt-2 inline-block">View all todos →</a>
              
            {:else if tile.type === 'digest'}
              <h3 class="card-title text-base">{tile.content.title}</h3>
              <p class="text-sm opacity-80">{tile.content.summary}</p>
              {#if tile.content.items}
                <ul class="mt-2 space-y-1">
                  {#each tile.content.items.slice(0, 5) as item}
                    <li class="text-sm flex items-start gap-2">
                      <span class="text-primary shrink-0">→</span>
                      <div>
                        {#if item.url}
                          <a href={item.url} target="_blank" class="link link-primary font-medium">{item.headline || item.title || 'Read more'}</a>
                        {:else}
                          <span class="font-medium">{item.headline || item.title}</span>
                        {/if}
                        {#if item.summary}
                          <p class="text-xs opacity-70 mt-0.5">{item.summary}</p>
                        {/if}
                      </div>
                    </li>
                  {/each}
                </ul>
              {/if}
              {#if tile.content.myTake}
                <div class="mt-3 p-3 bg-base-300 rounded-lg text-sm italic">
                  💭 {tile.content.myTake}
                </div>
              {/if}
              
            {:else if tile.type === 'log'}
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-mono text-sm">{tile.content.action}</span>
                <div 
                  class="badge"
                  class:badge-success={tile.content.status === 'completed'}
                  class:badge-error={tile.content.status === 'failed'}
                  class:badge-warning={tile.content.status === 'pending'}
                >
                  {tile.content.status}
                </div>
                {#if tile.content.duration}
                  <span class="text-xs opacity-50">{tile.content.duration}</span>
                {/if}
              </div>
              {#if tile.content.details}
                <p class="text-sm opacity-70 mt-1">{tile.content.details}</p>
              {/if}
              {#if tile.content.url}
                <a href={tile.content.url} target="_blank" class="link link-primary text-sm mt-2 inline-block">
                  View →
                </a>
              {/if}
              
            {:else if tile.type === 'note'}
              <h3 class="card-title text-base">{tile.content.title}</h3>
              <div class="prose prose-sm max-w-none mt-2 opacity-90">
                {tile.content.body}
              </div>
              
            {:else if tile.type === 'short'}
              <p>{tile.content.body || tile.content.text || ''}</p>
              {#if tile.content.source}
                <span class="text-xs opacity-50">— {tile.content.source}</span>
              {/if}
              
            {:else if tile.type === 'article'}
              <div class="flex gap-3">
                {#if tile.content.thumbnail}
                  <img 
                    src={tile.content.thumbnail} 
                    alt="" 
                    class="w-20 h-14 object-cover rounded"
                  />
                {/if}
                <div class="flex-1">
                  <h3 class="font-semibold text-sm">{tile.content.title}</h3>
                  <p class="text-xs opacity-60">{tile.content.source}</p>
                  <p class="text-sm opacity-80 mt-1 line-clamp-2">{tile.content.excerpt}</p>
                  <a href={tile.content.url} target="_blank" class="link link-primary text-xs">
                    Read more →
                  </a>
                </div>
              </div>
              
            {:else if tile.type === 'song'}
              <div class="flex gap-3">
                {#if tile.content.albumArt}
                  <img 
                    src={tile.content.albumArt} 
                    alt="{tile.content.album}" 
                    class="w-16 h-16 object-cover rounded shadow"
                  />
                {/if}
                <div class="flex-1">
                  <h3 class="font-bold text-lg">{tile.content.title}</h3>
                  <p class="text-base opacity-70">{tile.content.artist}</p>
                  {#if tile.content.album}
                    <p class="text-xs opacity-50">{tile.content.album} ({tile.content.year})</p>
                  {/if}
                  {#if tile.content.analysis}
                    <p class="text-sm mt-2 opacity-80">{tile.content.analysis}</p>
                  {/if}
                  {#if tile.content.spotifyUrl}
                    <a href={tile.content.spotifyUrl} target="_blank" class="btn btn-xs btn-primary mt-2">
                      Open in Spotify
                    </a>
                  {/if}
                </div>
              </div>
              
            {:else if tile.type === 'image'}
              <figure class="flex flex-col">
                <img 
                  src={tile.content.src} 
                  alt={tile.content.alt || ''} 
                  class="rounded-lg w-full"
                />
                {#if tile.content.caption}
                  <figcaption class="text-sm text-center opacity-70 mt-3">
                    {tile.content.caption}
                  </figcaption>
                {/if}
              </figure>
              
            {:else if tile.type === 'quote'}
              <blockquote class="border-l-4 border-primary pl-4 py-2">
                <p class="text-lg italic">"{tile.content.text}"</p>
                <footer class="text-sm opacity-70 mt-2">
                  — {tile.content.author}
                  {#if tile.content.source}
                    <cite class="opacity-50">, {tile.content.source}</cite>
                  {/if}
                </footer>
              </blockquote>
              
            {:else if tile.type === 'code'}
              {#if tile.content.title}
                <h3 class="font-semibold text-sm">{tile.content.title}</h3>
              {/if}
              {#if tile.content.description}
                <p class="text-sm opacity-70">{tile.content.description}</p>
              {/if}
              <pre class="bg-base-300 p-3 rounded-lg text-xs overflow-x-auto mt-2"><code>{tile.content.code}</code></pre>
              
            {:else if tile.type === 'feedback'}
              <div class="flex items-start gap-2">
                <span class="text-xl">💬</span>
                <div class="flex-1">
                  <p class="text-sm">{tile.content.text}</p>
                  {#if tile.content.url}
                    <p class="text-xs opacity-50 mt-1">From: {tile.content.url}</p>
                  {/if}
                  {#if tile.content.screenshot}
                    <p class="text-xs opacity-50 mt-1">📷 Screenshot attached</p>
                  {/if}
                </div>
              </div>
              
            {:else}
              <pre class="text-xs">{JSON.stringify(tile.content, null, 2)}</pre>
            {/if}
          </button>
          
          <!-- Tags -->
          {#if tile.tags.length > 0}
            <div class="flex gap-1 flex-wrap mt-2">
              {#each tile.tags as tag}
                <div class="badge badge-sm badge-outline">{tag}</div>
              {/each}
            </div>
          {/if}
          
          <!-- Reactions display -->
          {#if tile.reactions && tile.reactions.length > 0}
            <div class="flex gap-1 mt-2">
              {#each tile.reactions as reaction}
                <span class="text-lg">{reaction}</span>
              {/each}
            </div>
          {/if}
          
          <!-- Actions -->
          <div class="card-actions justify-between mt-2 pt-2 border-t border-base-300">
            <div class="flex gap-1">
              <!-- Reaction picker -->
              <div class="dropdown dropdown-top">
                <button tabindex="0" class="btn btn-ghost btn-xs">😊</button>
                <div tabindex="0" class="dropdown-content z-[1] shadow-lg bg-base-100 rounded-box p-1">
                  <ul class="menu menu-sm">
                    {#each REACTIONS as reaction}
                      <li>
                        <button 
                          class:active={tile.reactions?.includes(reaction.emoji)}
                          on:click={() => toggleReaction(tile.id, reaction.emoji, tile.reactions || [])}
                        >
                          {reaction.emoji} {reaction.label}
                        </button>
                      </li>
                    {/each}
                  </ul>
                </div>
              </div>
            </div>
            
            <div class="flex gap-1">
              <button 
                class="btn btn-ghost btn-xs"
                on:click={() => saveForLater(tile.id)}
                title="Save for later"
              >
                📥
              </button>
              <button 
                class="btn btn-ghost btn-xs"
                on:click={() => archive(tile.id)}
                title="Archive"
              >
                🗑
              </button>
            </div>
          </div>
        </div>
      </div>
      </Swipeable>
    {/each}
  </div>
{/if}

<!-- Detail Modal -->
{#if selectedTile}
  {@const tile = selectedTile}
  <div class="modal modal-open">
    <div 
      class="modal-box max-w-2xl max-h-[90vh] overflow-y-auto"
      on:touchstart={handleModalTouchStart}
      on:touchend={handleModalTouchEnd}
      role="dialog"
    >
      <!-- Header -->
      <div class="flex justify-between items-center mb-4">
        <div class="flex gap-2 items-center">
          <div class="badge badge-ghost">{tile.type}</div>
        </div>
        <div class="flex items-center gap-2">
          <time class="text-sm opacity-70">{formatDate(tile.created_at)}</time>
          <button class="btn btn-ghost btn-sm btn-square" on:click={closeDetail}>✕</button>
        </div>
      </div>
      
      <!-- Swipe hint -->
      <p class="text-xs text-center opacity-40 -mt-2 mb-2">← swipe to dismiss →</p>
      
      <!-- Full Content -->
      <div class="prose prose-sm max-w-none">
        {#if tile.type === 'brief'}
          <!-- Morning Brief - compact detail view -->
          <div class="space-y-3">
            <!-- Morning Image -->
            {#if tile.content.image}
              <div class="rounded-xl overflow-hidden -mx-2 -mt-2 mb-3">
                <img src={tile.content.image} alt="Morning" class="w-full h-48 object-cover" />
              </div>
            {/if}
            
            <div class="text-center pb-2">
              <span class="text-3xl">☀️</span>
              <h2 class="text-xl font-bold mt-1">{tile.content.title || 'Good Morning'}</h2>
              <p class="text-sm opacity-70">{tile.content.date}</p>
            </div>
            
            <!-- Musings Section -->
            {#if tile.content.musings}
              <div class="p-3 bg-primary/10 rounded-xl border-l-4 border-primary">
                <p class="text-sm italic">💭 {tile.content.musings}</p>
              </div>
            {/if}
            
            <!-- Weather Section -->
            {#if tile.content.weather}
              <div class="p-3 bg-base-200 rounded-xl">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span>🌤️</span>
                    <span class="font-bold">{tile.content.weather.current}</span>
                  </div>
                  {#if tile.content.weather.high}
                    <span class="text-sm opacity-70">H:{tile.content.weather.high}° L:{tile.content.weather.low}°</span>
                  {/if}
                </div>
              </div>
            {/if}
            
            <!-- Calendar Section - only show if has events -->
            {#if tile.content.calendar && tile.content.calendar.length > 0}
              <div class="p-3 bg-base-200 rounded-xl">
                <h3 class="font-bold text-sm flex items-center gap-2 mb-2">📅 Schedule</h3>
                <ul class="space-y-1">
                  {#each tile.content.calendar as event}
                    <li class="flex items-center gap-2 text-sm">
                      <span class="font-mono opacity-70">{event.time}</span>
                      <span>{event.title}</span>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
            
            <!-- Todos Section -->
            {#if tile.content.todos}
              {@const hasOverdue = tile.content.todos.overdue?.length > 0}
              {@const hasToday = tile.content.todos.dueToday?.length > 0}
              {@const hasUpcoming = tile.content.todos.upcoming?.length > 0}
              {@const hasUndated = tile.content.todos.undated?.length > 0}
              {@const hasTodos = hasOverdue || hasToday || hasUpcoming || hasUndated}
              
              <div class="p-3 bg-base-200 rounded-xl">
                <h3 class="font-bold text-sm flex items-center gap-2 mb-2">✅ Todos</h3>
                
                {#if hasOverdue}
                  <div class="mb-2">
                    <p class="text-xs font-medium text-error">⚠️ Overdue</p>
                    <ul class="ml-4 list-disc list-inside">
                      {#each tile.content.todos.overdue as todo}
                        <li class="text-sm">{todo.title}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}
                
                {#if hasToday}
                  <div class="mb-2">
                    <p class="text-xs font-medium text-warning">📌 Due Today</p>
                    <ul class="ml-4 list-disc list-inside">
                      {#each tile.content.todos.dueToday as todo}
                        <li class="text-sm">{todo.title}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}
                
                {#if hasUndated}
                  <div class="mb-2">
                    <p class="text-xs font-medium opacity-70">📋 Open Tasks</p>
                    <ul class="ml-4 list-disc list-inside">
                      {#each tile.content.todos.undated as todo}
                        <li class="text-sm opacity-80">{todo.title}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}
                
                {#if hasUpcoming}
                  <div>
                    <p class="text-xs font-medium opacity-50">🔜 Coming Up</p>
                    <ul class="ml-4 list-disc list-inside">
                      {#each tile.content.todos.upcoming as todo}
                        <li class="text-sm opacity-60">{todo.title} <span class="text-xs">({todo.due_date})</span></li>
                      {/each}
                    </ul>
                  </div>
                {/if}
                
                {#if !hasTodos}
                  <p class="text-sm opacity-70">All clear! 🎉</p>
                {/if}
                
                <a href="/todos" class="link link-primary text-xs mt-2 inline-block">View all →</a>
              </div>
            {/if}
            
            <!-- Snippets Section - news/articles from digests -->
            {#if tile.content.snippets && tile.content.snippets.length > 0}
              <div class="p-3 bg-base-200 rounded-xl">
                <h3 class="font-bold text-sm flex items-center gap-2 mb-2">📰 Headlines</h3>
                <ul class="space-y-2">
                  {#each tile.content.snippets.slice(0, 5) as item}
                    <li class="text-sm">
                      {#if item.url}
                        <a href={item.url} target="_blank" class="link link-primary font-medium">{item.title}</a>
                      {:else}
                        <span class="font-medium">{item.title}</span>
                      {/if}
                      {#if item.source}
                        <span class="text-xs opacity-50 ml-1">({item.source})</span>
                      {/if}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
            
            <!-- Highlights Section - only show if has items -->
            {#if tile.content.highlights && tile.content.highlights.length > 0}
              <div class="p-3 bg-base-200 rounded-xl">
                <h3 class="font-bold text-sm flex items-center gap-2 mb-2">✨ Highlights</h3>
                <ul class="space-y-1">
                  {#each tile.content.highlights as item}
                    <li class="text-sm">• {item.title}</li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
          
        {:else if tile.type === 'todo'}
          <div class="flex items-center gap-2 mb-2">
            {#if tile.content.action === 'completed'}
              <span class="text-success text-2xl">✓</span>
            {:else if tile.content.action === 'added'}
              <span class="text-primary text-2xl">+</span>
            {:else}
              <span class="text-info text-2xl">•</span>
            {/if}
            <div>
              <span class="font-medium text-lg">{tile.content.who || tile.content.assignee || 'Someone'}</span>
              <span class="opacity-70">
                {#if tile.content.action === 'completed'}completed{:else if tile.content.action === 'added'}added{:else}updated{/if}
              </span>
              <span class="font-medium text-lg">"{tile.content.title}"</span>
            </div>
          </div>
          {#if tile.content.note}
            <p class="opacity-80">{tile.content.note}</p>
          {/if}
          <a href="/todos" class="btn btn-primary btn-sm mt-4">View all todos →</a>
          
        {:else if tile.type === 'digest'}
          <h2 class="text-xl font-bold mb-2">{tile.content.title}</h2>
          {#if tile.content.summary}
            <p class="opacity-80 mb-4">{tile.content.summary}</p>
          {/if}
          {#if tile.content.items}
            <ul class="space-y-3 not-prose">
              {#each tile.content.items as item}
                <li class="p-3 bg-base-200 rounded-lg">
                  {#if item.url}
                    <a href={item.url} target="_blank" class="font-medium link link-primary">{item.title || item.headline}</a>
                  {:else}
                    <div class="font-medium">{item.title || item.headline}</div>
                  {/if}
                  {#if item.summary || item.description}
                    <p class="text-sm opacity-70 mt-1">{item.summary || item.description}</p>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
          {#if tile.content.myTake}
            <div class="mt-4 p-4 bg-base-300 rounded-lg">
              <p class="italic">💭 {tile.content.myTake}</p>
            </div>
          {/if}
          
        {:else if tile.type === 'log'}
          <div class="flex items-center gap-3 mb-4">
            <span class="font-mono text-lg">{tile.content.action}</span>
            <div 
              class="badge badge-lg"
              class:badge-success={tile.content.status === 'completed'}
              class:badge-error={tile.content.status === 'failed'}
              class:badge-warning={tile.content.status === 'pending'}
            >
              {tile.content.status}
            </div>
            {#if tile.content.duration}
              <span class="text-sm opacity-50">{tile.content.duration}</span>
            {/if}
          </div>
          {#if tile.content.details}
            <p class="opacity-80">{tile.content.details}</p>
          {/if}
          {#if tile.content.url}
            <a href={tile.content.url} target="_blank" class="btn btn-primary btn-sm mt-4">
              View →
            </a>
          {/if}
          
        {:else if tile.type === 'note'}
          <h2 class="text-xl font-bold mb-4">{tile.content.title}</h2>
          <div class="whitespace-pre-wrap">{tile.content.body}</div>
          
        {:else if tile.type === 'short'}
          <p class="text-lg">{tile.content.body || tile.content.text || ''}</p>
          {#if tile.content.source}
            <p class="text-sm opacity-60 mt-2">Source: {tile.content.source}</p>
          {/if}
          {#if tile.content.url || tile.content.link}
            <a href={tile.content.url || tile.content.link} target="_blank" class="link link-primary mt-2 block">
              View source →
            </a>
          {/if}
          
        {:else if tile.type === 'article'}
          <div class="flex flex-col gap-4 not-prose">
            {#if tile.content.thumbnail}
              <img 
                src={tile.content.thumbnail} 
                alt="" 
                class="w-full max-h-64 object-cover rounded-lg"
              />
            {/if}
            <h2 class="text-xl font-bold">{tile.content.title}</h2>
            <p class="text-sm opacity-60">{tile.content.source}</p>
            <p class="opacity-80">{tile.content.excerpt}</p>
            <a href={tile.content.url} target="_blank" class="btn btn-primary">
              Read full article →
            </a>
          </div>
          
        {:else if tile.type === 'song'}
          <div class="flex flex-col gap-4">
            {#if tile.content.albumArt}
              <img 
                src={tile.content.albumArt} 
                alt={tile.content.album} 
                class="w-48 h-48 object-cover rounded-lg shadow-lg mx-auto"
              />
            {/if}
            <div class="text-center">
              <h2 class="text-xl font-bold">{tile.content.title}</h2>
              <p class="text-lg opacity-70">{tile.content.artist}</p>
              {#if tile.content.album}
                <p class="opacity-50">{tile.content.album} ({tile.content.year})</p>
              {/if}
            </div>
            {#if tile.content.analysis}
              <p class="opacity-80 mt-4">{tile.content.analysis}</p>
            {/if}
            {#if tile.content.spotifyUrl}
              <a href={tile.content.spotifyUrl} target="_blank" class="btn btn-primary mx-auto">
                Open in Spotify
              </a>
            {/if}
          </div>
          
        {:else if tile.type === 'image'}
          <figure class="flex flex-col items-center">
            <img 
              src={tile.content.src} 
              alt={tile.content.alt || ''} 
              class="rounded-lg max-w-full"
            />
            {#if tile.content.caption}
              <figcaption class="text-center opacity-70 mt-4">
                {tile.content.caption}
              </figcaption>
            {/if}
          </figure>
          
        {:else if tile.type === 'quote'}
          <blockquote class="border-l-4 border-primary pl-6 py-4">
            <p class="text-2xl italic">"{tile.content.text}"</p>
            <footer class="text-lg opacity-70 mt-4">
              — {tile.content.author}
              {#if tile.content.source}
                <cite class="opacity-50">, {tile.content.source}</cite>
              {/if}
            </footer>
          </blockquote>
          
        {:else if tile.type === 'code'}
          {#if tile.content.title}
            <h2 class="text-xl font-bold mb-2">{tile.content.title}</h2>
          {/if}
          {#if tile.content.description}
            <p class="opacity-70 mb-4">{tile.content.description}</p>
          {/if}
          <pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>{tile.content.code}</code></pre>
          
        {:else if tile.type === 'feedback'}
          <div class="flex items-start gap-3">
            <span class="text-3xl">💬</span>
            <div class="flex-1">
              <h3 class="font-bold mb-2">{tile.content.title || 'Feedback'}</h3>
              <p>{tile.content.body || tile.content.text}</p>
              {#if tile.content.url}
                <p class="text-sm opacity-50 mt-2">From: {tile.content.url}</p>
              {/if}
            </div>
          </div>
          
        {:else}
          <pre class="text-sm bg-base-300 p-4 rounded-lg overflow-x-auto">{JSON.stringify(tile.content, null, 2)}</pre>
        {/if}
      </div>
      
      <!-- Tags -->
      {#if tile.tags.length > 0}
        <div class="flex gap-2 flex-wrap mt-6 pt-4 border-t border-base-300">
          {#each tile.tags as tag}
            <div class="badge badge-outline">{tag}</div>
          {/each}
        </div>
      {/if}
      
      <!-- Actions -->
      <div class="modal-action mt-6 pt-4 border-t border-base-300">
        <div class="flex gap-2 flex-1">
          <!-- Reactions - inline buttons with labels -->
          <div class="flex flex-wrap gap-2">
            {#each REACTIONS as reaction}
              <button 
                class="btn btn-sm gap-1"
                class:btn-primary={tile.reactions?.includes(reaction.emoji)}
                class:btn-ghost={!tile.reactions?.includes(reaction.emoji)}
                on:click={() => { toggleReaction(tile.id, reaction.emoji, tile.reactions || []); }}
              >
                {reaction.emoji} <span class="text-xs">{reaction.label}</span>
              </button>
            {/each}
          </div>
          
          {#if tile.reactions && tile.reactions.length > 0}
            <div class="flex items-center gap-1">
              {#each tile.reactions as r}
                <span class="text-xl">{r}</span>
              {/each}
            </div>
          {/if}
        </div>
        
        <button 
          class="btn btn-ghost"
          on:click={() => { saveForLater(tile.id); closeDetail(); }}
        >
          📥 Save
        </button>
        <button 
          class="btn btn-ghost"
          on:click={() => { archive(tile.id); closeDetail(); }}
        >
          🗑 Archive
        </button>
      </div>
    </div>
    <div 
      class="modal-backdrop bg-black/50" 
      on:click={closeDetail} 
      on:keydown={(e) => e.key === 'Escape' && closeDetail()}
      role="button" 
      tabindex="0"
    ></div>
  </div>
{/if}
