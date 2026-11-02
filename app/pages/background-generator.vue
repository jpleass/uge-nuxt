<script lang="ts" setup>
// Dev-only authoring tool: static Game of Life backgrounds for print and
// social posts. A board is seeded, run for a fixed number of generations, and
// the final generation is painted at an exact export size in chosen colours.
//
// Every version comes from a seeded PRNG, so a background is fully described
// by its settings plus its seed number: version i of a batch is `seed + i`,
// and re-entering a seed reproduces it exactly.
//
// This route is stripped from production builds in nuxt.config.ts.

interface Preset {
  label: string
  width: number
  height: number
}

// Add more fixed sizes here.
const PRESETS: Preset[] = [{ label: '1080×1440', width: 1080, height: 1440 }]

// Thumbnails are a picker, not a proof; cap them so a large batch doesn't
// stall every input change.
const MAX_THUMBS = 24
const THUMB_WIDTH = 160
// Pause between separate downloads. Browsers drop or merge downloads fired in
// the same tick.
const DOWNLOAD_GAP_MS = 250

/**
 * A number input's model, read safely. Clearing or mistyping a field leaves
 * its model as `''`/`null`; reading that raw would turn 0 into 1px cells (a
 * board millions of cells big) or string-concatenate the seed. This keeps the
 * last valid value until the field holds a real number again, clamped.
 */
function useNumberInput(initial: number, min: number, max: number) {
  const input = ref<number | string | null>(initial)
  let last = initial
  const value = computed(() => {
    const raw = input.value
    const n = raw === '' || raw === null ? Number.NaN : Number(raw)
    if (Number.isFinite(n)) last = Math.min(max, Math.max(min, Math.floor(n)))
    return last
  })
  return [input, value] as const
}

const preset = ref<string>(PRESETS[0]!.label)
const [customWidthInput, customWidth] = useNumberInput(2480, 1, 10000)
const [customHeightInput, customHeight] = useNumberInput(3508, 1, 10000)

const [cellSizeInput, cellSize] = useNumberInput(8, 1, 500) // px per cell in the export
const [cellGapInput, cellGap] = useNumberInput(0, 0, 499) // px of background between neighbouring cells
const background = ref('#F5F5F5')
const foreground = ref('#d1a132')

const seedMode = ref<'soup' | 'bursts'>('bursts')
const soupDensity = ref(0.3) // fraction of the board that starts alive
const [burstCountInput, burstCount] = useNumberInput(16, 1, 500)
const burstDensity = ref(0.23) // fraction of cells in a burst disc that start alive
const [radiusMinInput, radiusMin] = useNumberInput(2, 1, 500)
const [radiusMaxInput, radiusMax] = useNumberInput(16, 1, 500)
const generations = ref(32)
const wrap = ref(true) // torus; off = off-board counts as dead, like /life

const [seedInput, seed] = useNumberInput(1, 0, 4294967295) // first seed of the batch
// Which version the large preview shows. Picking a thumbnail sets this without
// moving the batch, so the strip stays put while you compare.
const selected = ref(1)
const [versionsInput, versions] = useNumberInput(6, 1, 500)
const exportAs = ref<'files' | 'zip'>('files')

const canvas = ref<HTMLCanvasElement | null>(null)
const thumbs = ref<HTMLCanvasElement[]>([])
const exporting = ref(false)
const progress = ref('')

const size = computed(() => {
  const p = PRESETS.find((p) => p.label === preset.value)
  if (p) return { width: p.width, height: p.height }
  return {
    width: Math.max(1, Math.floor(customWidth.value)),
    height: Math.max(1, Math.floor(customHeight.value)),
  }
})

/**
 * Board dimensions for the current export size. Pixels that don't divide into
 * whole cells are split evenly either side so the pattern sits centred.
 */
const grid = computed(() => {
  const cell = Math.max(1, Math.floor(cellSize.value))
  const cols = Math.max(1, Math.floor(size.value.width / cell))
  const rows = Math.max(1, Math.floor(size.value.height / cell))
  return {
    cell,
    cols,
    rows,
    marginX: Math.floor((size.value.width - cols * cell) / 2),
    marginY: Math.floor((size.value.height - rows * cell) / 2),
  }
})

const thumbSeeds = computed(() =>
  Array.from(
    { length: Math.min(MAX_THUMBS, Math.max(1, Math.floor(versions.value))) },
    (_, i) => seed.value + i,
  ),
)

/** mulberry32: tiny, fast, and good enough for scattering cells. */
function createRng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedSoup(board: Uint8Array, rng: () => number) {
  const density = soupDensity.value
  for (let i = 0; i < board.length; i++) board[i] = rng() < density ? 1 : 0
}

