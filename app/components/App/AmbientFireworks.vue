<script lang="ts" setup>
// Spawns a game-of-life firework burst at a random position on a fixed
// interval, for unattended/ambient display (e.g. a screen running at the
// physical event). Bursts are positioned relative to the nearest positioned
// ancestor (the fullscreen ambient page container), not teleported to <body>.
interface Burst {
  id: number
  x: number
  y: number
}

const props = withDefaults(defineProps<{ maxBursts?: number }>(), {
  maxBursts: 12,
})

const SPAWN_INTERVAL_MS = 2500

const bursts = ref<Burst[]>([])
let nextId = 0
let timer: ReturnType<typeof setInterval> | null = null

function spawn() {
  const x = Math.random() * window.innerWidth
  const y = Math.random() * window.innerHeight
  bursts.value.push({ id: nextId++, x, y })
  if (bursts.value.length > props.maxBursts) {
    bursts.value.splice(0, bursts.value.length - props.maxBursts)
  }
}

onMounted(() => {
  spawn()
  timer = setInterval(spawn, SPAWN_INTERVAL_MS)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <ClientOnly>
    <AppFireworkBurst
      v-for="burst in bursts"
      :key="burst.id"
      :x="burst.x"
      :y="burst.y"
    />
  </ClientOnly>
</template>
