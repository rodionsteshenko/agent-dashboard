<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let swiping = false;
  let direction: 'left' | 'right' | 'up' | 'down' | null = null;
  
  const THRESHOLD = 80;
  
  function handleTouchStart(e: TouchEvent) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentX = 0;
    currentY = 0;
    swiping = true;
    direction = null;
  }
  
  function handleTouchMove(e: TouchEvent) {
    if (!swiping) return;
    
    currentX = e.touches[0].clientX - startX;
    currentY = e.touches[0].clientY - startY;
    
    // Determine direction
    if (Math.abs(currentX) > Math.abs(currentY)) {
      direction = currentX > 0 ? 'right' : 'left';
    } else {
      direction = currentY > 0 ? 'down' : 'up';
    }
  }
  
  function handleTouchEnd() {
    if (!swiping) return;
    
    if (direction === 'left' && currentX < -THRESHOLD) {
      dispatch('swipeleft');
    } else if (direction === 'right' && currentX > THRESHOLD) {
      dispatch('swiperight');
    } else if (direction === 'up' && currentY < -THRESHOLD) {
      dispatch('swipeup');
    } else if (direction === 'down' && currentY > THRESHOLD) {
      dispatch('swipedown');
    }
    
    swiping = false;
    currentX = 0;
    currentY = 0;
    direction = null;
  }
  
  $: transform = swiping ? `translateX(${currentX * 0.3}px)` : '';
  $: opacity = swiping ? Math.max(0.5, 1 - Math.abs(currentX) / 300) : 1;
  
  $: swipeIndicator = (() => {
    if (!swiping) return null;
    if (direction === 'left' && currentX < -30) return '🗑️ Archive';
    if (direction === 'down' && currentY > 30) return '📌 Save for later';
    if (direction === 'up' && currentY < -30) return '🔍 Deep dive';
    return null;
  })();
</script>

<div
  class="swipeable relative"
  on:touchstart={handleTouchStart}
  on:touchmove={handleTouchMove}
  on:touchend={handleTouchEnd}
  style="transform: {transform}; opacity: {opacity}; transition: {swiping ? 'none' : 'all 0.2s ease'};"
>
  {#if swipeIndicator}
    <div class="absolute inset-0 flex items-center justify-center bg-base-300 rounded-2xl -z-10">
      <span class="text-lg font-medium opacity-70">{swipeIndicator}</span>
    </div>
  {/if}
  <slot />
</div>

<style>
  .swipeable {
    touch-action: pan-y;
  }
</style>
