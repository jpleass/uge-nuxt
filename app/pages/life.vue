<script lang="ts" setup>
// Dev-only authoring tool: a 136×180 Conway board (1 cell = 1 exported pixel)
// recordable to a sequence of 1-bit black-and-white BMPs zipped up for
// download.
//
// Two seeding modes:
// - "bursts" runs the same firework-burst simulation as AppFireworkBurst, but
//   seeded continuously so it never dies out.
// - "image" thresholds a source picture into the starting generation and then
//   leaves the board alone, so the sequence is a deterministic decay of that
//   picture rather than endless soup.
//
// The live preview and the recording are deliberately separate: recording runs
// its own buffers as fast as the CPU allows rather than in realtime, so the
// exported sequence is exact and the preview keeps playing underneath.
//
// This route is stripped from production builds in nuxt.config.ts.

const WIDTH = 136
const HEIGHT = 180
const SIZE = WIDTH * HEIGHT
const PREVIEW_SCALE = 3
// Encoding is a long synchronous-ish grind; yield to the browser this often so
// the progress readout actually repaints.
const YIELD_EVERY = 10

const frameCount = ref(180)
const seedMode = ref<'bursts' | 'image'>('bursts')
// Continuous seeding means the board gets busier over a run. Without a warm-up
// the first exported frames are nearly empty and the last are dense; running
// some steps before capture starts the sequence at a settled density.
const warmupSteps = ref(60)
const burstInterval = ref(3) // simulation steps between spawn events (0 = never)
const burstsPerSpawn = ref(3) // bursts dropped at each spawn event
const seedDensity = ref(0.35) // fraction of cells in a burst disc that start alive
const seedRadiusMin = ref(3)
const seedRadiusMax = ref(6)
const fps = ref(15)
const playing = ref(true)

// Image mode. Cells are painted black-on-white, so dark pixels become live
// cells: alive when luminance is below the threshold, unless inverted.
const imageName = ref('')
const threshold = ref(0.5)
const invert = ref(false)

const canvas = ref<HTMLCanvasElement | null>(null)
const exporting = ref(false)
const progress = ref('')

let cells = new Uint8Array(SIZE)
let scratch = new Uint8Array(SIZE)
// Kept out of reactive state: the decoded source is only ever read pixel-wise,
// and `imageSeed` is the rasterised board it thresholds down to.
let sourceImage: ImageBitmap | null = null
let imageSeed: Uint8Array | null = null
let step = 0
let rafId: number | null = null
let accumulator = 0
let last = 0

const idx = (x: number, y: number) => y * WIDTH + x

/**
 * Stamp a disc of random live cells centred on `(cx, cy)`. Unlike the firework
 * version this only ever writes 1s: bursts land on a board that already has
 * life on it, and overwriting the disc would punch dead holes in whatever
 * patterns are passing through.
 */
function seedBurst(board: Uint8Array, cx: number, cy: number) {
  const min = seedRadiusMin.value
  const max = Math.max(min, seedRadiusMax.value)
  const radius = min + Math.random() * (max - min)
  const r = Math.ceil(radius)
  const density = seedDensity.value

  for (let y = Math.max(0, cy - r); y <= Math.min(HEIGHT - 1, cy + r); y++) {
    for (let x = Math.max(0, cx - r); x <= Math.min(WIDTH - 1, cx + r); x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy > radius * radius) continue
      if (Math.random() < density) board[idx(x, y)] = 1
    }
  }
}

/** Drop a burst at a random position, inset so the disc is never clipped. */
function seedRandomBurst(board: Uint8Array) {
  const inset = Math.ceil(Math.max(seedRadiusMin.value, seedRadiusMax.value))
  const cx = inset + Math.floor(Math.random() * Math.max(1, WIDTH - inset * 2))
  const cy = inset + Math.floor(Math.random() * Math.max(1, HEIGHT - inset * 2))
  seedBurst(board, cx, cy)
}

/**
 * One spawn event. Life thins random soup out fast, so on a board this size a
 * single burst per event leaves the frame nearly empty — hence a burst count.
 */
function spawnBursts(board: Uint8Array) {
  for (let i = 0; i < burstsPerSpawn.value; i++) seedRandomBurst(board)
}

