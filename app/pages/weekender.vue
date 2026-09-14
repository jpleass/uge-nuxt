<script lang="ts" setup>
// Live "now playing / up next" timetable for the Fri 18 Sept event
// (content/events/9.1.september-2026.md — [uge] at the Rijksakademie),
// meant to run ambiently on a projector at the venue.

type TimetableSlot = {
  start: string // 'HH:MM', Europe/Amsterdam, 24h — inclusive
  end: string // 'HH:MM' — exclusive
  title: string
  speaker?: string
}

// Running order per the official programme:
// https://rijksakademie.nl/en/public-programme/2026-09-18-untitled-games-event
const slots: TimetableSlot[] = [
  { start: '15:00', end: '15:30', title: 'Walk-in' },
  {
    start: '15:30',
    end: '16:30',
    title: 'Play games and demos across the Schip space',
  },
  {
    start: '16:30',
    end: '16:50',
    title: 'Reworlding Ramallah: Short Science Fiction Stories from Palestine',
    speaker: 'Callum Copley',
  },
  {
    start: '17:00',
    end: '17:20',
    title: 'procuring estrogen for your toxic slime girlfriend',
    speaker: 'NB Spiders and BigBeefySharkBaby',
  },
  {
    start: '17:30',
    end: '17:45',
    title: '[[rect*]]repair and new forms of pervasive play in China',
    speaker: 'Joanna Lyu',
  },
  {
    start: '17:45',
    end: '18:30',
    title: 'Play games and demos across the Schip space',
  },
  {
    start: '18:30',
    end: '20:00',
    title: 'Micro talks',
    speaker:
      'Lucas Lugarinho, Nestor Siré, amy pickles, Lotte Louise de Jong, Jordan Magnuson, Case Jernigan, Dmytro Tentiuk, Demi van Kuijk, Erwin Hoogerwoord, Emily W. Bernstein, Anneke ter Schure, and more',
  },
]

const EVENT_COLOR = '#8D9963' // content/events/9.1.september-2026.md

function toMinutes(time: string) {
  const [h = 0, m = 0] = time.split(':').map(Number)
  return h * 60 + m
}

// Compares wall-clock minutes rather than building cross-timezone `Date`
// objects — simplest option since the projector is physically in Amsterdam
// (same convention as `amsterdamOffset` in shared/utils/eventMeta.ts).
function amsterdamMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

const now = useNow({ interval: 1000 })

// Manual override for testing and for correcting a display that's drifted
// from the published programme (e.g. the event is running late) — driven by
// the URL rather than a keyboard shortcut or on-screen control, since it
// only needs to be set once by whoever's driving the laptop.
//   ?offset=15   shift the displayed time forward 15 minutes (ticks on from there)
//   ?at=17:35    jump to 17:35 Europe/Amsterdam (ticks on from there too)
// `at` wins if both are given. Invalid values are ignored.
const route = useRoute()

const offsetMinutes = (() => {
  const atParam = route.query.at
  if (typeof atParam === 'string' && /^\d{1,2}:\d{2}$/.test(atParam)) {
    return toMinutes(atParam) - amsterdamMinutes(new Date())
  }
  if (atParam !== undefined) {
    console.warn(`weekender: ignoring invalid ?at="${atParam}"`)
  }

  const offsetParam = route.query.offset
  if (typeof offsetParam === 'string' && offsetParam.trim() !== '') {
    const parsed = Number(offsetParam)
    if (Number.isFinite(parsed)) return parsed
    console.warn(`weekender: ignoring invalid ?offset="${offsetParam}"`)
  }

  return 0
})()

const adjustedNow = computed(
  () => new Date(now.value.getTime() + offsetMinutes * 60_000),
)

const clock = computed(() =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit',
    minute: '2-digit',
  }).format(adjustedNow.value),
)

const nowMinutes = computed(() => amsterdamMinutes(adjustedNow.value))

const currentIndex = computed(() =>
  slots.findIndex(
    (slot) =>
      nowMinutes.value >= toMinutes(slot.start) &&
      nowMinutes.value < toMinutes(slot.end),
  ),
)

const nextIndex = computed(() => {
  if (currentIndex.value !== -1) {
    return currentIndex.value + 1 < slots.length ? currentIndex.value + 1 : -1
  }
  return slots.findIndex((slot) => toMinutes(slot.start) > nowMinutes.value)
})

const current = computed(() =>
  currentIndex.value !== -1 ? slots[currentIndex.value] : undefined,
)
const next = computed(() =>
  nextIndex.value !== -1 ? slots[nextIndex.value] : undefined,
)

const firstSlot = slots[0]!
const lastSlot = slots[slots.length - 1]!

const phase = computed<'before' | 'live' | 'after'>(() => {
  if (nowMinutes.value < toMinutes(firstSlot.start)) return 'before'
  if (nowMinutes.value >= toMinutes(lastSlot.end)) return 'after'
  return 'live'
})

