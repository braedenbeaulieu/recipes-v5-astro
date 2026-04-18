<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useIngredientEnhancements } from '@/composables/useIngredientEnhancements'
import IngredientToast from '@/components/IngredientToast.vue'

const props = defineProps<{
  slug?: string
}>()

const contentRoot = ref<HTMLElement | null>(null)
const recipePath = computed(() => props.slug)

const { ingredientToast, ingredientToastPosition, applyIngredientEnhancements } = useIngredientEnhancements(
  contentRoot,
  recipePath
)

let observer: MutationObserver | null = null
let timeoutId: ReturnType<typeof setTimeout> | null = null

const findContentRoot = () => {
  // First try direct query
  const root = document.querySelector('.recipe-content') as HTMLElement | null
  if (root) {
    contentRoot.value = root
    applyIngredientEnhancements()
    cleanup()
    return true
  }
  return false
}

const cleanup = () => {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  if (observer) {
    observer.disconnect()
    observer = null
  }
}

onMounted(() => {
  // Try immediately
  if (findContentRoot()) {
    return
  }

  // If not found, observe for it
  observer = new MutationObserver(() => {
    if (findContentRoot()) {
      cleanup()
    }
  })

  observer.observe(document.documentElement, { childList: true, subtree: true })

  // Timeout fallback: stop observing after 5 seconds
  timeoutId = setTimeout(() => {
    cleanup()
  }, 5000)
})

onBeforeUnmount(() => {
  cleanup()
})
</script>

<template>
  <IngredientToast
    :message="ingredientToast"
    :position="ingredientToastPosition"
  />
</template>
