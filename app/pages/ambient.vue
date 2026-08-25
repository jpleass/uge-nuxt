<script lang="ts" setup>
const { data: events } = await useAsyncData('events', () =>
  queryCollection('events').order('stem', 'DESC').all(),
)

const event = computed(
  () => (events.value ?? []).find((e) => e.upcoming) ?? events.value?.[0],
)

const { globalColor } = useGlobalColor()

setPage({ title: 'Ambient' })

// A full-screen display for the venue itself — not a landing page. Keep it out
// of the index (it is also excluded from sitemap.xml and robots.txt).
useHead({
  meta: [{ name: 'robots', content: 'noindex, follow' }],
})
</script>

<template>
  <div
    class="bg-bg leading-default text-base font-bold flex flex-col gap-8 items-center inset-0 justify-center fixed z-50 md:text-[calc(1em+1.25vw)]"
    :data-color="event?.color || '#333333'"
  >
    <div class="text-[1.4em] text-center whitespace-nowrap lg:tracking-widest">
      <span class="inline-block scale-120">[</span> untitled games event
      <span class="inline-block scale-120">]</span>
    </div>

    <div class="leading-default text-[1em] text-center max-w-md">
      a space for experimental games and playable arts
    </div>

    <AppAmbientFireworks />
  </div>
</template>