// Schedule column: rather than shrinking type to force every slot onto one
// screen, the list scrolls itself (via `translateY`) to keep whichever slot
// is current — or next, before doors / during a break — roughly centered.
// Row heights are measured rather than assumed fixed, since large/wrapping
// titles make them variable.
const scheduleViewportEl = ref<HTMLElement | null>(null)
const listEl = ref<HTMLElement | null>(null)
const rowEls = ref<HTMLElement[]>([])

const rowOffsets = ref<number[]>([])
const rowHeights = ref<number[]>([])
const containerHeight = ref(0)
const listHeight = ref(0)

function measureRows() {
  rowOffsets.value = rowEls.value.map((el) => el.offsetTop)
  rowHeights.value = rowEls.value.map((el) => el.offsetHeight)
  listHeight.value = listEl.value?.scrollHeight ?? 0
}

function measureContainer() {
  containerHeight.value = scheduleViewportEl.value?.clientHeight ?? 0
}

onMounted(() => {
  measureRows()
  measureContainer()
})

useResizeObserver(listEl, measureRows)
useResizeObserver(scheduleViewportEl, measureContainer)

const targetIndex = computed(() => {
  if (currentIndex.value !== -1) return currentIndex.value
  if (nextIndex.value !== -1) return nextIndex.value
  return 0
})

const translateY = computed(() => {
  const offset = rowOffsets.value[targetIndex.value] ?? 0
  const height = rowHeights.value[targetIndex.value] ?? 0
  const desired = offset + height / 2 - containerHeight.value / 2
  const maxScroll = Math.max(0, listHeight.value - containerHeight.value)
  return -Math.min(Math.max(desired, 0), maxScroll)
})

setPage({ title: 'Timetable' })

// A live venue-display screen for the projector — not a landing page. Keep it
// out of the index (it is also excluded from sitemap.xml and robots.txt).
useHead({
  meta: [{ name: 'robots', content: 'noindex, follow' }],
})
</script>

<template>
  <div
    class="bg-bg leading-default text-base font-bold grid grid-cols-2 gap-4 md:gap-12 inset-0 fixed z-50 p-12 md:text-[calc(1em+1.25vw)]"
    :data-color="EVENT_COLOR"
  >
    <!-- <AppAmbientFireworks /> -->

    <div
      v-if="offsetMinutes !== 0"
      class="absolute top-2 right-2 text-[0.35em] opacity-40 tabular-nums"
    >
      override {{ offsetMinutes > 0 ? '+' : '' }}{{ offsetMinutes }}m
    </div>

    <aside
      class="col-span-1 flex flex-col justify-between h-full min-h-0 text-center"
    >
      <div class="tabular-nums text-[1em]">{{ clock }}</div>

      <div class="flex flex-col items-center gap-2 flex-1 justify-center">
        <template v-if="phase === 'before'">
          <div class="text-[0.5em]">starting soon</div>
          <div class="text-[1.1em]">Doors at {{ firstSlot.start }}</div>
        </template>

        <template v-else-if="phase === 'after'">
          <div class="text-[1.1em]">Thanks for coming!</div>
        </template>

        <template v-else>
          <div class="flex flex-col items-center gap-2">
            <template v-if="current">
              <div class="text-[0.5em] opacity-70">now</div>
              <div class="text-[1.1em] leading-tight">{{ current.title }}</div>
              <div v-if="current.speaker" class="text-[0.5em] opacity-80">
                {{ current.speaker }}
              </div>
            </template>
            <template v-else-if="next">
              <div
                class="text-[0.5em] tracking-widest"
                :style="{ color: EVENT_COLOR }"
              >
                up next — {{ next.start }}
              </div>
              <div class="text-[1.2em] leading-tight">{{ next.title }}</div>
              <div v-if="next.speaker" class="text-[0.5em] opacity-80">
                {{ next.speaker }}
              </div>
            </template>
          </div>

          <div
            v-if="current && next"
            class="flex flex-col items-center gap-1 text-[0.4em] opacity-60"
          >
            <div class="tracking-widest">up next — {{ next.start }}</div>
            <div>
              {{ next.title
              }}<span v-if="next.speaker"> — {{ next.speaker }}</span>
            </div>
          </div>
        </template>
      </div>

      <div />
    </aside>

    <section
      class="col-span-1 h-full min-h-0 flex flex-col text-[0.7em] md:text-[0.75em]"
    >
      <!-- <div class="text-right whitespace-nowrap lg:tracking-widest mb-4">
        <span class="inline-block scale-120">[</span>
        untitled games event
        <span class="inline-block scale-120">]</span>
      </div> -->

      <div ref="scheduleViewportEl" class="flex-1 min-h-0 relative">
        <div
          ref="listEl"
          class="flex flex-col gap-2 md:gap-3 leading-snug transition-transform duration-700 ease-out will-change-transform"
          :style="{ transform: `translateY(${translateY}px)` }"
        >
          <div
            v-for="(slot, i) in slots"
            ref="rowEls"
            :key="slot.start + slot.title"
            class="flex gap-6 justify-between transition-opacity duration-500"
          >
            <div class="tabular-nums whitespace-nowrap">{{ slot.start }}</div>
            <div class="flex-1">
              {{ slot.title }}
              <div v-if="slot.speaker" class="opacity-70">
                {{ slot.speaker }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
