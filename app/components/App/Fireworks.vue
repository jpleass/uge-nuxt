<script lang="ts" setup>
// Spawns a game-of-life firework burst at every body click. Bursts are teleported
// to <body> and positioned with *page* coordinates so they stay pinned to the
// document (not the viewport) as the page scrolls. Bursts do not fade out: their
// final frame stays painted until — when the MAX_BURSTS ceiling is hit — the
// oldest is popped to make room for the new one.
//
// Each burst is anchored to the element it was clicked on, as a *fraction* of that
// element's box. On resize the page coordinates are recomputed from the element's
// current position, so the burst stays over the same spot in the (reflowed)
// content rather than at a now-stale absolute page coordinate.
interface Burst {
  id: number
  x: number
  y: number
  // Anchor: the clicked element plus the fractional offset within its box.
  el: HTMLElement
  fx: number
  fy: number
}

const MAX_BURSTS = 12

const bursts = ref<Burst[]>([])
let nextId = 0

// Resolve a burst's anchor to current page coordinates. Returns null if the
// anchor element has left the DOM (e.g. content navigated away).
function resolve(burst: Burst): { x: number; y: number } | null {
  if (!burst.el.isConnected) return null
  const rect = burst.el.getBoundingClientRect()
  return {
    x: rect.left + burst.fx * rect.width + window.scrollX,
    y: rect.top + burst.fy * rect.height + window.scrollY,
  }
}

function spawn(e: MouseEvent) {
  const el = e.target as HTMLElement | null
  if (!el) return
  const rect = el.getBoundingClientRect()
  // Fractional offset within the element's box, so the anchor survives reflow
  // and scaling of that element on resize.
  const fx = rect.width ? (e.clientX - rect.left) / rect.width : 0.5
  const fy = rect.height ? (e.clientY - rect.top) / rect.height : 0.5
  // pageX/pageY include scroll offset → document-anchored coordinates.
  bursts.value.push({ id: nextId++, x: e.pageX, y: e.pageY, el, fx, fy })
  // Pop the oldest instances off the front once we exceed the ceiling.
  if (bursts.value.length > MAX_BURSTS) {
    bursts.value.splice(0, bursts.value.length - MAX_BURSTS)
  }
}

function reposition() {
  for (const burst of bursts.value) {
    const pos = resolve(burst)
    if (pos) {
      burst.x = pos.x
      burst.y = pos.y
    }
  }
}

onMounted(() => {
  document.addEventListener('click', spawn)
  window.addEventListener('resize', reposition)
})

onUnmounted(() => {
  document.removeEventListener('click', spawn)
  window.removeEventListener('resize', reposition)
})
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <!-- <AppCursorCell /> -->
      <AppFireworkBurst
        v-for="burst in bursts"
        :key="burst.id"
        :x="burst.x"
        :y="burst.y"
      />
    </Teleport>
  </ClientOnly>
</template>
