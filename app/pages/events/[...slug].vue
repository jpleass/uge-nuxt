<script lang="ts" setup>
const route = useRoute()
const path = route.path.replace(/\/$/, '')

const { data: event } = await useAsyncData(`event:${path}`, () =>
  queryCollection('events').path(path).first(),
)

// A missing edition must be a real 404, not an empty 200 page.
if (!event.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Event not found',
    fatal: true,
  })
}

const site = useSite()

setPage({
  title: eventTitle(event.value),
  description: eventDescription(event.value, site.value.description),
  cover: { url: event.value.image, alt: eventTitle(event.value) },
  ogType: 'article',
})

const { siteUrl } = useRuntimeConfig().public

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: jsonLdGraph([
        organizationNode(siteUrl, site.value.description),
        seriesNode(siteUrl, site.value.description),
        eventNode(event.value, siteUrl, site.value.description),
      ]),
    },
  ],
})
</script>

<template>
  <div
    v-if="event"
    class="leading-default text-base font-bold p-2 flex flex-col gap-16 w-full items-center md:text-[calc(1em+1.25vw)] md:p-8"
  >
    <AppHero compact />

    <div class="w-full">
      <AppEventSummary :event="event" heading-level="h1" :linked="false" />
    </div>

    <AppNewsletter />
    <AppContact />
  </div>
</template>
