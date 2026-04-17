<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  contentRoot?: HTMLElement | null
  label?: string
}>(), {
  contentRoot: null,
  label: 'Grocery list'
})

const isOpen = ref(false)
const listItems = ref<string[]>([])
const markdownText = computed(() => listItems.value.map((name) => `- ${name}`).join('\n'))
const errorText = ref<string | null>(null)
const copyStatus = ref<'idle' | 'copied'>('idle')
const mounted = ref(false)

const normalizeHeading = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase()

const isHeadingElement = (element: Element) => /^H[1-6]$/.test(element.tagName)

const headingLevel = (element: Element) => {
  const level = Number(element.tagName.slice(1))
  return Number.isFinite(level) ? level : 6
}

const getSectionElements = (root: HTMLElement, title: string) => {
  const wanted = normalizeHeading(title)
  const headings = Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6'))
  const startHeading = headings.find((heading) => normalizeHeading(heading.textContent || '') === wanted)

  if(!startHeading) {
    return []
  }

  const stopLevel = headingLevel(startHeading)
  const sectionElements: HTMLElement[] = []

  let cursor = startHeading.nextElementSibling as HTMLElement | null
  while(cursor) {
    if(isHeadingElement(cursor) && headingLevel(cursor) <= stopLevel) {
      break
    }

    sectionElements.push(cursor)
    cursor = cursor.nextElementSibling as HTMLElement | null
  }

  return sectionElements
}

const toTitleCaseIfLower = (value: string) => {
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if(!trimmed) {
    return trimmed
  }

  if(/[A-Z]/.test(trimmed)) {
    return trimmed
  }

  return trimmed
    .split(' ')
    .map((word) => {
      if(!word) {
        return word
      }

      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

const buildGroceryListMarkdown = () => {
  const root = props.contentRoot
  if(!root) {
    listItems.value = []
    errorText.value = 'Recipe content not ready yet.'
    return
  }

  const sectionElements = getSectionElements(root, 'Ingredients')
  const strongNodes = sectionElements.flatMap((element) => Array.from(element.querySelectorAll('li strong')))

  const names: string[] = []
  const seen = new Set<string>()

  for(const strongNode of strongNodes) {
    const raw = (strongNode.textContent || '').replace(/\s+/g, ' ').trim()
    const key = raw.toLowerCase()

    if(!raw || seen.has(key)) {
      continue
    }

    seen.add(key)
    names.push(toTitleCaseIfLower(raw))
  }

  if(!names.length) {
    listItems.value = []
    errorText.value = 'No marked ingredients found. Mark ingredient names in the Ingredients list using **double-asterisks**.'
    return
  }

  errorText.value = null
  listItems.value = names
}

const close = () => {
  isOpen.value = false
  copyStatus.value = 'idle'
}

const open = () => {
  copyStatus.value = 'idle'
  isOpen.value = true
  buildGroceryListMarkdown()
}

const copyToClipboard = async () => {
  const text = markdownText.value
  if(!text) {
    return
  }

  try {
    await navigator.clipboard.writeText(text)
    copyStatus.value = 'copied'
    window.setTimeout(() => {
      copyStatus.value = 'idle'
    }, 1200)
  } catch {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', 'true')
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      textarea.style.top = '0'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      copyStatus.value = 'copied'
      window.setTimeout(() => {
        copyStatus.value = 'idle'
      }, 1200)
    } catch {
      // ignore
    }
  }
}

const onKeydown = (event: KeyboardEvent) => {
  if(event.key === 'Escape') {
    close()
  }
}

watch(isOpen, (value) => {
  if(!import.meta.client) {
    return
  }

  if(value) {
    window.addEventListener('keydown', onKeydown)
  } else {
    window.removeEventListener('keydown', onKeydown)
  }
})

onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <div class="grocery-list">
    <button class="grocery-list__button" type="button" @click="open">
      {{ label }}
    </button>

    <Teleport v-if="mounted" to="body">
      <div v-if="isOpen" class="grocery-modal" role="dialog" aria-modal="true" aria-label="Grocery list">
        <div class="grocery-modal__overlay" @click="close"></div>
        <div class="grocery-modal__panel">
          <header class="grocery-modal__header">
            <strong>Grocery list</strong>
            <button class="grocery-modal__close" type="button" @click="close">Close</button>
          </header>

          <p v-if="errorText" class="grocery-modal__note">{{ errorText }}</p>

          <ul v-else class="grocery-modal__list" aria-label="Grocery list items">
            <li v-for="(item, index) in listItems" :key="item" class="grocery-modal__list-item">
              <label class="grocery-modal__item" :for="`grocery-item-${index}`">
                <input
                  :id="`grocery-item-${index}`"
                  class="grocery-modal__checkbox"
                  type="checkbox"
                >
                <span class="grocery-modal__custom-checkbox" aria-hidden="true"></span>
                <span class="grocery-modal__item-text">{{ item }}</span>
              </label>
            </li>
          </ul>

          <div class="grocery-modal__actions">
            <button class="grocery-modal__action" type="button" :disabled="!markdownText" @click="copyToClipboard">
              {{ copyStatus === 'copied' ? 'Copied' : 'Copy list' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.grocery-list__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0.65rem 0.9rem;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text);
  cursor: pointer;
  user-select: none;
  height: 60px;
  width: 100%;
  font-size: 1rem;
}

.grocery-list__button:focus {
  outline: none;
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.grocery-modal {
  position: fixed;
  inset: 0;
  z-index: 60;
}

.grocery-modal__overlay {
  position: absolute;
  inset: 0;
  background: var(--overlay);
}

.grocery-modal__panel {
  position: absolute;
  top: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  width: min(760px, calc(100vw - 2rem));
  border-radius: calc(var(--radius) + 2px);
  border: 1px solid var(--border);
  background: var(--bg);
  box-shadow: var(--shadow);
  padding: 1rem;
}

.grocery-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.grocery-modal__close {
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text);
  border-radius: 12px;
  padding: 0.45rem 0.65rem;
  cursor: pointer;
}

.grocery-modal__close:focus {
  outline: none;
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.grocery-modal__note {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}

.grocery-modal__list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--content-bg);
}

.grocery-modal__list-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 0.85rem;
}

