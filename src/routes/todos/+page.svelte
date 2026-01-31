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
  }
  
  let todos: Todo[] = [];
  let loading = true;
  let newTodoTitle = '';
  let newTodoAssignee = 'coby';
  let filterAssignee: string | null = null;
  let showCompleted = false;
  
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
  
  async function addTodo() {
    if (!newTodoTitle.trim()) return;
    
    await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        title: newTodoTitle.trim(), 
        assignee: newTodoAssignee,
        createdBy: 'rodion' // From the UI it's Rodion adding
      })
    });
    newTodoTitle = '';
    loadTodos();
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
  
  onMount(loadTodos);
</script>

<svelte:head>
  <title>Todos | Agent Dashboard</title>
</svelte:head>

<div class="flex items-center justify-between mb-6">
  <h1 class="text-2xl font-bold">Todos</h1>
  <a href="/" class="btn btn-ghost btn-sm">← Back</a>
</div>

<!-- Add Todo -->
<div class="card bg-base-100 shadow-md rounded-2xl mb-6">
  <div class="card-body p-4">
    <form on:submit|preventDefault={addTodo} class="flex gap-2">
      <input 
        type="text" 
        bind:value={newTodoTitle}
        placeholder="Add a todo..."
        class="input input-bordered flex-1 rounded-xl"
      />
      <select bind:value={newTodoAssignee} class="select select-bordered rounded-xl">
        <option value="coby">Coby</option>
        <option value="rodion">Rodion</option>
      </select>
      <button type="submit" class="btn btn-primary rounded-xl">Add</button>
    </form>
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
          <div class="flex-1">
            <span class:line-through={todo.completed}>{todo.title}</span>
            <div class="text-xs opacity-50 mt-1">
              <span class="badge badge-ghost badge-xs">{todo.assignee}</span>
              · added {formatDate(todo.created_at)}
              {#if todo.completed && todo.completed_at}
                · done {formatDate(todo.completed_at)}
              {/if}
            </div>
          </div>
          <button 
            class="btn btn-ghost btn-xs"
            on:click={() => deleteTodo(todo.id)}
          >
            🗑
          </button>
        </div>
      </div>
    {/each}
  </div>
{/if}
