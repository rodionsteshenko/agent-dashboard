<script lang="ts">
  import { onMount } from 'svelte';
  
  interface Todo {
    id: string;
    title: string;
    assignee: string;
    completed: boolean;
    created_at: string;
    completed_at: string | null;
    created_by: string;
    due_date: string | null;
  }
  
  let todos: Todo[] = [];
  let loading = true;
  let smartInput = '';
  let filterAssignee: string | null = null;
  let showCompleted = false;
  let feedback = '';
  let feedbackType: 'success' | 'error' | '' = '';
  
  // Edit modal state
  let editingTodo: Todo | null = null;
  let editTitle = '';
  let editAssignee = '';
  let editDueDate = '';
  let saving = false;
  
  async function loadTodos() {
    loading = true;
    let url = '/api/todos';
    const params = new URLSearchParams();
    if (filterAssignee) params.set('assignee', filterAssignee);
    if (showCompleted) params.set('completed', 'true');
    if (params.toString()) url += '?' + params.toString();
    
    const res = await fetch(url);
    todos = await res.json();
    loading = false;
  }
  
  async function handleSmartInput() {
    if (!smartInput.trim()) return;
    
    const res = await fetch('/api/todos/smart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: smartInput.trim() })
    });
    
    const result = await res.json();
    
    if (res.ok) {
      feedback = result.message;
      feedbackType = 'success';
      smartInput = '';
      loadTodos();
    } else {
      feedback = result.message || 'Something went wrong';
      feedbackType = 'error';
    }
    
    // Clear feedback after 3 seconds
    setTimeout(() => {
      feedback = '';
      feedbackType = '';
    }, 3000);
  }
  
  async function toggleTodo(id: string, completed: boolean) {
    await fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !completed })
    });
    loadTodos();
  }
  
  async function deleteTodo(id: string) {
    await fetch(`/api/todos/${id}`, { method: 'DELETE' });
    loadTodos();
  }
  
  function openEditModal(todo: Todo) {
    editingTodo = todo;
    editTitle = todo.title;
    editAssignee = todo.assignee;
    editDueDate = todo.due_date || '';
  }
  
  function closeEditModal() {
    editingTodo = null;
    editTitle = '';
    editAssignee = '';
    editDueDate = '';
  }
  
  async function saveEdit() {
    if (!editingTodo) return;
    saving = true;
    
    await fetch(`/api/todos/${editingTodo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        assignee: editAssignee,
        due_date: editDueDate || null
      })
    });
    
    saving = false;
    closeEditModal();
    loadTodos();
  }
  
  async function deleteAndClose() {
    if (!editingTodo) return;
    await deleteTodo(editingTodo.id);
    closeEditModal();
  }
  
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
  
  function formatDueDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
    
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays <= 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  function isDueOrOverdue(dateStr: string): boolean {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date <= today;
  }
  
  onMount(loadTodos);
</script>

<svelte:head>
  <title>Todos | Agent Dashboard</title>
</svelte:head>

<div class="flex items-center justify-between mb-6">
  <h1 class="text-2xl font-bold">Todos</h1>
  <a href="/" class="btn btn-ghost btn-sm">← Back</a>
</div>

<!-- Smart Input -->
<div class="card bg-base-100 shadow-md rounded-2xl mb-6">
  <div class="card-body p-4">
    <form on:submit|preventDefault={handleSmartInput} class="flex gap-2">
      <input 
        type="text" 
        bind:value={smartInput}
        placeholder="e.g. 'call dentist tomorrow' or 'done with dentist'"
        class="input input-bordered flex-1 rounded-xl"
      />
      <button type="submit" class="btn btn-primary rounded-xl">Go</button>
    </form>
    {#if feedback}
      <div class="mt-2 text-sm" class:text-success={feedbackType === 'success'} class:text-error={feedbackType === 'error'}>
        {feedback}
      </div>
    {/if}
  </div>
</div>

<!-- Filters -->
<div class="flex gap-2 mb-4 flex-wrap">
  <button 
    class="btn btn-sm rounded-full"
    class:btn-primary={filterAssignee === null}
    class:btn-ghost={filterAssignee !== null}
    on:click={() => { filterAssignee = null; loadTodos(); }}
  >
    All
  </button>
  <button 
    class="btn btn-sm rounded-full"
    class:btn-primary={filterAssignee === 'coby'}
    class:btn-ghost={filterAssignee !== 'coby'}
    on:click={() => { filterAssignee = 'coby'; loadTodos(); }}
  >
    Coby
  </button>
  <button 
    class="btn btn-sm rounded-full"
    class:btn-primary={filterAssignee === 'rodion'}
    class:btn-ghost={filterAssignee !== 'rodion'}
    on:click={() => { filterAssignee = 'rodion'; loadTodos(); }}
  >
    Rodion
  </button>
  <div class="divider divider-horizontal"></div>
  <label class="label cursor-pointer gap-2">
    <input 
      type="checkbox" 
      bind:checked={showCompleted}
      on:change={loadTodos}
      class="checkbox checkbox-sm"
    />
    <span class="label-text">Show completed</span>
  </label>
</div>

<!-- Todo List -->
{#if loading}
  <div class="flex justify-center p-8">
    <span class="loading loading-spinner loading-lg"></span>
  </div>
{:else if todos.length === 0}
  <div class="hero min-h-[30vh]">
    <div class="hero-content text-center">
      <div>
        <h2 class="text-xl font-bold opacity-70">No todos</h2>
        <p class="py-2 opacity-50">Add one above!</p>
      </div>
    </div>
  </div>
{:else}
  <div class="flex flex-col gap-2">
    {#each todos as todo (todo.id)}
      <div 
        class="card bg-base-100 shadow-sm rounded-xl"
        class:opacity-50={todo.completed}
      >
        <div class="card-body p-4 flex-row items-center gap-3">
          <input 
            type="checkbox" 
            checked={todo.completed}
            on:change={() => toggleTodo(todo.id, todo.completed)}
            class="checkbox checkbox-primary"
          />
          <button 
            class="flex-1 text-left cursor-pointer hover:opacity-70 transition-opacity"
            on:click={() => openEditModal(todo)}
          >
            <span class:line-through={todo.completed}>{todo.title}</span>
            <div class="text-xs opacity-50 mt-1 flex items-center gap-1 flex-wrap">
              <span class="badge badge-ghost badge-xs">{todo.assignee}</span>
              {#if todo.due_date && !todo.completed}
                <span 
                  class="badge badge-xs"
                  class:badge-error={isDueOrOverdue(todo.due_date)}
                  class:badge-warning={!isDueOrOverdue(todo.due_date)}
                >
                  📅 {formatDueDate(todo.due_date)}
                </span>
              {/if}
              <span>· added {formatDate(todo.created_at)}</span>
              {#if todo.completed && todo.completed_at}
                <span>· done {formatDate(todo.completed_at)}</span>
              {/if}
            </div>
          </button>
        </div>
      </div>
    {/each}
  </div>
{/if}

<!-- Edit Modal -->
{#if editingTodo}
  <div class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">Edit Todo</h3>
      
      <div class="form-control mb-4">
        <label class="label" for="edit-title">
          <span class="label-text">Title</span>
        </label>
        <input 
          id="edit-title"
          type="text" 
          bind:value={editTitle}
          class="input input-bordered rounded-xl"
        />
      </div>
      
      <div class="form-control mb-4">
        <label class="label" for="edit-assignee">
          <span class="label-text">Assignee</span>
        </label>
        <select 
          id="edit-assignee"
          bind:value={editAssignee} 
          class="select select-bordered rounded-xl"
        >
          <option value="coby">Coby</option>
          <option value="rodion">Rodion</option>
        </select>
      </div>
      
      <div class="form-control mb-6">
        <label class="label" for="edit-due">
          <span class="label-text">Due Date</span>
        </label>
        <input 
          id="edit-due"
          type="date" 
          bind:value={editDueDate}
          class="input input-bordered rounded-xl"
        />
      </div>
      
      <div class="modal-action">
        <button class="btn btn-error btn-outline" on:click={deleteAndClose}>
          Delete
        </button>
        <div class="flex-1"></div>
        <button class="btn btn-ghost" on:click={closeEditModal}>
          Cancel
        </button>
        <button 
          class="btn btn-primary" 
          on:click={saveEdit}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
    <div class="modal-backdrop" on:click={closeEditModal} on:keydown={(e) => e.key === 'Escape' && closeEditModal()} role="button" tabindex="0"></div>
  </div>
{/if}