/**
 * Whether step `n` of a run is a spawn event. Image mode never spawns: the
 * whole point is that the picture decays untouched, so this is the single
 * gate that keeps random bursts out of both the preview and the export.
 */
function isSpawnStep(n: number) {
  if (seedMode.value === 'image') return false
  return burstInterval.value > 0 && n % burstInterval.value === 0
}

/**
 * Threshold `sourceImage` down to a board's worth of cells. Fitted "contain"
 * so the whole picture survives, over an opaque white ground so transparency
 * reads as background rather than as black.
 */
function rasteriseImage() {
  if (!sourceImage) {
    imageSeed = null
    return
  }

  const off = document.createElement('canvas')
  off.width = WIDTH
  off.height = HEIGHT
  const ctx = off.getContext('2d', { willReadFrequently: true })
  if (!ctx) return

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  const scale = Math.min(WIDTH / sourceImage.width, HEIGHT / sourceImage.height)
  const w = sourceImage.width * scale
  const h = sourceImage.height * scale
  ctx.drawImage(
    sourceImage,
    Math.round((WIDTH - w) / 2),
    Math.round((HEIGHT - h) / 2),
    Math.round(w),
    Math.round(h),
  )

  const { data } = ctx.getImageData(0, 0, WIDTH, HEIGHT)
  const seed = imageSeed ?? new Uint8Array(SIZE)
  const cut = threshold.value
  const flip = invert.value

  for (let i = 0; i < SIZE; i++) {
    const o = i * 4
    const lum =
      (0.2126 * data[o]! + 0.7152 * data[o + 1]! + 0.0722 * data[o + 2]!) / 255
    seed[i] = (flip ? lum >= cut : lum < cut) ? 1 : 0
  }

  imageSeed = seed
}

function liveNeighbours(board: Uint8Array, x: number, y: number) {
  let n = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const nx = x + dx
      const ny = y + dy
      // Bounded grid: off-board counts as dead, so the edges act as a border.
      if (
        nx >= 0 &&
        nx < WIDTH &&
        ny >= 0 &&
        ny < HEIGHT &&
        board[idx(nx, ny)]
      ) {
        n++
      }
    }
  }
  return n
}

/** Conway B3/S23 from `src` into `dst`. */
function stepBoard(src: Uint8Array, dst: Uint8Array) {
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const n = liveNeighbours(src, x, y)
      const alive = src[idx(x, y)]
      dst[idx(x, y)] = (alive ? n === 2 || n === 3 : n === 3) ? 1 : 0
    }
  }
}

/** Opaque black-on-white, one cell per pixel. */
function paint(ctx: CanvasRenderingContext2D, board: Uint8Array) {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.fillStyle = '#000000'
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      if (board[idx(x, y)]) ctx.fillRect(x, y, 1, 1)
    }
  }
}

function render() {
  const ctx = canvas.value?.getContext('2d')
  if (ctx) paint(ctx, cells)
}

function tick() {
  if (isSpawnStep(step)) spawnBursts(cells)
  stepBoard(cells, scratch)
  ;[cells, scratch] = [scratch, cells]
  step++
}

function loop(now: number) {
  const stepMs = 1000 / Math.max(1, fps.value)
  accumulator += now - last
  last = now

  let stepped = false
  // Cap catch-up so a backgrounded tab doesn't come back and simulate for
  // several seconds in one frame.
  let budget = 4
  while (accumulator >= stepMs && budget-- > 0) {
    accumulator -= stepMs
    tick()
    stepped = true
  }
  if (accumulator > stepMs) accumulator = 0
  if (stepped) render()

  rafId = requestAnimationFrame(loop)
}

function clearBoard() {
  cells = new Uint8Array(SIZE)
  scratch = new Uint8Array(SIZE)
  step = 0
  render()
}

function reseed() {
  clearBoard()
  if (seedMode.value === 'image') {
    if (imageSeed) cells.set(imageSeed)
  } else {
    spawnBursts(cells)
  }
  render()
}

async function onPickImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    const bitmap = await createImageBitmap(file)
    sourceImage?.close()
    sourceImage = bitmap
    imageName.value = file.name
    seedMode.value = 'image'
    rasteriseImage()
    reseed()
    progress.value = ''
  } catch (error) {
    progress.value = `could not read image: ${(error as Error).message}`
  }
}

