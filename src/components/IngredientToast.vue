<script setup lang="ts">
type ToastPlacement = 'above' | 'below'

type ToastPosition = {
  left: number
  top: number
  placement?: ToastPlacement
}

defineProps<{
  message?: string | null
  position?: ToastPosition | null
}>()
</script>

<template>
  <div
    v-if="message"
    class="ingredient-toast"
    :class="{ 'is-anchored': !!position, 'is-below': position?.placement === 'below' }"
    :style="position ? { '--ingredient-toast-left': `${position.left}px`, '--ingredient-toast-top': `${position.top}px` } : undefined"
  >
    <div class="ingredient-toast__inner" role="status" aria-live="polite">
      {{ message }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.ingredient-toast {
  position: fixed;
  left: 50%;
  top: 1.25rem;
  bottom: auto;
  transform: translateX(-50%);
  z-index: 50;
  max-width: min(680px, calc(100vw - 2rem));
  pointer-events: none;
}

.ingredient-toast__inner {
  padding: 0.8rem 1rem;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--quaternary);
  box-shadow: var(--shadow);
  color: var(--text);
  animation: ingredient-toast-in 160ms ease-out;
  font-weight: 700;
}

@media (min-width: 861px) {
  .ingredient-toast.is-anchored {
    left: var(--ingredient-toast-left);
    top: var(--ingredient-toast-top);
    transform: translate(-50%, calc(-100% - 12px));
  }

  .ingredient-toast.is-anchored.is-below {
    transform: translate(-50%, 12px);
  }
}

@keyframes ingredient-toast-in {
  from {
    transform: translateY(-12px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ingredient-toast__inner {
    animation: none;
  }
}
</style>
