<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  let startX = 0;
  let currentX = 0;
  let swiping = false;
  let isHorizontal: boolean | null = null;
  let dismissed = false;
  let saved = false;
  
  const THRESHOLD = 80;
  const DIRECTION_LOCK_THRESHOLD = 10;
  
  function handleTouchStart(e: TouchEvent) {
    if (dismissed || saved) return;
    startX = e.touches[0].clientX;
    currentX = 0;
    swiping = true;
    isHorizontal = null;
  }
  
  function handleTouchMove(e: TouchEvent) {
    if (!swiping || dismissed || saved) return;
    
    const deltaX = e.touches[0].clientX - startX;
    const deltaY = e.touches[0].clientY - (e.touches[0].clientY - deltaX); // approximate
    
    if (isHorizontal === null && Math.abs(deltaX) > DIRECTION_LOCK_THRESHOLD) {
      isHorizontal = true;
    }
    
    if (isHorizontal) {
      currentX = deltaX;
      e.preventDefault();
    }
  }
  
  function handleTouchEnd() {
    if (!swiping || dismissed || saved) return;
    
    if (isHorizontal) {
      if (currentX < -THRESHOLD) {
        // Dismiss animation
        dismissed = true;
        setTimeout(() => dispatch('swipeleft'), 300);
      } else if (currentX > THRESHOLD) {
        // Save animation
        saved = true;
        setTimeout(() => dispatch('swiperight'), 300);
      }
    }
    
    swiping = false;
    if (!dismissed && !saved) {
      currentX = 0;
    }
    isHorizontal = null;
  }
  
  $: swipeProgress = Math.min(Math.abs(currentX) / THRESHOLD, 1);
  $: direction = currentX < 0 ? 'left' : currentX > 0 ? 'right' : null;
  
  $: style = (() => {
    if (dismissed) {
      return 'transform: translateX(-120%) rotate(-5deg); opacity: 0; transition: all 0.3s ease-out;';
    }
    if (saved) {
      return 'transform: translateX(120%) rotate(5deg); opacity: 0; transition: all 0.3s ease-out;';
    }
    if (swiping && isHorizontal) {
      return `transform: translateX(${currentX * 0.6}px) rotate(${currentX * 0.02}deg); transition: none;`;
    }
    return 'transform: translateX(0) rotate(0); transition: all 0.2s ease;';
  })();
</script>

<div class="swipeable-wrapper relative overflow-visible">
  <!-- Background indicator -->
  {#if swiping && isHorizontal && swipeProgress > 0.2}
    <div 
      class="absolute inset-0 rounded-2xl flex items-center px-6 -z-10"
      class:bg-error={direction === 'left'}
      class:bg-success={direction === 'right'}
      class:justify-start={direction === 'right'}
      class:justify-end={direction === 'left'}
      style="opacity: {swipeProgress * 0.8};"
    >
      <div class="text-white font-semibold flex items-center gap-2">
        {#if direction === 'left'}
          <span class="text-2xl">🗑️</span>
          <span>Archive</span>
        {:else if direction === 'right'}
          <span class="text-2xl">📥</span>
          <span>Save</span>
        {/if}
      </div>
    </div>
  {/if}
  
  <div
    class="swipeable"
    on:touchstart={handleTouchStart}
    on:touchmove={handleTouchMove}
    on:touchend={handleTouchEnd}
    {style}
  >
    <slot />
  </div>
</div>

<style>
  .swipeable {
    touch-action: pan-y pinch-zoom;
  }
  .swipeable-wrapper {
    position: relative;
  }
</style>
