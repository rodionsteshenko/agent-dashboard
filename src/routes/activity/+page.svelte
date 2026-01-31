<script lang="ts">
  import { onMount } from 'svelte';
  
  interface LogEntry {
    id: string;
    type: string;
    content: {
      action?: string;
      status?: string;
      details?: string;
      duration?: string;
      url?: string;
    };
    tags: string[];
    created_at: string;
  }
  
  let logs: LogEntry[] = [];
  let loading = true;
  let groupByDate = true;
  
  async function loadLogs() {
    loading = true;
    const res = await fetch('/api/tiles?type=log');
    logs = await res.json();
    loading = false;
  }
  
  onMount(() => {
    loadLogs();
  });
  
  function formatTime(dateStr: string): string {
    const date = new Date(dateStr + 'Z');
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'Z');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  }
  
  function getDateKey(dateStr: string): string {
    const date = new Date(dateStr + 'Z');
    return date.toDateString();
  }
  
  // Group logs by date
  $: groupedLogs = logs.reduce((acc, log) => {
    const key = getDateKey(log.created_at);
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {} as Record<string, LogEntry[]>);
  
  $: dateKeys = Object.keys(groupedLogs).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );
  
  function getStatusColor(status?: string): string {
    switch(status) {
      case 'completed': return 'badge-success';
      case 'failed': return 'badge-error';
      case 'pending': return 'badge-warning';
      case 'started': return 'badge-info';
      default: return 'badge-ghost';
    }
  }
  
  function getStatusEmoji(status?: string): string {
    switch(status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'pending': return '⏳';
      case 'started': return '🚀';
      default: return '📝';
    }
  }
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <h1 class="text-xl font-bold">Activity Log</h1>
    <span class="text-sm opacity-60">{logs.length} entries</span>
  </div>
  
  {#if loading}
    <div class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else if logs.length === 0}
    <div class="card bg-base-100 shadow-sm p-8 text-center">
      <p class="text-lg opacity-70">No activity yet</p>
      <p class="text-sm opacity-50 mt-2">Coby's actions will appear here</p>
    </div>
  {:else}
    {#each dateKeys as dateKey}
      <div class="space-y-2">
        <h2 class="text-sm font-semibold opacity-70 sticky top-20 bg-base-200 py-2 z-10">
          {formatDate(groupedLogs[dateKey][0].created_at)}
        </h2>
        
        <div class="space-y-2">
          {#each groupedLogs[dateKey] as log}
            <div class="card bg-base-100 shadow-sm p-3">
              <div class="flex items-start gap-3">
                <span class="text-lg shrink-0">{getStatusEmoji(log.content.status)}</span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-medium">{log.content.action || 'Activity'}</span>
                    {#if log.content.status}
                      <span class="badge badge-sm {getStatusColor(log.content.status)}">
                        {log.content.status}
                      </span>
                    {/if}
                    {#if log.content.duration}
                      <span class="text-xs opacity-50">{log.content.duration}</span>
                    {/if}
                  </div>
                  {#if log.content.details}
                    <p class="text-sm opacity-70 mt-1">{log.content.details}</p>
                  {/if}
                  {#if log.content.url}
                    <a href={log.content.url} target="_blank" class="link link-primary text-sm">
                      View →
                    </a>
                  {/if}
                  {#if log.tags && log.tags.length > 0}
                    <div class="flex gap-1 mt-2 flex-wrap">
                      {#each log.tags as tag}
                        <span class="badge badge-sm badge-outline">{tag}</span>
                      {/each}
                    </div>
                  {/if}
                </div>
                <span class="text-xs opacity-50 shrink-0">{formatTime(log.created_at)}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>