const nextTask = () => new Promise((resolve) => setTimeout(resolve))

/**
 * Simulate a fresh run on private buffers — so the live preview is untouched
 * and the sequence is exact rather than realtime — then encode every captured
 * generation as a 1-bit BMP and hand the lot back as a single ZIP.
 */
async function exportFrames() {
  if (exporting.value) return
  exporting.value = true

  try {
    const image = seedMode.value === 'image'
    if (image && !imageSeed) {
      progress.value = 'no image loaded'
      return
    }

    const total = Math.max(1, Math.floor(frameCount.value))
    // Warm-up is meaningless in image mode: the picture itself is the first
    // frame, so there is nothing to settle before capture starts.
    const warmup = image ? 0 : Math.max(0, Math.floor(warmupSteps.value))
    // `slice` so the run works on its own copy and the preview's seed survives.
    let src = image ? imageSeed!.slice() : new Uint8Array(SIZE)
    let dst = new Uint8Array(SIZE)
    const frames: Uint8Array[] = []

    // Frame 0 is the untouched seed; the loop below then owes one fewer step.
    if (image) frames.push(src.slice())
    const steps = warmup + total - frames.length

    for (let i = 0; i < steps; i++) {
      if (isSpawnStep(i)) spawnBursts(src)
      stepBoard(src, dst)
      ;[src, dst] = [dst, src]
      if (i >= warmup) frames.push(src.slice())

      if (i % YIELD_EVERY === 0) {
        progress.value = `simulating ${i + 1}/${steps}`
        await nextTask()
      }
    }

    const files: { name: string; data: Uint8Array }[] = []
    for (let i = 0; i < frames.length; i++) {
      files.push({
        name: `frame-${String(i).padStart(4, '0')}.bmp`,
        data: encodeBmp(frames[i]!, WIDTH, HEIGHT),
      })

      if (i % YIELD_EVERY === 0) {
        progress.value = `encoding ${i + 1}/${total}`
        await nextTask()
      }
    }

    progress.value = 'zipping…'
    await nextTask()

    const url = URL.createObjectURL(createZip(files))
    const a = document.createElement('a')
    a.href = url
    a.download = `life-${seedMode.value}-${WIDTH}x${HEIGHT}-${total}frames.zip`
    a.click()
    URL.revokeObjectURL(url)

    progress.value = `exported ${total} frames`
  } catch (error) {
    progress.value = `failed: ${(error as Error).message}`
  } finally {
    exporting.value = false
  }
}

// Re-seed live so the threshold slider is tuned by eye against the preview.
watch([threshold, invert, seedMode], () => {
  rasteriseImage()
  reseed()
})

