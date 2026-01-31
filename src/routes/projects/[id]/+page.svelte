<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { marked } from 'marked';
  
  interface ProjectItem {
    id: string;
    title: string;
    description: string | null;
    acceptance_criteria: string[];
    status: 'backlog' | 'in-progress' | 'complete';
    priority: number;
    assignee: string;
    started_at: string | null;
    completed_at: string | null;
  }
  
  interface ProjectDoc {
    id: string;
    doc_type: string;
    title: string;
    content: string;
    updated_at: string;
  }
  
  interface Todo {
    id: string;
    title: string;
    assignee: string;
    completed: boolean;
    due_date: string | null;
  }
  
  interface Project {
    id: string;
    name: string;
    description: string | null;
    status: string;
    items: ProjectItem[];
    docs: ProjectDoc[];
  }
  
  let project: Project | null = null;
  let loading = true;
  let activeTab: 'board' | 'docs' = 'board';
  let selectedItem: ProjectItem | null = null;
  let linkedTodos: Todo[] = [];
  let loadingTodos = false;
  let newTodoTitle = '';
  let editingItem = false;
  let editTitle = '';
  let editDescription = '';
  let editCriteria = '';
  let editAssignee = 'coby';
  let selectedDoc: ProjectDoc | null = null;
  let editingDoc = false;
  let docContent = '';
  
  // New item form
  let showNewItem = false;
  let newTitle = '';
  let newDescription = '';
  let newCriteria = '';
  let newAssignee = 'coby';
  
  $: projectId = $page.params.id;
  
  async function loadProject() {
    loading = true;
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) {
      project = await res.json();
    }
    loading = false;
  }
  
  async function createItem() {
    if (!newTitle.trim()) return;
    
    const criteria = newCriteria.split('\n').filter(c => c.trim());
    
    await fetch(`/api/projects/${projectId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        acceptance_criteria: criteria,
        assignee: newAssignee
      })
    });
    
    newTitle = '';
    newDescription = '';
    newCriteria = '';
    showNewItem = false;
    loadProject();
  }
  
  async function updateItemStatus(itemId: string, status: string) {
    await fetch(`/api/projects/${projectId}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    loadProject();
    if (selectedItem?.id === itemId) {
      selectedItem = null;
    }
  }
  
  async function deleteItem(itemId: string) {
    await fetch(`/api/projects/${projectId}/items/${itemId}`, { method: 'DELETE' });
    selectedItem = null;
    loadProject();
  }
  
  async function selectItem(item: ProjectItem) {
    selectedItem = item;
    linkedTodos = [];
    loadingTodos = true;
    
    const res = await fetch(`/api/todos?project_item_id=${item.id}&completed=true`);
    if (res.ok) {
      linkedTodos = await res.json();
    }
    loadingTodos = false;
  }
  
  async function addLinkedTodo() {
    if (!selectedItem || !newTodoTitle.trim()) return;
    
    await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTodoTitle.trim(),
        project_item_id: selectedItem.id
      })
    });
    
    newTodoTitle = '';
    // Reload linked todos
    const res = await fetch(`/api/todos?project_item_id=${selectedItem.id}&completed=true`);
    if (res.ok) {
      linkedTodos = await res.json();
    }
  }
  
  async function toggleTodo(todoId: string, completed: boolean) {
    await fetch(`/api/todos/${todoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !completed })
    });
    
    // Reload linked todos
    if (selectedItem) {
      const res = await fetch(`/api/todos?project_item_id=${selectedItem.id}&completed=true`);
      if (res.ok) {
        linkedTodos = await res.json();
      }
    }
  }
  
  function startEditItem() {
    if (!selectedItem) return;
    editTitle = selectedItem.title;
    editDescription = selectedItem.description || '';
    editCriteria = selectedItem.acceptance_criteria.join('\n');
    editAssignee = selectedItem.assignee;
    editingItem = true;
  }
  
  function cancelEditItem() {
    editingItem = false;
  }
  
  async function saveEditItem() {
    if (!selectedItem || !editTitle.trim()) return;
    
    const criteria = editCriteria.split('\n').filter(c => c.trim());
    
    await fetch(`/api/projects/${projectId}/items/${selectedItem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        acceptance_criteria: criteria,
        assignee: editAssignee
      })
    });
    
    editingItem = false;
    selectedItem = null;
    loadProject();
  }
  
  async function saveDoc() {
    if (!selectedDoc) return;
    
    await fetch(`/api/projects/${projectId}/docs/${selectedDoc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: docContent })
    });
    
    editingDoc = false;
    loadProject();
  }
  
  function openDoc(doc: ProjectDoc) {
    selectedDoc = doc;
    docContent = doc.content;
    editingDoc = false;
  }
  
  function getItemsByStatus(status: string): ProjectItem[] {
    if (!project) return [];
    return project.items
      .filter(i => i.status === status)
      .sort((a, b) => a.priority - b.priority);
  }
  
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'Z');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  onMount(loadProject);
</script>

<svelte:head>
  <title>{project?.name || 'Project'} | Agent Dashboard</title>
</svelte:head>

{#if loading}
  <div class="flex justify-center p-8">
    <span class="loading loading-spinner loading-lg"></span>
  </div>
{:else if !project}
  <div class="hero min-h-[30vh]">
    <div class="hero-content text-center">
      <div>
        <h2 class="text-xl font-bold">Project not found</h2>
        <a href="/projects" class="btn btn-primary mt-4">Back to Projects</a>
      </div>
    </div>
  </div>
{:else}
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <div>
      <h1 class="text-2xl font-bold">{project.name}</h1>
      {#if project.description}
        <p class="text-sm opacity-70">{project.description}</p>
      {/if}
    </div>
  </div>
  
  <!-- Tabs -->
  <div class="tabs tabs-boxed bg-base-200 rounded-xl p-1 mb-4 w-fit">
    <button 
      class="tab tab-sm"
      class:tab-active={activeTab === 'board'}
      on:click={() => activeTab = 'board'}
    >
      📋 Board
    </button>
    <button 
      class="tab tab-sm"
      class:tab-active={activeTab === 'docs'}
      on:click={() => activeTab = 'docs'}
    >
      📄 Docs
    </button>
  </div>
  
  {#if activeTab === 'board'}
    <!-- Add Item Button -->
    <button 
      class="btn btn-sm btn-outline mb-4"
      on:click={() => showNewItem = !showNewItem}
    >
      {showNewItem ? 'Cancel' : '+ Add Item'}
    </button>
    
    {#if showNewItem}
      <div class="card bg-base-100 shadow-md rounded-xl mb-4">
        <div class="card-body p-4">
          <form on:submit|preventDefault={createItem} class="space-y-3">
            <input 
              type="text" 
              bind:value={newTitle}
              placeholder="Item title"
              class="input input-bordered w-full rounded-xl"
            />
            <textarea 
              bind:value={newDescription}
              placeholder="Description"
              class="textarea textarea-bordered w-full rounded-xl"
              rows="2"
            ></textarea>
            <textarea 
              bind:value={newCriteria}
              placeholder="Acceptance criteria (one per line)"
              class="textarea textarea-bordered w-full rounded-xl text-sm"
              rows="3"
            ></textarea>
            <div class="flex gap-2">
              <select bind:value={newAssignee} class="select select-bordered rounded-xl">
                <option value="coby">Coby</option>
                <option value="rodion">Rodion</option>
              </select>
              <button type="submit" class="btn btn-primary rounded-xl">Add Item</button>
            </div>
          </form>
        </div>
      </div>
    {/if}
    
    <!-- Kanban Board -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Backlog -->
      <div class="bg-base-200 rounded-xl p-3">
        <h3 class="font-bold text-sm mb-3 flex items-center gap-2">
          📥 Backlog
          <span class="badge badge-sm">{getItemsByStatus('backlog').length}</span>
        </h3>
        <div class="space-y-2">
          {#each getItemsByStatus('backlog') as item (item.id)}
            <button 
              class="card bg-base-100 shadow-sm rounded-lg w-full text-left hover:shadow-md transition-shadow"
              on:click={() => selectItem(item)}
            >
              <div class="card-body p-3">
                <div class="font-medium text-sm">{item.title}</div>
                <div class="flex gap-1 mt-1">
                  <span class="badge badge-xs badge-ghost">{item.assignee}</span>
                  <span class="badge badge-xs badge-outline">P{item.priority}</span>
                </div>
              </div>
            </button>
          {/each}
        </div>
      </div>
      
      <!-- In Progress -->
      <div class="bg-warning/10 rounded-xl p-3">
        <h3 class="font-bold text-sm mb-3 flex items-center gap-2">
          🔄 In Progress
          <span class="badge badge-sm badge-warning">{getItemsByStatus('in-progress').length}</span>
        </h3>
        <div class="space-y-2">
          {#each getItemsByStatus('in-progress') as item (item.id)}
            <button 
              class="card bg-base-100 shadow-sm rounded-lg w-full text-left hover:shadow-md transition-shadow border-l-4 border-warning"
              on:click={() => selectItem(item)}
            >
              <div class="card-body p-3">
                <div class="font-medium text-sm">{item.title}</div>
                <div class="flex gap-1 mt-1">
                  <span class="badge badge-xs badge-ghost">{item.assignee}</span>
                  {#if item.started_at}
                    <span class="text-xs opacity-50">Started {formatDate(item.started_at)}</span>
                  {/if}
                </div>
              </div>
            </button>
          {/each}
        </div>
      </div>
      
      <!-- Complete -->
      <div class="bg-success/10 rounded-xl p-3">
        <h3 class="font-bold text-sm mb-3 flex items-center gap-2">
          ✅ Complete
          <span class="badge badge-sm badge-success">{getItemsByStatus('complete').length}</span>
        </h3>
        <div class="space-y-2">
          {#each getItemsByStatus('complete') as item (item.id)}
            <button 
              class="card bg-base-100 shadow-sm rounded-lg w-full text-left opacity-70"
              on:click={() => selectItem(item)}
            >
              <div class="card-body p-3">
                <div class="font-medium text-sm line-through">{item.title}</div>
                <div class="flex gap-1 mt-1">
                  <span class="badge badge-xs badge-ghost">{item.assignee}</span>
                  {#if item.completed_at}
                    <span class="text-xs opacity-50">Done {formatDate(item.completed_at)}</span>
                  {/if}
                </div>
              </div>
            </button>
          {/each}
        </div>
      </div>
    </div>
  {:else}
    <!-- Docs Tab -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="space-y-2">
        {#each project.docs as doc (doc.id)}
          <button 
            class="btn btn-ghost btn-sm w-full justify-start"
            class:btn-active={selectedDoc?.id === doc.id}
            on:click={() => openDoc(doc)}
          >
            {#if doc.doc_type === 'features'}📝{:else if doc.doc_type === 'technical'}⚙️{:else if doc.doc_type === 'progress'}📊{:else}📄{/if}
            {doc.title}
          </button>
        {/each}
      </div>
      
      <div class="md:col-span-3">
        {#if selectedDoc}
          <div class="card bg-base-100 shadow-md rounded-xl">
            <div class="card-body">
              <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-lg">{selectedDoc.title}</h3>
                <button 
                  class="btn btn-sm btn-ghost"
                  on:click={() => editingDoc = !editingDoc}
                >
                  {editingDoc ? 'Cancel' : '✏️ Edit'}
                </button>
              </div>
              
              {#if editingDoc}
                <textarea 
                  bind:value={docContent}
                  class="textarea textarea-bordered w-full font-mono text-sm"
                  rows="20"
                ></textarea>
                <button class="btn btn-primary mt-4" on:click={saveDoc}>Save</button>
              {:else if selectedDoc.content}
                <div class="prose prose-sm max-w-none">
                  {@html marked(selectedDoc.content)}
                </div>
              {:else}
                <p class="opacity-50 italic">No content yet. Click Edit to add content.</p>
              {/if}
            </div>
          </div>
        {:else}
          <div class="text-center opacity-50 py-8">
            Select a document to view
          </div>
        {/if}
      </div>
    </div>
  {/if}
{/if}

<!-- Item Detail Modal -->
{#if selectedItem}
  <div class="modal modal-open">
    <div class="modal-box">
      {#if editingItem}
        <!-- Edit Mode -->
        <h3 class="font-bold text-lg mb-4">Edit Item</h3>
        <form on:submit|preventDefault={saveEditItem} class="space-y-3">
          <input 
            type="text" 
            bind:value={editTitle}
            placeholder="Item title"
            class="input input-bordered w-full rounded-xl"
          />
          <textarea 
            bind:value={editDescription}
            placeholder="Description"
            class="textarea textarea-bordered w-full rounded-xl"
            rows="2"
          ></textarea>
          <textarea 
            bind:value={editCriteria}
            placeholder="Acceptance criteria (one per line)"
            class="textarea textarea-bordered w-full rounded-xl text-sm"
            rows="3"
          ></textarea>
          <select bind:value={editAssignee} class="select select-bordered rounded-xl">
            <option value="coby">Coby</option>
            <option value="rodion">Rodion</option>
          </select>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" on:click={cancelEditItem}>Cancel</button>
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      {:else}
        <!-- View Mode -->
        <div class="flex justify-between items-start">
          <h3 class="font-bold text-lg">{selectedItem.title}</h3>
          <button class="btn btn-ghost btn-sm" on:click={startEditItem}>✏️ Edit</button>
        </div>
        
        <div class="py-4 space-y-4">
          {#if selectedItem.description}
            <p class="opacity-80">{selectedItem.description}</p>
          {/if}
          
          {#if selectedItem.acceptance_criteria.length > 0}
            <div>
              <h4 class="font-medium text-sm mb-2">Acceptance Criteria</h4>
              <ul class="list-disc list-inside space-y-1 text-sm opacity-80">
                {#each selectedItem.acceptance_criteria as criterion}
                  <li>{criterion}</li>
                {/each}
              </ul>
            </div>
          {/if}
          
          <div class="flex gap-2 flex-wrap text-sm">
            <span class="badge badge-ghost">{selectedItem.assignee}</span>
            <span class="badge badge-outline">Priority {selectedItem.priority}</span>
            <span class="badge" class:badge-warning={selectedItem.status === 'in-progress'} class:badge-success={selectedItem.status === 'complete'}>
              {selectedItem.status}
            </span>
          </div>
          
          <!-- Linked Todos -->
          <div class="border-t pt-4 mt-2">
            <h4 class="font-medium text-sm mb-2">Linked Todos</h4>
            {#if loadingTodos}
              <span class="loading loading-spinner loading-sm"></span>
            {:else}
              <ul class="space-y-1 mb-2">
                {#each linkedTodos as todo (todo.id)}
                  <li class="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={todo.completed}
                      on:change={() => toggleTodo(todo.id, todo.completed)}
                      class="checkbox checkbox-xs"
                    />
                    <span class:line-through={todo.completed} class:opacity-50={todo.completed}>
                      {todo.title}
                    </span>
                  </li>
                {/each}
              </ul>
              <form on:submit|preventDefault={addLinkedTodo} class="flex gap-2">
                <input 
                  type="text" 
                  bind:value={newTodoTitle}
                  placeholder="Add a todo..."
                  class="input input-bordered input-sm flex-1 rounded-lg"
                />
                <button type="submit" class="btn btn-sm btn-ghost">+</button>
              </form>
            {/if}
          </div>
        </div>
        
        <div class="modal-action flex-wrap gap-2">
          {#if selectedItem.status === 'backlog'}
            <button class="btn btn-warning" on:click={() => updateItemStatus(selectedItem.id, 'in-progress')}>
              ▶️ Start
            </button>
          {:else if selectedItem.status === 'in-progress'}
            <button class="btn btn-success" on:click={() => updateItemStatus(selectedItem.id, 'complete')}>
              ✅ Complete
            </button>
            <button class="btn btn-ghost" on:click={() => updateItemStatus(selectedItem.id, 'backlog')}>
              ↩️ Back to Backlog
            </button>
          {:else}
            <button class="btn btn-ghost" on:click={() => updateItemStatus(selectedItem.id, 'backlog')}>
              ↩️ Reopen
            </button>
          {/if}
          
          <div class="flex-1"></div>
          
          <button class="btn btn-error btn-outline btn-sm" on:click={() => deleteItem(selectedItem.id)}>
            Delete
          </button>
          <button class="btn btn-ghost" on:click={() => { selectedItem = null; editingItem = false; }}>Close</button>
        </div>
      {/if}
    </div>
    <div class="modal-backdrop" on:click={() => { selectedItem = null; editingItem = false; }} on:keydown={(e) => e.key === 'Escape' && (selectedItem = null, editingItem = false)} role="button" tabindex="0"></div>
  </div>
{/if}
