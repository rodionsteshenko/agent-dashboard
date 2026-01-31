<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let swiping = false;
  let isHorizontal: boolean | null = null;
  
  const THRESHOLD = 80;
  const DIRECTION_LOCK_THRESHOLD = 10; // Lock direction after this much movement
  
  function handleTouchStart(e: TouchEvent) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentX = 0;
    swiping = true;
    isHorizontal = null;
  }
  
  function handleTouchMove(e: TouchEvent) {
    if (!swiping) return;
    
    const deltaX = e.touches[0].clientX - startX;
    const deltaY = e.touches[0].clientY - startY;
    
    // Determine if this is a horizontal or vertical gesture
    if (isHorizontal === null && (Math.abs(deltaX) > DIRECTION_LOCK_THRESHOLD || Math.abs(deltaY) > DIRECTION_LOCK_THRESHOLD)) {
      isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
    }
    
    // Only track horizontal swipes, let vertical scroll through
    if (isHorizontal) {
      currentX = deltaX;
      e.preventDefault(); // Prevent scroll only for horizontal swipes
    }
  }
  
  function handleTouchEnd() {
    if (!swiping) return;
    
    if (isHorizontal) {
      if (currentX < -THRESHOLD) {
        dispatch('swipeleft');
      } else if (currentX > THRESHOLD) {
        dispatch('swiperight');
      }
    }
    
    swiping = false;
    currentX = 0;
    isHorizontal = null;
  }
  
  $: transform = (swiping && isHorizontal) ? `translateX(${currentX * 0.5}px)` : '';
  $: opacity = (swiping && isHorizontal) ? Math.max(0.5, 1 - Math.abs(currentX) / 300) : 1;
  
  $: swipeIndicator = (() => {
    if (!swiping || !isHorizontal) return null;
    if (currentX < -40) return '🗑️ Dismiss';
    if (currentX > 40) return '📌 Save for later';
    return null;
  })();
</script>

<div
  class="swipeable relative"
  on:touchstart={handleTouchStart}
  on:touchmove={handleTouchMove}
  on:touchend={handleTouchEnd}
  style="transform: {transform}; opacity: {opacity}; transition: {(swiping && isHorizontal) ? 'none' : 'all 0.2s ease'};"
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
    touch-action: pan-y pinch-zoom;
  }
</style>
