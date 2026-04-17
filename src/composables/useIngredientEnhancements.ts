import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

type IngredientIndex = {
  names: string[]
  amountByName: Map<string, string>
}

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

const getIngredientIndexFromDom = (root: HTMLElement): IngredientIndex => {
  const sectionElements = getSectionElements(root, 'Ingredients')
  const amountByName = new Map<string, string>()
  const namesSet = new Set<string>()

  const listItems = sectionElements.flatMap((element) => Array.from(element.querySelectorAll('li')))
  for(const listItem of listItems) {
    const amountText = (listItem.textContent || '').replace(/\s+/g, ' ').trim()
    if(!amountText) {
      continue
    }

    const strongNodes = Array.from(listItem.querySelectorAll('strong'))
    for(const strongNode of strongNodes) {
      const ingredientNameRaw = (strongNode.textContent || '').replace(/\s+/g, ' ').trim()
      const ingredientName = ingredientNameRaw.toLowerCase()

      if(!ingredientName) {
        continue
      }

      namesSet.add(ingredientName)
      if(!amountByName.has(ingredientName)) {
        amountByName.set(ingredientName, amountText)
      }
    }
  }

  const names = Array.from(namesSet).sort((a, b) => b.length - a.length)
  return { names, amountByName }
}

const markIngredientsSection = (root: HTMLElement) => {
  const sectionElements = getSectionElements(root, 'Ingredients')
  for(const element of sectionElements) {
    element.classList.add('ingredients-section')
  }
}

const isWordChar = (value: string) => /[\p{L}\p{N}]/u.test(value)

const isBoundaryMatch = (textLower: string, start: number, matchLength: number) => {
  const beforeIndex = start - 1
  const afterIndex = start + matchLength
  const beforeChar = beforeIndex >= 0 ? textLower[beforeIndex] : ''
  const afterChar = afterIndex < textLower.length ? textLower[afterIndex] : ''

  if(beforeChar && isWordChar(beforeChar)) {
    return false
  }

  if(afterChar && isWordChar(afterChar)) {
    return false
  }

  return true
}

const enhanceDirectionsWithIngredientButtons = (root: HTMLElement, ingredientIndex: IngredientIndex) => {
  if(!ingredientIndex.names.length) {
    return
  }

  const sectionElements = getSectionElements(root, 'Directions')
  if(!sectionElements.length) {
    return
  }

  const ignoredParents = new Set(['A', 'BUTTON', 'CODE', 'PRE', 'SCRIPT', 'STYLE'])
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement
      if(!parent) {
        return NodeFilter.FILTER_REJECT
      }

      if(ignoredParents.has(parent.tagName)) {
        return NodeFilter.FILTER_REJECT
      }

      if(!sectionElements.some((element) => element.contains(parent))) {
        return NodeFilter.FILTER_REJECT
      }

      const value = (node.nodeValue || '').trim()
      if(!value) {
        return NodeFilter.FILTER_REJECT
      }

      return NodeFilter.FILTER_ACCEPT
    }
  })

  const nodesToProcess: Text[] = []
  let currentNode: Node | null = walker.nextNode()
  while(currentNode) {
    nodesToProcess.push(currentNode as Text)
    currentNode = walker.nextNode()
  }

  for(const textNode of nodesToProcess) {
    const originalText = textNode.nodeValue || ''
    const textLower = originalText.toLowerCase()

    let cursor = 0
    let changed = false
    const fragment = document.createDocumentFragment()

    while(cursor < originalText.length) {
      let bestIndex = -1
      let bestName = ''

      for(const name of ingredientIndex.names) {
        const index = textLower.indexOf(name, cursor)
        if(index === -1) {
          continue
        }

        if(!isBoundaryMatch(textLower, index, name.length)) {
          continue
        }

        if(bestIndex === -1 || index < bestIndex || (index === bestIndex && name.length > bestName.length)) {
          bestIndex = index
          bestName = name
        }
      }

      if(bestIndex === -1) {
        fragment.appendChild(document.createTextNode(originalText.slice(cursor)))
        break
      }

      if(bestIndex > cursor) {
        fragment.appendChild(document.createTextNode(originalText.slice(cursor, bestIndex)))
      }

      const matchedText = originalText.slice(bestIndex, bestIndex + bestName.length)
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'ingredient-ref'
      button.dataset.ingredient = bestName
      button.textContent = matchedText
      fragment.appendChild(button)

      changed = true
      cursor = bestIndex + bestName.length
    }

    if(changed && textNode.parentNode) {
      textNode.parentNode.replaceChild(fragment, textNode)
    }
  }
}

