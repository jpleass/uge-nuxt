<script lang="ts" setup>
// A single retro block — the same size as a firework-burst pixel — that snaps to an
// invisible viewport grid under the cursor. It reinforces the page's interactivity
// before the user clicks: the cell jumps cell-to-cell as the mouse moves, filled in
// the live global colour. Touch is ignored (no hover cursor to track).
//
// Uses a smaller scale than the firework bursts so the cursor cell reads as a finer
// pixel than the chunky burst blocks.
const CURSOR_CELL_SCALE = CELL_SCALE

const { pixelSize } = useFrameScale()

const cellSize = computed(() => pixelSize.value * CURSOR_CELL_SCALE)

const x = ref(0)
const y = ref(0)
const visible = ref(false)

// Snap to the grid so the cell "jumps" cell-to-cell rather than tracking smoothly.
const style = computed(() => ({
  left: `${Math.floor(x.value / cellSize.value) * cellSize.value}px`,
  top: `${Math.floor(y.value / cellSize.value) * cellSize.value}px`,
  width: `${cellSize.value}px`,
  height: `${cellSize.value}px`,
}))

let rafId: number | null = null
let pendingX = 0
let pendingY = 0

function onMove(e: PointerEvent) {
  if (e.pointerType === 'touch') return
  pendingX = e.clientX
  pendingY = e.clientY
  // Coalesce to at most one reactive update per frame.
  if (rafId === null) {
    rafId = requestAnimationFrame(() => {
      rafId = null
      x.value = pendingX
      y.value = pendingY
      visible.value = true
    })
  }
}

function hide() {
  visible.value = false
}

onMounted(() => {
  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerleave', hide)
  document.addEventListener('pointercancel', hide)
})

onUnmounted(() => {
  document.removeEventListener('pointermove', onMove)
  document.removeEventListener('pointerleave', hide)
  document.removeEventListener('pointercancel', hide)
  if (rafId !== null) cancelAnimationFrame(rafId)
})
</script>

<template>
  <div v-show="visible" class="cursor-cell" :style="style" />
</template>

<style scoped>
.cursor-cell {
  position: fixed;
  z-index: 59;
  pointer-events: none;
  image-rendering: pixelated;
  background: var(--color-global);
}
</style>