/** Discs of random live cells, as /life's bursts, but placed by `rng`. */
function seedBursts(
  board: Uint8Array,
  cols: number,
  rows: number,
  rng: () => number,
) {
  const min = Math.max(1, radiusMin.value)
  const max = Math.max(min, radiusMax.value)
  const density = burstDensity.value

  for (let b = 0; b < burstCount.value; b++) {
    const cx = Math.floor(rng() * cols)
    const cy = Math.floor(rng() * rows)
    const radius = min + rng() * (max - min)
    const r = Math.ceil(radius)

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue
        let x = cx + dx
        let y = cy + dy
        if (wrap.value) {
          x = (x + cols) % cols
          y = (y + rows) % rows
        } else if (x < 0 || x >= cols || y < 0 || y >= rows) {
          continue
        }
        if (rng() < density) board[y * cols + x] = 1
      }
    }
  }
}

/** Conway B3/S23 from `src` into `dst`. */
function stepBoard(
  src: Uint8Array,
  dst: Uint8Array,
  cols: number,
  rows: number,
) {
  const torus = wrap.value
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let n = 0
      for (let dy = -1; dy <= 1; dy++) {
        let ny = y + dy
        if (torus) ny = (ny + rows) % rows
        else if (ny < 0 || ny >= rows) continue
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          let nx = x + dx
          if (torus) nx = (nx + cols) % cols
          else if (nx < 0 || nx >= cols) continue
          n += src[ny * cols + nx]!
        }
      }
      const alive = src[y * cols + x]
      dst[y * cols + x] = (alive ? n === 2 || n === 3 : n === 3) ? 1 : 0
    }
  }
}

/** Seed a board from `versionSeed` and run it to the final generation. */
function generate(versionSeed: number) {
  const { cols, rows } = grid.value
  const rng = createRng(versionSeed)
  let src = new Uint8Array(cols * rows)
  let dst = new Uint8Array(cols * rows)

  if (seedMode.value === 'soup') seedSoup(src, rng)
  else seedBursts(src, cols, rows, rng)

  const steps = Math.max(0, Math.floor(generations.value))
  for (let i = 0; i < steps; i++) {
    stepBoard(src, dst, cols, rows)
    ;[src, dst] = [dst, src]
  }
  return src
}

/**
 * Paint `board` at export resolution. `scale` shrinks the whole drawing for
 * thumbnails while keeping the same layout.
 */
function paint(ctx: CanvasRenderingContext2D, board: Uint8Array, scale = 1) {
  const { cell, cols, rows, marginX, marginY } = grid.value
  const drawn = Math.max(1, cell - Math.max(0, Math.floor(cellGap.value)))
  // Centre the shrunken cell in its slot so gaps are even on every side.
  const inset = Math.floor((cell - drawn) / 2)

  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.fillStyle = background.value
  ctx.fillRect(0, 0, size.value.width, size.value.height)
  ctx.fillStyle = foreground.value
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!board[y * cols + x]) continue
      ctx.fillRect(
        marginX + x * cell + inset,
        marginY + y * cell + inset,
        drawn,
        drawn,
      )
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}

function render() {
  const main = canvas.value?.getContext('2d')
  if (main) paint(main, generate(selected.value))

  const scale = THUMB_WIDTH / size.value.width
  thumbSeeds.value.forEach((s, i) => {
    const ctx = thumbs.value[i]?.getContext('2d')
    if (ctx) paint(ctx, generate(s), scale)
  })
}

function randomiseSeed() {
  seedInput.value = Math.floor(Math.random() * 100000)
}

const nextTask = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms))

function toPng(versionSeed: number) {
  const off = document.createElement('canvas')
  off.width = size.value.width
  off.height = size.value.height
  const ctx = off.getContext('2d')
  if (!ctx) throw new Error('no canvas context')
  paint(ctx, generate(versionSeed))
  return new Promise<Blob>((resolve, reject) =>
    off.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('png encode failed'))),
      'image/png',
    ),
  )
}

const fileName = (versionSeed: number) =>
  `bg-${size.value.width}x${size.value.height}-seed${String(versionSeed).padStart(5, '0')}.png`

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export `seeds` as PNGs at the exact export size, either as separate
 * downloads or bundled into one ZIP.
 */
