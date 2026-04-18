<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { formatTaxName } from '@/utils/formatTaxName'

interface SidebarItem {
  title: string
  path: string
  category: string
}

const props = defineProps<{
  items: SidebarItem[]
  currentPath?: string
}>()

const search = ref('')

const isMobile = ref(false)
const isSidebarOpen = ref(false)

const onAccordionEnter = (el: Element) => {
  const element = el as HTMLElement
  element.style.height = '0px'
  element.offsetHeight
  element.style.height = `${element.scrollHeight}px`
}

const onAccordionAfterEnter = (el: Element) => {
  const element = el as HTMLElement
  element.style.height = ''
}

const onAccordionLeave = (el: Element) => {
  const element = el as HTMLElement
  element.style.height = `${element.scrollHeight}px`
  element.offsetHeight
  element.style.height = '0px'
}

const onAccordionAfterLeave = (el: Element) => {
  const element = el as HTMLElement
  element.style.height = ''
}

let mql: MediaQueryList | null = null
const mqlHandler = () => syncViewport()

const syncViewport = () => {
  // @ts-ignore
  if(!import.meta.client) {
    return
  }

  isMobile.value = window.matchMedia('(max-width: 860px)').matches
  isSidebarOpen.value = !isMobile.value
}

onMounted(() => {
  // @ts-ignore
  if(!import.meta.client) {
    return
  }

  mql = window.matchMedia('(max-width: 860px)')

  syncViewport()

  if(mql && 'addEventListener' in mql) {
    mql.addEventListener('change', mqlHandler)
  } else {
    // @ts-expect-error - Safari < 14
    mql?.addListener(mqlHandler)
  }
})

onBeforeUnmount(() => {
  if(!mql) {
    return
  }

  if('removeEventListener' in mql) {
    mql.removeEventListener('change', mqlHandler)
  } else {
    // @ts-expect-error - Safari < 14
    mql.removeListener(mqlHandler)
  }
})

const filteredItems = computed(() => {
  const term = search.value.trim().toLowerCase()

  if (!term) {
    return props.items
  }

  return props.items.filter((item) => {
    return (
      item.title.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term)
    )
  })
})

const groupedItems = computed(() => {
  return filteredItems.value.reduce<Record<string, SidebarItem[]>>((acc, item: SidebarItem) => {
    const list = acc[item.category]||[]
    list.push(item)
    acc[item.category] = list
    return acc
  }, {})
})

const openCategories = reactive<Record<string, boolean>>({})

watch(groupedItems, (newGrouped) => {
  for (const cat in newGrouped) {
    if (newGrouped[cat].length > 0) {
      openCategories[cat] = true;
    }
  }
}, { immediate: true })

const isCategoryOpen = (cat: string) => openCategories[cat] ?? true

const toggleCategory = (cat: string) => {
  openCategories[cat] = !isCategoryOpen(cat)
}

</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__scroll">
      <div class="sidebar__inner">
      <div class="sidebar__mobile-header">
        <a href="/" class="brand">
          <strong>Recipe Book</strong>
        </a>

        <button
          type="button"
          class="sidebar__toggle"
          :aria-expanded="isSidebarOpen"
          aria-controls="sidebar-panel"
          @click="isSidebarOpen=!isSidebarOpen"
        >
          <span class="screen-reader-text">Toggle sidebar</span>
          <svg class="sidebar__toggle-icon" width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <Transition
        name="sidebar-accordion"
        @enter="onAccordionEnter"
        @after-enter="onAccordionAfterEnter"
        @leave="onAccordionLeave"
        @after-leave="onAccordionAfterLeave"
      >
        <div
          id="sidebar-panel"
          class="sidebar__panel"
          :class="{ 'is-open': isSidebarOpen }"
          v-show="!isMobile||isSidebarOpen"
        >
        <div class="sidebar__search-wrap">
          <label class="sidebar__search-label screen-reader-text" for="recipe-search">Search recipes</label>
          <input
            id="recipe-search"
            v-model="search"
            type="search"
            class="sidebar__search"
            placeholder="Search recipes..."
          >
        </div>

        <nav class="sidebar__nav" aria-label="Recipe navigation">
          <section v-for="(group, category) in groupedItems" :key="category" class="sidebar__group">
            <h2 class="sidebar__heading" @click="toggleCategory(category)">
              <a :href="`/categories/${category}/`" @click.stop>{{ formatTaxName(category) }}</a>
              <button class="sidebar__heading-trigger" :class="{ 'is-open': isCategoryOpen(category) }" aria-label="Toggle category">
                <svg class="sidebar__arrow" width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </h2>
            <Transition
              name="sidebar-accordion"
              @enter="onAccordionEnter"
              @after-enter="onAccordionAfterEnter"
              @leave="onAccordionLeave"
              @after-leave="onAccordionAfterLeave"
            >
              <ul v-show="isCategoryOpen(category)" class="sidebar__list">
                <li v-for="item in group" :key="item.path">
                  <a
                    :href="item.path"
                    class="sidebar__link"
                    :class="{ 'is-active': item.path === currentPath }"
                  >
                    {{ item.title }}
                  </a>
                </li>
              </ul>
            </Transition>
          </section>

          <p v-if="!filteredItems.length" class="sidebar__empty">No recipes match your search.</p>
        </nav>
        </div>
      </Transition>
    </div>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.sidebar {
  position: sticky;
  top: 1.5rem;
  height: calc(100vh - 3rem);
  overflow: hidden;
  padding: 0;
  background: var(--sidebar-bg);
  border-radius: 22px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-soft);
}

