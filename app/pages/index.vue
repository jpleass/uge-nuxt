<script lang="ts" setup>
const { data: events } = await useAsyncData('events', () =>
  queryCollection('events').order('stem', 'DESC').all(),
)

const upcomingEvents = computed(() =>
  (events.value ?? []).filter((event) => event.upcoming),
)

const pastEvents = computed(() =>
  (events.value ?? []).filter((event) => !event.upcoming),
)

// Title / description / Open Graph / canonical — uses the site defaults.
setPage({})

// JSON-LD: one `@graph` describing the site, the organisation, the series and
// every edition. Derivation lives in `shared/utils/eventMeta.ts` so these nodes
// match what each event page emits for itself.
const { siteUrl } = useRuntimeConfig().public
const site = useSite()

const structuredData = computed(() =>
  jsonLdGraph([
    websiteNode(siteUrl, site.value.title, site.value.description),
    organizationNode(siteUrl, site.value.description),
    seriesNode(siteUrl, site.value.description),
    ...(events.value ?? []).map((event) =>
      eventNode(event, siteUrl, site.value.description),
    ),
  ]),
)

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: structuredData,
    },
  ],
})
</script>

<template>
  <div
    class="leading-default text-base font-bold p-2 flex flex-col gap-16 w-full items-center md:text-[calc(1em+1.25vw)] md:p-8"
  >
    <AppHero />
    <AppNewsletter />
    <AppContact />

    <div class="flex flex-col gap-8 w-full items-center">
      <template v-if="upcomingEvents.length">
        <div
          v-for="(event, i) in upcomingEvents"
          :key="event.id"
          class="py-16 border-t-[0.2em] border-current border-dashed w-full"
        >
          <div v-if="i === 0" class="text-center lg:my-16">
            <div class="text-[1.4em] lg:tracking-widest">[ upcoming ]</div>
          </div>
          <AppEventSummary :event="event" />
        </div>
      </template>

      <div
        v-for="(event, i) in pastEvents"
        :key="event.id"
        class="py-16 border-t-[0.2em] border-current border-dashed w-full"
      >
        <div v-if="i === 0" class="text-center lg:my-16">
          <div class="text-[1.4em] lg:tracking-widest">[ past events ]</div>
        </div>
        <AppEventSummary :event="event" />
      </div>
    </div>
    <AppFireworks />
  </div>
</template>