async function exportSeeds(seeds: number[], zip: boolean) {
  if (exporting.value) return
  exporting.value = true

  try {
    const files: { name: string; data: Uint8Array }[] = []

    for (let i = 0; i < seeds.length; i++) {
      progress.value = `rendering ${i + 1}/${seeds.length}`
      await nextTask()
      const s = seeds[i]!
      const blob = await toPng(s)

      if (zip) {
        files.push({
          name: fileName(s),
          data: new Uint8Array(await blob.arrayBuffer()),
        })
      } else {
        download(blob, fileName(s))
        if (i < seeds.length - 1) await nextTask(DOWNLOAD_GAP_MS)
      }
    }

    if (zip) {
      progress.value = 'zipping…'
      await nextTask()
      download(
        createZip(files),
        `bg-${size.value.width}x${size.value.height}-${seeds.length}versions.zip`,
      )
    }

    progress.value = `exported ${seeds.length} png${seeds.length === 1 ? '' : 's'}`
  } catch (error) {
    progress.value = `failed: ${(error as Error).message}`
  } finally {
    exporting.value = false
  }
}

function exportCurrent() {
  exportSeeds([selected.value], false)
}

function exportBatch() {
  const n = Math.max(1, Math.floor(versions.value))
  exportSeeds(
    Array.from({ length: n }, (_, i) => seed.value + i),
    exportAs.value === 'zip',
  )
}

watchDebounced(
  [
    size,
    cellSize,
    cellGap,
    background,
    foreground,
    seedMode,
    soupDensity,
    burstCount,
    burstDensity,
    radiusMin,
    radiusMax,
    generations,
    wrap,
    seed,
    selected,
    versions,
  ],
  async () => {
    // Let canvas size and thumbnail list changes reach the DOM first.
    await nextTick()
    render()
  },
  { debounce: 150 },
)

watch(seed, (s) => (selected.value = s))

onMounted(render)

setPage({ title: 'Background generator' })

// A local authoring tool. The `pages:extend` hook in nuxt.config.ts strips this
// route from production builds entirely, but `dev --tunnel` can expose it — so
// noindex it too, belt and braces (also disallowed in robots.txt).
useHead({
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})
</script>

