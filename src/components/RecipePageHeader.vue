<script setup lang="ts">
import type { RecipeData } from '@/types/index'
import RecipeMeta from '@/components/RecipeMeta.vue'
import KeepAwakeToggle from '@/components/KeepAwakeToggle.vue'
import GroceryListButton from '@/components/GroceryListButton.vue'

defineProps<{
  recipePage: RecipeData
  categorySlug: string
  contentRoot?: HTMLElement | null
}>()

const slugifyTag = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
</script>

<template>
  <header class="page-header page-header--recipe">
    <p class="page-header__eyebrow">
      <a :href="`/categories/${categorySlug}/`">{{ categorySlug }}</a>
    </p>
    <h1>{{ recipePage.title }}</h1>
    <p v-if="recipePage.description">{{ recipePage.description }}</p>
    <p v-if="recipePage.tags?.length" class="recipe-tags">
      <span class="screen-reader-text">Tags</span>
      <a
        v-for="tag in recipePage.tags"
        :key="tag"
        class="tag"
        :href="`/tags/${slugifyTag(tag)}/`"
      >
        {{ tag }}
      </a>
    </p>

    <RecipeMeta
      :prep-time="recipePage.prepTime"
      :cook-time="recipePage.cookTime"
      :total-time="recipePage.totalTime"
      :servings="recipePage.servings"
      :difficulty="recipePage.difficulty"
    />

    <div class="recipe-actions">
      <KeepAwakeToggle />
      <GroceryListButton :content-root="contentRoot" />
    </div>
  </header>
</template>

<style scoped lang="scss">
.page-header {
  margin-bottom: 2rem;
}

.page-header__eyebrow {
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  color: var(--text);
}

.page-header h1 {
  margin: 0.35rem 0 0.5rem;
  font-size: clamp(2rem, 4vw, 3rem);
}

.page-header p {
  max-width: 62ch;
  color: var(--muted);
  line-height: 1.6;
}

.recipe-tags {
  margin: 0.85rem 0;
}

.tag {
  display: inline-flex;
  margin: 0.2rem 0.3rem 0.2rem 0;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  background: var(--surface-subtle);
  border: 1px solid var(--surface-subtle-border);
  color: var(--text);
  font-size: 0.85rem;
}

.recipe-actions {
  display: grid;
  align-items: center;
  justify-content: center;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.recipe-actions > * {
  width: 100%;
}
</style>
