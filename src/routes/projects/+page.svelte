<script lang="ts">
  import { onMount } from 'svelte';
  
  interface Project {
    id: string;
    name: string;
    description: string | null;
    status: string;
    created_at: string;
  }
  
  let projects: Project[] = [];
  let loading = true;
  let showNewForm = false;
  let newName = '';
  let newDescription = '';
  
  async function loadProjects() {
    loading = true;
    const res = await fetch('/api/projects');
    projects = await res.json();
    loading = false;
  }
  
  async function createProject() {
    if (!newName.trim()) return;
    
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), description: newDescription.trim() || null })
    });
    
    newName = '';
    newDescription = '';
    showNewForm = false;
    loadProjects();
  }
  
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'Z');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  
  onMount(loadProjects);
</script>

<svelte:head>
  <title>Projects | Agent Dashboard</title>
</svelte:head>

<div class="flex items-center justify-between mb-6">
  <h1 class="text-2xl font-bold">Projects</h1>
  <button class="btn btn-primary btn-sm" on:click={() => showNewForm = !showNewForm}>
    {showNewForm ? 'Cancel' : '+ New Project'}
  </button>
</div>

{#if showNewForm}
  <div class="card bg-base-100 shadow-md rounded-2xl mb-6">
    <div class="card-body p-4">
      <form on:submit|preventDefault={createProject} class="space-y-3">
        <input 
          type="text" 
          bind:value={newName}
          placeholder="Project name"
          class="input input-bordered w-full rounded-xl"
        />
        <textarea 
          bind:value={newDescription}
          placeholder="Description (optional)"
          class="textarea textarea-bordered w-full rounded-xl"
          rows="2"
        ></textarea>
        <button type="submit" class="btn btn-primary rounded-xl">Create Project</button>
      </form>
    </div>
  </div>
{/if}

{#if loading}
  <div class="flex justify-center p-8">
    <span class="loading loading-spinner loading-lg"></span>
  </div>
{:else if projects.length === 0}
  <div class="hero min-h-[30vh]">
    <div class="hero-content text-center">
      <div>
        <h2 class="text-xl font-bold opacity-70">No projects yet</h2>
        <p class="py-2 opacity-50">Create one to get started!</p>
      </div>
    </div>
  </div>
{:else}
  <div class="flex flex-col gap-3">
    {#each projects as project (project.id)}
      <a 
        href="/projects/{project.id}"
        class="card bg-base-100 shadow-sm rounded-xl hover:shadow-md transition-shadow"
      >
        <div class="card-body p-4">
          <div class="flex justify-between items-start">
            <div>
              <h2 class="font-bold text-lg">{project.name}</h2>
              {#if project.description}
                <p class="text-sm opacity-70 mt-1">{project.description}</p>
              {/if}
            </div>
            <div class="badge badge-ghost">{project.status}</div>
          </div>
          <div class="text-xs opacity-50 mt-2">
            Created {formatDate(project.created_at)}
          </div>
        </div>
      </a>
    {/each}
  </div>
{/if}
