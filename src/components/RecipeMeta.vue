<script setup lang="ts">
import { formatDuration } from '@/utils/formatDuration'

defineProps<{
  prepTime?: string
  cookTime?: string
  totalTime?: string
  servings?: string | number
  difficulty?: string
}>()
</script>

<template>
  <dl class="recipe-meta">
    <div v-if="prepTime" class="recipe-meta__item">
      <dt>Prep</dt>
      <dd>{{ formatDuration(prepTime) }}</dd>
    </div>
    <div v-if="cookTime" class="recipe-meta__item">
      <dt>Cook</dt>
      <dd>{{ formatDuration(cookTime) }}</dd>
    </div>
    <div v-if="totalTime" class="recipe-meta__item">
      <dt>Total</dt>
      <dd>{{ formatDuration(totalTime) }}</dd>
    </div>
    <div v-if="servings" class="recipe-meta__item">
      <dt>Servings</dt>
      <dd>{{ servings }}</dd>
    </div>
    <div v-if="difficulty" class="recipe-meta__item">
      <dt>Difficulty</dt>
      <dd>{{ difficulty }}</dd>
    </div>
  </dl>
</template>

<style scoped lang="scss">
.recipe-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0;
}

.recipe-meta__item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--panel-soft);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 0.45rem 0.8rem;
}

.recipe-meta__item dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.recipe-meta__item dd {
  margin: 0;
  font-weight: 600;
  color: var(--text);
}
</style>