<template>
  <div
    class="text-xs text-neutral-900 font-mono p-8 bg-neutral-100 flex flex-wrap gap-8 items-start inset-0 fixed z-50 overflow-auto"
  >
    <div class="flex flex-col gap-4 w-64 shrink-0">
      <div class="font-bold">
        life backgrounds — {{ size.width }}×{{ size.height }}
      </div>
      <div class="text-neutral-600">
        board {{ grid.cols }}×{{ grid.rows }} cells
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="label in [...PRESETS.map((p) => p.label), 'custom']"
          :key="label"
          type="button"
          class="px-2 py-1 border border-neutral-400"
          :class="
            preset === label
              ? 'text-white border-neutral-900 bg-neutral-900'
              : 'bg-white hover:bg-neutral-200'
          "
          @click="preset = label"
        >
          {{ label }}
        </button>
      </div>

      <template v-if="preset === 'custom'">
        <label class="flex gap-2 items-center justify-between">
          <span>width px</span>
          <input
            v-model.lazy.number="customWidthInput"
            type="number"
            min="1"
            max="10000"
            class="px-1 py-0.5 border border-neutral-400 bg-white w-24"
          />
        </label>
        <label class="flex gap-2 items-center justify-between">
          <span>height px</span>
          <input
            v-model.lazy.number="customHeightInput"
            type="number"
            min="1"
            max="10000"
            class="px-1 py-0.5 border border-neutral-400 bg-white w-24"
          />
        </label>
      </template>

      <label class="flex gap-2 items-center justify-between">
        <span>cell size px</span>
        <input
          v-model.lazy.number="cellSizeInput"
          type="number"
          min="1"
          max="200"
          class="px-1 py-0.5 border border-neutral-400 bg-white w-24"
        />
      </label>

      <label class="flex gap-2 items-center justify-between">
        <span>cell gap px</span>
        <input
          v-model.lazy.number="cellGapInput"
          type="number"
          min="0"
          max="199"
          class="px-1 py-0.5 border border-neutral-400 bg-white w-24"
        />
      </label>

      <label class="flex gap-2 items-center justify-between">
        <span>background</span>
        <span class="flex gap-1 w-24">
          <input v-model="background" type="color" class="h-6 w-6 shrink-0" />
          <input
            v-model.lazy="background"
            type="text"
            class="px-1 py-0.5 border border-neutral-400 bg-white min-w-0"
          />
        </span>
      </label>

      <label class="flex gap-2 items-center justify-between">
        <span>cells</span>
        <span class="flex gap-1 w-24">
          <input v-model="foreground" type="color" class="h-6 w-6 shrink-0" />
          <input
            v-model.lazy="foreground"
            type="text"
            class="px-1 py-0.5 border border-neutral-400 bg-white min-w-0"
          />
        </span>
      </label>

      <div class="flex gap-2">
        <button
          v-for="mode in ['soup', 'bursts'] as const"
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

      <label
        v-if="seedMode === 'soup'"
        class="flex gap-2 items-center justify-between"
      >
        <span>density {{ soupDensity.toFixed(2) }}</span>
        <input
          v-model.number="soupDensity"
          type="range"
          min="0.01"
          max="0.9"
          step="0.01"
          class="w-24"
        />
      </label>

      <template v-else>
        <label class="flex gap-2 items-center justify-between">
          <span>bursts</span>
          <input
            v-model.lazy.number="burstCountInput"
            type="number"
            min="1"
            max="500"
            class="px-1 py-0.5 border border-neutral-400 bg-white w-24"
          />
        </label>
        <label class="flex gap-2 items-center justify-between">
          <span>density {{ burstDensity.toFixed(2) }}</span>
          <input
            v-model.number="burstDensity"
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
            v-model.lazy.number="radiusMinInput"
            type="number"
            min="1"
            max="200"
            class="px-1 py-0.5 border border-neutral-400 bg-white w-24"
          />
        </label>
        <label class="flex gap-2 items-center justify-between">
          <span>radius max</span>
          <input
            v-model.lazy.number="radiusMaxInput"
            type="number"
            min="1"
            max="200"
            class="px-1 py-0.5 border border-neutral-400 bg-white w-24"
          />
        </label>
      </template>

      <label class="flex gap-2 items-center justify-between">
        <span>generations {{ generations }}</span>
        <input
          v-model.number="generations"
          type="range"
          min="0"
          max="300"
          class="w-24"
        />
      </label>

      <label class="flex gap-2 items-center justify-between">
        <span>wrap edges</span>
        <input v-model="wrap" type="checkbox" class="w-24" />
      </label>

      <label class="flex gap-2 items-center justify-between">
        <span>seed</span>
        <span class="flex gap-1 w-24">
          <input
            v-model.lazy.number="seedInput"
            type="number"
            min="0"
            class="px-1 py-0.5 border border-neutral-400 bg-white min-w-0"
          />
          <button
            type="button"
            class="px-1 border border-neutral-400 bg-white hover:bg-neutral-200"
            title="random seed"
            @click="randomiseSeed"
          >
            ⟳
          </button>
        </span>
      </label>

      <button
        type="button"
        class="px-2 py-1 border border-neutral-400 bg-white hover:bg-neutral-200 disabled:opacity-50"
        :disabled="exporting"
        @click="exportCurrent"
      >
        export current png
      </button>

      <label class="flex gap-2 items-center justify-between">
        <span>versions</span>
        <input
          v-model.lazy.number="versionsInput"
          type="number"
          min="1"
          max="500"
          class="px-1 py-0.5 border border-neutral-400 bg-white w-24"
        />
      </label>

      <div class="flex gap-2">
        <button
          v-for="mode in ['files', 'zip'] as const"
          :key="mode"
          type="button"
          class="px-2 py-1 border border-neutral-400"
          :class="
            exportAs === mode
              ? 'text-white border-neutral-900 bg-neutral-900'
              : 'bg-white hover:bg-neutral-200'
          "
          @click="exportAs = mode"
        >
          {{ mode === 'files' ? 'separate pngs' : 'one zip' }}
        </button>
      </div>

      <button
        type="button"
        class="text-white px-2 py-1 border border-neutral-900 bg-neutral-900 disabled:opacity-50"
        :disabled="exporting"
        @click="exportBatch"
      >
        {{ exporting ? 'exporting…' : `export ${versions} versions` }}
      </button>

      <div class="text-neutral-600 min-h-4">{{ progress }}</div>
    </div>

    <div class="flex flex-col gap-4 min-w-0 flex-1">
      <canvas
        ref="canvas"
        class="border border-neutral-400 max-w-full self-start"
        :width="size.width"
        :height="size.height"
        :style="{ maxHeight: 'calc(100vh - 4rem)' }"
      />

      <div class="flex flex-wrap gap-4">
        <button
          v-for="(s, i) in thumbSeeds"
          :key="s"
          type="button"
          class="flex flex-col gap-1 items-start"
          @click="selected = s"
        >
          <canvas
            :ref="
              (el) => {
                if (el) thumbs[i] = el as HTMLCanvasElement
              }
            "
            class="border"
            :class="
              s === selected ? 'border-neutral-900' : 'border-neutral-400'
            "
            :width="THUMB_WIDTH"
            :height="Math.round((THUMB_WIDTH * size.height) / size.width)"
          />
          <span class="text-neutral-600">seed {{ s }}</span>
        </button>
      </div>
      <div v-if="versions > MAX_THUMBS" class="text-neutral-600">
        showing first {{ MAX_THUMBS }} of {{ versions }}
      </div>
    </div>
  </div>
</template>
