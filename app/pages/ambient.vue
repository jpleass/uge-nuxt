<script lang="ts" setup>
const { data: events } = await useAsyncData('events', () =>
  queryCollection('events').order('stem', 'DESC').all(),
)

const event = computed(
  () => (events.value ?? []).find((e) => e.upcoming) ?? events.value?.[0],
)

const { globalColor } = useGlobalColor()

setPage({ title: 'Ambient' })
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-bg text-base md:text-[calc(1em+1.25vw)] font-bold leading-default"
    :data-color="event?.color || '#333333'"
  >
    <div class="lg:tracking-widest text-center whitespace-nowrap text-[1.4em]">
      <span class="scale-120 inline-block">[</span> untitled games event
      <span class="inline-block scale-120">]</span>
    </div>

    <div class="text-center text-[1em] max-w-md leading-default">
      a space for experimental games and playable arts
    </div>

    <AppAmbientFireworks />
  </div>
</template>
