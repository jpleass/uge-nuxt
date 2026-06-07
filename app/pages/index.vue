<script lang="ts" setup>
import { joinURL } from 'ufo'

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

// JSON-LD structured data: the organisation and each event in the series.
const { siteUrl } = useRuntimeConfig().public
const stripTags = (value?: string) =>
  (value ?? '').replace(/<[^>]*>/g, '').trim()

// Format as YYYY-MM-DD from the parsed calendar date, avoiding the UTC shift
// that `toISOString()` introduces for local-midnight dates.
function toIsoDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const structuredData = computed(() => {
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Untitled Games Event',
    url: siteUrl,
    email: 'untitledgamesevent@proton.me',
    sameAs: [
      'https://www.instagram.com/untitledgamesevent/',
      'https://bsky.app/profile/untitledgamesevent.bsky.social',
    ],
  }

  const eventNodes = (events.value ?? []).map((event) => {
    const theme = stripTags(event.theme)
    return {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: theme
        ? `Untitled Games Event #${event.number}: ${theme}`
        : `Untitled Games Event #${event.number}`,
      ...(event.date && toIsoDate(event.date)
        ? { startDate: toIsoDate(event.date) }
        : {}),
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: 'Tussen de Bogen',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Tussen de Bogen 46',
          postalCode: '1013 JB',
          addressLocality: 'Amsterdam',
          addressCountry: 'NL',
        },
      },
      ...(event.image && siteUrl
        ? { image: joinURL(siteUrl, event.image) }
        : {}),
      organizer: {
        '@type': 'Organization',
        name: 'Untitled Games Event',
        url: siteUrl,
      },
      ...(event.link ? { url: event.link } : {}),
    }
  })

  return [organization, ...eventNodes]
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(structuredData.value)),
    },
  ],
})
</script>

<template>
  <div
    class="flex flex-col items-center gap-16 w-full p-2 md:p-8 text-base md:text-[calc(1em+1.25vw)] font-bold leading-default"
  >
    <AppHero />
    <AppNewsletter />
    <AppContact />

    <div class="flex flex-col items-center gap-8 w-full">
      <template v-if="upcomingEvents.length">
        <div
          v-for="(event, i) in upcomingEvents"
          :key="event.id"
          class="w-full py-16 border-t-[0.2em] border-current border-dashed"
        >
          <div v-if="i === 0" class="lg:my-16 text-center">
            <div class="lg:tracking-widest lg:text-[1.4em]">[ upcoming ]</div>
          </div>
          <AppEventSummary :event="event" />
        </div>
      </template>

      <div
        v-for="(event, i) in pastEvents"
        :key="event.id"
        class="w-full py-16 border-t-[0.2em] border-current border-dashed"
      >
        <div v-if="i === 0" class="lg:my-16 text-center">
          <div class="lg:tracking-widest lg:text-[1.4em]">[ past events ]</div>
        </div>
        <AppEventSummary :event="event" />
      </div>
    </div>
  </div>
</template>
