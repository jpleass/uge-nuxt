<script lang="ts" setup>
const { data: events } = await useAsyncData('events', () =>
  queryCollection('events').order('stem', 'DESC').all(),
)
</script>

<template>
  <div
    class="flex flex-col items-center gap-16 w-full p-4 md:p-8 text-lg md:text-[calc(1em+1.25vw)] font-bold leading-default"
  >
    <AppHero />
    <AppNewsletter />
    <AppContact />

    <div class="flex flex-col items-center gap-8 w-full">
      <div
        v-for="(event, i) in events"
        :key="event.id"
        class="w-full py-16 border-t-[0.2em] border-current border-dashed"
      >
        <div v-if="i === 0" class="lg:my-16 text-center">
          <h2 class="tracking-[0.15em] lg:text-[1.4em]">[ past events ]</h2>
        </div>
        <AppEventSummary :event="event" />
      </div>
    </div>
  </div>
</template>