watch(playing, (on) => {
  if (on && rafId === null) {
    last = performance.now()
    accumulator = 0
    rafId = requestAnimationFrame(loop)
  } else if (!on && rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
})

onMounted(() => {
  reseed()
  last = performance.now()
  rafId = requestAnimationFrame(loop)
})

onUnmounted(() => {
  if (rafId !== null) cancelAnimationFrame(rafId)
  sourceImage?.close()
})

setPage({ title: 'Life' })
</script>

<template>
  <div
    class="text-xs text-neutral-900 font-mono p-8 bg-neutral-100 flex flex-wrap gap-8 items-start inset-0 fixed z-50 overflow-auto"
  >
    <canvas
      ref="canvas"
      class="life-canvas border border-neutral-400 shrink-0"
      :width="WIDTH"
      :height="HEIGHT"
      :style="{
        width: `${WIDTH * PREVIEW_SCALE}px`,
        height: `${HEIGHT * PREVIEW_SCALE}px`,
      }"
    />

    <div class="flex flex-col gap-4 w-64">
      <div class="font-bold">game of life — {{ WIDTH }}×{{ HEIGHT }}</div>

      <div class="flex gap-2">
        <button
          v-for="mode in ['bursts', 'image'] as const"
          :key="mode"
          type="button"
          class="px-2 py-1 border border-neutral-400"
          :class="
            seedMode === mode
              ? 'text-white border-neutral-900 bg-neutral-900'
              : 'bg-white hover:bg-neutral-200'
          "
          @click="seedMode = mode"
        >
          {{ mode }}
        </button>
      </div>

      <label class="flex gap-2 items-center justify-between">
        <span>frames</span>
        <input
          v-model.number="frameCount"
          type="number"
          min="1"
          max="2000"
          class="px-1 py-0.5 border border-neutral-400 bg-white w-24"
        />
      </label>

      <template v-if="seedMode === 'image'">
        <label class="flex flex-col gap-1">
          <span>image</span>
          <input
            type="file"
            accept="image/*"
            class="w-full"
            @change="onPickImage"
          />
          <span v-if="imageName" class="text-neutral-600 truncate">
            {{ imageName }}
          </span>
        </label>

        <label class="flex gap-2 items-center justify-between">
          <span>threshold {{ threshold.toFixed(2) }}</span>
          <input
            v-model.number="threshold"
            type="range"
            min="0.05"
            max="0.95"
            step="0.01"
            class="w-24"
          />
        </label>

        <label class="flex gap-2 items-center justify-between">
          <span>invert</span>
          <input v-model="invert" type="checkbox" class="w-24" />
        </label>
      </template>

      <template v-else>
        <label class="flex gap-2 items-center justify-between">
          <span>warm-up steps</span>
          <input
            v-model.number="warmupSteps"
            type="number"
            min="0"
            max="1000"
            class="px-1 py-0.5 border border-neutral-400 bg-white w-24"
          />
        </label>

        <label class="flex gap-2 items-center justify-between">
          <span>burst interval</span>
          <input
            v-model.number="burstInterval"
            type="number"
            min="0"
            max="120"
            class="px-1 py-0.5 border border-neutral-400 bg-white w-24"
          />
        </label>

        <label class="flex gap-2 items-center justify-between">
          <span>bursts per spawn</span>
          <input
            v-model.number="burstsPerSpawn"
            type="number"
            min="1"
            max="40"
            class="px-1 py-0.5 border border-neutral-400 bg-white w-24"
          />
        </label>

        <label class="flex gap-2 items-center justify-between">
          <span>density {{ seedDensity.toFixed(2) }}</span>
          <input
            v-model.number="seedDensity"
            type="range"
            min="0.05"
            max="0.9"
            step="0.01"
            class="w-24"
          />
        </label>

        <label class="flex gap-2 items-center justify-between">
          <span>radius min</span>
          <input
            v-model.number="seedRadiusMin"
            type="number"
            min="1"
            max="40"
            class="px-1 py-0.5 border border-neutral-400 bg-white w-24"
          />
        </label>

        <label class="flex gap-2 items-center justify-between">
          <span>radius max</span>
          <input
            v-model.number="seedRadiusMax"
            type="number"
            min="1"
            max="40"
            class="px-1 py-0.5 border border-neutral-400 bg-white w-24"
          />
        </label>
      </template>

      <label class="flex gap-2 items-center justify-between">
        <span>preview fps {{ fps }}</span>
        <input
          v-model.number="fps"
          type="range"
          min="1"
          max="60"
          class="w-24"
        />
      </label>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="px-2 py-1 border border-neutral-400 bg-white hover:bg-neutral-200"
          @click="playing = !playing"
        >
          {{ playing ? 'pause' : 'play' }}
        </button>
        <button
          type="button"
          class="px-2 py-1 border border-neutral-400 bg-white hover:bg-neutral-200"
          @click="reseed"
        >
          {{ seedMode === 'image' ? 'restart' : 'reseed' }}
        </button>
        <button
          type="button"
          class="px-2 py-1 border border-neutral-400 bg-white hover:bg-neutral-200"
          @click="clearBoard"
        >
          clear
        </button>
      </div>

      <button
        type="button"
        class="text-white px-2 py-1 border border-neutral-900 bg-neutral-900 disabled:opacity-50"
        :disabled="exporting"
        @click="exportFrames"
      >
        {{ exporting ? 'exporting…' : 'export zip of bmps' }}
      </button>

      <div class="text-neutral-600 min-h-4">{{ progress }}</div>
    </div>
  </div>
</template>

<style scoped>
.life-canvas {
  image-rendering: pixelated;
}
</style>
