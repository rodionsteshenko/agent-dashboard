<script lang="ts">
  import { onMount } from 'svelte';
  import Swipeable from '$lib/Swipeable.svelte';
  
  const REACTIONS = [
    { emoji: '👍', label: 'Good' },
    { emoji: '🤔', label: 'Interesting' },
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
  
  async function loadTiles(typeFilter?: string, mode?: string) {
    loading = true;
    let url = '/api/tiles';
    if (typeFilter && typeFilter !== 'all') {
      url += `?type=${typeFilter}&mode=${mode || 'new'}`;
    }
    const res = await fetch(url);
    tiles = await res.json();
    loading = false;
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
    await fetch(`/api/tiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read })
    });
    loadTiles();
  }
  
  async function toggleStar(id: string, starred: boolean) {
    await fetch(`/api/tiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred })
    });
    loadTiles();
  }
  
  async function archive(id: string) {
    await fetch(`/api/tiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true })
    });
    loadTiles();
  }
  
  async function togglePin(id: string, pinned: boolean) {
    await fetch(`/api/tiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned })
    });
    loadTiles();
  }
  
  async function saveForLater(id: string) {
    await fetch(`/api/tiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ savedForLater: true })
    });
    loadTiles();
  }
  
  async function toggleReaction(id: string, emoji: string, currentReactions: string[]) {
    const reactions = currentReactions.includes(emoji)
      ? currentReactions.filter(r => r !== emoji)
      : [...currentReactions, emoji];
    await fetch(`/api/tiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reactions })
    });
    loadTiles();
  }
  
  async function toggleSubtask(tile: Tile, subtaskIndex: number) {
    const subtasks = [...(tile.content.subtasks as Array<{text: string, done: boolean}>)];
    subtasks[subtaskIndex] = { ...subtasks[subtaskIndex], done: !subtasks[subtaskIndex].done };
    const content = { ...tile.content, subtasks };
    await fetch(`/api/tiles/${tile.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    loadTiles(filter, filterMode);
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
  const allTileTypes = ['note', 'short', 'image', 'article', 'song', 'quote', 'code', 'todo', 'log', 'digest'];
  
  // Which types have tiles
  $: activeTileTypes = new Set(tiles.map(t => t.type));
  
  // Count tiles per type
  $: tileCounts = tiles.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  onMount(() => loadTiles());
</script>

<svelte:head>
  <title>Agent Dashboard</title>
</svelte:head>

<!-- Filter selector -->
<div class="mb-4">
  <div class="flex items-center gap-2">
    <!-- Main dropdown -->
    <div class="dropdown">
      <button tabindex="0" class="btn btn-sm rounded-full gap-1">
        {filter === 'all' ? 'All' : filter}
        {#if filter === 'all' && tiles.length > 0}
          <span class="badge badge-xs badge-primary">{tiles.length}</span>
        {:else if filter !== 'all' && tileCounts[filter]}
          <span class="badge badge-xs badge-primary">{tileCounts[filter]}</span>
        {/if}
        <span class="text-xs">▼</span>
      </button>
      <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52 mt-1">
        <li>
          <button 
            class:active={filter === 'all'}
            on:click={() => setFilter('all')}
          >
            <span class="flex-1">All</span>
            <span class="badge badge-sm">{tiles.length}</span>
          </button>
        </li>
        <li class="menu-title text-xs opacity-50 pt-2">Categories</li>
        {#each allTileTypes as type}
          {@const count = tileCounts[type] || 0}
          <li>
            <button 
              class:active={filter === type}
              class:opacity-50={count === 0}
              on:click={() => setFilter(type)}
            >
              <span class="flex-1">{type}</span>
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
    <div class="grid grid-cols-4 gap-2 mt-3 p-3 bg-base-300 rounded-xl">
      <button 
        class="btn btn-sm"
        class:btn-primary={filter === 'all'}
        class:btn-ghost={filter !== 'all'}
        on:click={() => setFilter('all')}
      >
        All <span class="badge badge-xs">{tiles.length}</span>
      </button>
      {#each allTileTypes as type}
        {@const count = tileCounts[type] || 0}
        <button 
          class="btn btn-sm"
          class:btn-primary={filter === type}
          class:btn-ghost={filter !== type}
          class:opacity-40={count === 0 && filter !== type}
          on:click={() => setFilter(type)}
        >
          {type} <span class="badge badge-xs">{count}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<!-- Mode toggle (only shown when viewing a specific type) -->
{#if filter !== 'all'}
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
        on:swipeleft={() => archive(tile.id)}
        on:swiperight={() => saveForLater(tile.id)}
      >
      <div 
        class="card bg-base-100 shadow-md rounded-2xl border border-base-300"
        class:ring-2={tile.starred || tile.pinned}
        class:ring-warning={tile.starred}
        class:ring-primary={tile.pinned}
        class:opacity-60={tile.read}
      >
        <div class="card-body p-5">
          <!-- Header -->
          <div class="flex justify-between items-center text-sm opacity-70">
            <div class="flex gap-2 items-center">
              <div class="badge badge-ghost">{tile.type}</div>
              {#if tile.pinned}
                <div class="badge badge-primary badge-sm">📌 pinned</div>
              {/if}
            </div>
            <time>{formatDate(tile.created_at)}</time>
          </div>
          
          <!-- Content based on type -->
          <div class="mt-2">
            {#if tile.type === 'todo'}
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
                  {#each tile.content.items.slice(0, 4) as item}
                    <li class="text-sm flex items-start gap-2">
                      <span class="text-primary">→</span>
                      <span>{item.headline}</span>
                      {#if item.url}
                        <a href={item.url} target="_blank" class="link link-primary text-xs">link</a>
                      {/if}
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
              <p>{tile.content.text}</p>
              {#if tile.content.link}
                <a href={tile.content.link} target="_blank" class="link link-primary text-sm">
                  {tile.content.link}
                </a>
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
                  <h3 class="font-semibold">{tile.content.title}</h3>
                  <p class="text-sm opacity-70">{tile.content.artist}</p>
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
          </div>
          
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
                <div tabindex="0" class="dropdown-content z-[1] p-2 shadow-lg bg-base-100 rounded-box min-w-[160px]">
                  {#each REACTIONS as reaction}
                    <button 
                      class="btn btn-ghost btn-sm w-full justify-start gap-2 text-left"
                      class:btn-active={tile.reactions?.includes(reaction.emoji)}
                      on:click={() => toggleReaction(tile.id, reaction.emoji, tile.reactions || [])}
                    >
                      <span class="text-lg">{reaction.emoji}</span>
                      <span class="text-xs opacity-70">{reaction.label}</span>
                    </button>
                  {/each}
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