export const useIngredientEnhancements = (
  contentRoot: Ref<HTMLElement | null>,
  recipePath: Ref<string | undefined | null>
) => {
  type IngredientToastPlacement = 'above' | 'below'

  type IngredientToastPosition = {
    left: number
    top: number
    placement: IngredientToastPlacement
  }

  const ingredientToast = ref<string | null>(null)
  const ingredientToastPosition = ref<IngredientToastPosition | null>(null)

  let toastTimer: ReturnType<typeof setTimeout> | null = null
  let clickListenerAttached = false
  let ingredientIndex: IngredientIndex | null = null
  let toastAnchorElement: HTMLElement | null = null
  let positionRaf: number | null = null
  let windowListenersAttached = false

  const updateToastPosition = () => {
    if(!import.meta.client) {
      return
    }

    if(!toastAnchorElement || !ingredientToast.value) {
      ingredientToastPosition.value = null
      return
    }

    if(!toastAnchorElement.isConnected) {
      toastAnchorElement = null
      ingredientToastPosition.value = null
      detachWindowListeners()
      return
    }

    const rect = toastAnchorElement.getBoundingClientRect()
    const margin = 16
    const left = Math.min(Math.max(rect.left + rect.width / 2, margin), window.innerWidth - margin)
    const placement: IngredientToastPlacement = rect.top < 120 ? 'below' : 'above'
    const top = placement === 'below' ? rect.bottom : rect.top

    ingredientToastPosition.value = { left, top, placement }
  }

  const scheduleToastPositionUpdate = () => {
    if(!import.meta.client) {
      return
    }

    if(positionRaf) {
      return
    }

    positionRaf = window.requestAnimationFrame(() => {
      positionRaf = null
      updateToastPosition()
    })
  }

  const attachWindowListeners = () => {
    if(!import.meta.client || windowListenersAttached) {
      return
    }

    windowListenersAttached = true
    window.addEventListener('scroll', scheduleToastPositionUpdate, { passive: true })
    window.addEventListener('resize', scheduleToastPositionUpdate)
  }

  const detachWindowListeners = () => {
    if(!import.meta.client || !windowListenersAttached) {
      return
    }

    windowListenersAttached = false
    window.removeEventListener('scroll', scheduleToastPositionUpdate)
    window.removeEventListener('resize', scheduleToastPositionUpdate)

    if(positionRaf) {
      window.cancelAnimationFrame(positionRaf)
      positionRaf = null
    }
  }

  const clearToast = () => {
    ingredientToast.value = null
    ingredientToastPosition.value = null
    toastAnchorElement = null
    detachWindowListeners()
  }

  const showIngredientToast = (message: string, anchor?: HTMLElement | null) => {
    ingredientToast.value = message
    toastAnchorElement = anchor || null

    if(toastAnchorElement) {
      attachWindowListeners()
      updateToastPosition()
    } else {
      ingredientToastPosition.value = null
      detachWindowListeners()
    }

    if(toastTimer) {
      clearTimeout(toastTimer)
    }

    toastTimer = setTimeout(() => {
      clearToast()
      toastTimer = null
    }, 2600)
  }

  const onRecipeContentClick = (event: Event) => {
    const target = event.target
    if(!(target instanceof HTMLElement)) {
      return
    }

    const button = target.closest('button.ingredient-ref') as HTMLButtonElement | null
    if(!button) {
      return
    }

    const key = (button.dataset.ingredient || '').toLowerCase()
    if(!key || !ingredientIndex) {
      return
    }

    const amount = ingredientIndex.amountByName.get(key)
    if(!amount) {
      return
    }

    showIngredientToast(amount, button)
  }

  const applyIngredientEnhancements = async () => {
    if(!import.meta.client) {
      return
    }

    const root = contentRoot.value
    if(!root) {
      return
    }

    await nextTick()

    ingredientIndex = getIngredientIndexFromDom(root)
    markIngredientsSection(root)
    enhanceDirectionsWithIngredientButtons(root, ingredientIndex)

    if(!clickListenerAttached) {
      root.addEventListener('click', onRecipeContentClick)
      clickListenerAttached = true
    }
  }

  onMounted(() => {
    applyIngredientEnhancements()
  })

  watch(() => recipePath.value, (value) => {
    if(!value) {
      return
    }

    clearToast()
    applyIngredientEnhancements()
  })

  onBeforeUnmount(() => {
    if(toastTimer) {
      clearTimeout(toastTimer)
      toastTimer = null
    }

    clearToast()

    const root = contentRoot.value
    if(root && clickListenerAttached) {
      root.removeEventListener('click', onRecipeContentClick)
      clickListenerAttached = false
    }
  })

  return {
    ingredientToast,
    ingredientToastPosition,
    applyIngredientEnhancements
  }
}
