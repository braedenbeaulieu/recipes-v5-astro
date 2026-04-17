<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  label?: string
  storageKey?: string
}>(), {
  label: 'Keep screen awake',
  storageKey: 'recipes:keep-screen-awake'
})

const keepScreenAwake = ref(false)
const keepScreenAwakeUnsupported = ref(false)

type WakeLockSentinelLike = {
  release: () => Promise<void>
  addEventListener?: (type: string, listener: () => void) => void
}

let wakeLock: WakeLockSentinelLike | null = null
let wakeLockRetryArmed = false

const supportsWakeLock = computed(() => {
  if(!import.meta.client) {
    return false
  }

  return 'wakeLock' in navigator
})

const disarmWakeLockRetry = () => {
  if(!import.meta.client || !wakeLockRetryArmed) {
    return
  }

  wakeLockRetryArmed = false
  window.removeEventListener('pointerdown', onWakeLockRetryGesture)
  window.removeEventListener('keydown', onWakeLockRetryGesture)
}

const scheduleWakeLockRetry = () => {
  if(!import.meta.client || wakeLockRetryArmed) {
    return
  }

  wakeLockRetryArmed = true
  window.addEventListener('pointerdown', onWakeLockRetryGesture, { once: true })
  window.addEventListener('keydown', onWakeLockRetryGesture, { once: true })
}

const onWakeLockRetryGesture = () => {
  wakeLockRetryArmed = false

  if(keepScreenAwake.value && !wakeLock) {
    requestWakeLock()
  }
}

const requestWakeLock = async () => {
  if(!import.meta.client || !keepScreenAwake.value || wakeLock) {
    return
  }

  if(!supportsWakeLock.value) {
    keepScreenAwakeUnsupported.value = true
    return
  }

  try {
    keepScreenAwakeUnsupported.value = false
    const sentinel = await (navigator as any).wakeLock.request('screen') as WakeLockSentinelLike
    wakeLock = sentinel
    sentinel.addEventListener?.('release', () => {
      if(wakeLock === sentinel) {
        wakeLock = null
      }
    })
  } catch(error: any) {
    const errorName = error?.name

    if(errorName === 'NotAllowedError' || errorName === 'SecurityError') {
      scheduleWakeLockRetry()
      return
    }

    keepScreenAwake.value = false
  }
}

const releaseWakeLock = async () => {
  if(!wakeLock) {
    return
  }

  try {
    await wakeLock.release()
  } catch {
    // ignore
  } finally {
    wakeLock = null
  }
}

const onVisibilityChange = () => {
  if(!import.meta.client) {
    return
  }

  if(document.visibilityState === 'visible') {
    if(keepScreenAwake.value) {
      requestWakeLock()
    }
  } else {
    releaseWakeLock()
  }
}

const onPageHide = () => {
  releaseWakeLock()
}

onMounted(() => {
  if(!import.meta.client) {
    return
  }

  const savedPreference = window.localStorage.getItem(props.storageKey)
  keepScreenAwake.value = savedPreference === '1'

  if(keepScreenAwake.value && !supportsWakeLock.value) {
    keepScreenAwakeUnsupported.value = true
    keepScreenAwake.value = false
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', onPageHide)

  if(keepScreenAwake.value) {
    scheduleWakeLockRetry()
    requestWakeLock()
  }
})

onBeforeUnmount(() => {
  if(import.meta.client) {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pagehide', onPageHide)
    disarmWakeLockRetry()
  }

  releaseWakeLock()
})

watch(keepScreenAwake, (value) => {
  if(!import.meta.client) {
    return
  }

  if(value && !supportsWakeLock.value) {
    keepScreenAwakeUnsupported.value = true
    keepScreenAwake.value = false
    window.localStorage.setItem(props.storageKey, '0')
    return
  }

  window.localStorage.setItem(props.storageKey, value ? '1' : '0')

  if(value) {
    requestWakeLock()
  } else {
    keepScreenAwakeUnsupported.value = false
    disarmWakeLockRetry()
    releaseWakeLock()
  }
})
</script>

<template>
  <div class="keep-awake-toggle" role="group" aria-label="Reading preferences">
    <label class="keep-awake-toggle__label" for="keep-screen-awake">
      <span class="keep-awake-toggle__text">{{ label }}</span>
      <span class="keep-awake-toggle__control">
        <input
          id="keep-screen-awake"
          v-model="keepScreenAwake"
          class="keep-awake-toggle__input"
          type="checkbox"
          role="switch"
        >
        <span class="keep-awake-toggle__switch" aria-hidden="true"></span>
      </span>
    </label>
    <p v-if="keepScreenAwakeUnsupported" class="keep-awake-toggle__note">Not supported in this browser.</p>
  </div>
</template>

<style scoped>
.keep-awake-toggle {
  margin: 0;
  padding: 0.75rem 0.9rem;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--panel);
  /* max-width: 260px; */
  height: 60px;
}

.keep-awake-toggle__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  color: var(--text);
  cursor: pointer;
  user-select: none;
  height: 100%;
}

.keep-awake-toggle__text {
  line-height: 1.2;
}

.keep-awake-toggle__control {
  position: relative;
  flex: 0 0 auto;
}

.keep-awake-toggle__input {
  position: absolute;
  inset: 0;
  margin: 0;
  width: 46px;
  height: 28px;
  opacity: 0;
  cursor: pointer;
  z-index: 1;
}

.keep-awake-toggle__switch {
  position: relative;
  display: inline-flex;
  width: 46px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg);
  box-shadow: inset 0 1px 0 var(--panel-soft);
  transition: background 0.15s ease, border-color 0.15s ease;
  pointer-events: none;
}

.keep-awake-toggle__switch::after {
  content: '';
  position: absolute;
  top: 1px;
  left: 1px;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--bg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-float);
  transition: transform 0.15s ease;
}

.keep-awake-toggle__input:checked + .keep-awake-toggle__switch {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: inset 0 1px 0 var(--panel-soft), 0 0 0 3px var(--accent-soft);
}

.keep-awake-toggle__input:checked + .keep-awake-toggle__switch::after {
  transform: translateX(18px);
  border-color: var(--search-bg);
}

.keep-awake-toggle__input:focus-visible + .keep-awake-toggle__switch {
  outline: none;
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.keep-awake-toggle__input:disabled {
  cursor: not-allowed;
}

.keep-awake-toggle__input:disabled + .keep-awake-toggle__switch {
  opacity: 0.6;
}

.keep-awake-toggle__note {
  margin: 0.45rem 0 0;
  color: var(--muted);
  font-size: 0.85rem;
  line-height: 1.35;
}
</style>