.grocery-modal__item {
  display: inline-flex;
  align-items: flex-start;
  gap: 0.6rem;
  width: 100%;
  cursor: pointer;
  user-select: none;
}

.grocery-modal__list-item + .grocery-modal__list-item {
  border-top: 1px solid var(--border);
}

.grocery-modal__checkbox {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.grocery-modal__custom-checkbox {
  position: relative;
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  margin-top: 2px;
  border-radius: 3px;
  border: 1px solid var(--border);
  background: var(--bg);
  box-shadow: inset 0 1px 0 var(--panel-soft);
}

.grocery-modal__custom-checkbox::after {
  content: '';
  position: absolute;
  inset: 0;
  margin: auto;
  width: 10px;
  height: 4px;
  border-left: 2px solid var(--bg);
  border-bottom: 2px solid var(--bg);
  transform: translateY(-1px) rotate(-45deg);
  opacity: 0;
}

.grocery-modal__checkbox:checked + .grocery-modal__custom-checkbox {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: inset 0 1px 0 var(--panel-soft), 0 0 0 3px var(--accent-soft);
}

.grocery-modal__checkbox:checked + .grocery-modal__custom-checkbox::after {
  opacity: 1;
}

.grocery-modal__checkbox:focus-visible + .grocery-modal__custom-checkbox {
  outline: none;
  box-shadow: inset 0 1px 0 var(--panel-soft), 0 0 0 4px var(--accent-soft);
}

.grocery-modal__checkbox:checked ~ .grocery-modal__item-text {
  opacity: 0.78;
  text-decoration: line-through;
  text-decoration-thickness: 2px;
}

.grocery-modal__item-text {
  line-height: 1.5;
}

.grocery-modal__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.75rem;
}

.grocery-modal__action {
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text);
  border-radius: 12px;
  padding: 0.55rem 0.8rem;
  cursor: pointer;
}

.grocery-modal__action:disabled {
  opacity: 0.6;
  cursor: default;
}

.grocery-modal__action:focus {
  outline: none;
  box-shadow: 0 0 0 4px var(--accent-soft);
}
</style>