.sidebar__scroll {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
}

.sidebar__scroll::-webkit-scrollbar {
  width: 10px;
}

.sidebar__scroll::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar__scroll::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: content-box;
  margin-top: 30px;
  margin-bottom: 30px;
}

.sidebar__scroll::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
  background-clip: content-box;
}

.sidebar__scroll {
  scrollbar-color: var(--scrollbar-thumb) transparent;
  scrollbar-width: thin;
}

.sidebar__inner {
  padding: 1.25rem;
}

.sidebar__mobile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.sidebar__toggle {
  display: none;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text);
  cursor: pointer;
}

.sidebar__toggle:focus {
  outline: none;
  border-color: var(--accent-border-strong);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.sidebar__toggle-icon {
  transition: transform 0.15s ease;
}

.sidebar__toggle[aria-expanded="true"] .sidebar__toggle-icon {
  transform: rotate(180deg);
}

.brand {
  display: block;
}

.brand strong {
  font-size: 1.9rem;
  letter-spacing: -0.02em;
}

.sidebar__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  color: var(--text);
  cursor: pointer;
  padding: 0.5rem 0;
  margin: 0;
}

.sidebar__heading a {
  flex: 1;
  text-decoration: none;
  color: inherit;
}

.sidebar__heading-trigger {
  display: grid;
  place-content: center;
  border: 0;
  background: var(--muted);
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 4px;
}

.sidebar__heading-trigger > svg {
  transition: transform 0.15s ease;
}

.sidebar__heading-trigger.is-open > svg {
  transform: rotate(180deg);
}

.sidebar-accordion-enter-active,
.sidebar-accordion-leave-active {
  overflow: hidden;
  transition: height 300ms ease-in-out;
  will-change: height;
}

.sidebar-accordion-enter-from,
.sidebar-accordion-leave-to {
  height: 0px;
}

@media (prefers-reduced-motion: reduce) {
  .sidebar-accordion-enter-active,
  .sidebar-accordion-leave-active {
    transition: none;
  }
}

.sidebar__search-wrap {
  margin-top: 1.1rem;
  margin-bottom: 1.1rem;
}

.sidebar__search {
  width: 100%;
  padding: 0.8rem 0.95rem;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--search-bg);
  color: var(--text);
  outline: none;
  box-shadow: inset 0 1px 0 var(--panel-soft);
}

.sidebar__search::placeholder {
  color: var(--placeholder);
}

.sidebar__search:focus {
  border-color: var(--accent-border-strong);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.sidebar__group + .sidebar__group {
  margin-top: 1.25rem;
}

.sidebar__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.sidebar__link {
  display: block;
  color: var(--muted);
  border-radius: 12px;
  transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
  padding: 0.6rem 0.75rem;
  margin: 0.22rem 0;
}

.sidebar__link:hover,
.sidebar__link.is-active {
  background: var(--surface-hover);
  color: var(--text);
  transform: translateX(2px);
}

.sidebar__link:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px var(--accent-soft);
  background: var(--surface-hover);
  color: var(--text);
}

.sidebar__empty {
  margin-top: 1rem;
  color: var(--muted);
}

@media (max-width: 860px) {
  .sidebar__toggle {
    display: inline-flex !important;
  }

  .sidebar__panel {
    display: none;
  }

  .sidebar__panel.is-open {
    display: block;
  }

  .sidebar {
    position: static;
    height: auto;
    overflow: visible;
    border-radius: 22px;
    margin-bottom: 1rem;
  }

  .sidebar__scroll {
    height: auto;
  }
}
</style>
