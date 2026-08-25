<script lang="ts" setup>
import type { Collections } from '@nuxt/content'

const props = withDefaults(
  defineProps<{
    event: Collections['events']
    /** `h1` on the event's own page, `h2` in the homepage list. */
    headingLevel?: 'h1' | 'h2'
    /** Link the heading and artwork to the event's own page. Off on that page. */
    linked?: boolean
  }>(),
  { headingLevel: 'h2', linked: true },
)

const { globalColor } = useGlobalColor()

// Resolved once in setup — `resolveComponent` can't be called inline in a template.
const NuxtLinkComponent = resolveComponent('NuxtLink')
const imageWrapper = computed(() =>
  props.linked ? NuxtLinkComponent : 'div',
)

const title = computed(() => eventTitle(props.event))
const isoDate = computed(() => toIsoDate(props.event.date))
</script>

<template>
  <section
    class="pt-16 flex flex-col gap-4 w-full items-center"
    :data-color="event.color"
  >
    <div class="text-center">
      <time
        v-if="event.date"
        :datetime="isoDate"
        class="text-sm block lg:text-lg"
      >
        {{ event.date }}
      </time>

      <component
        :is="headingLevel"
        class="text-[1em] tracking-[0.015em] flex gap-1 justify-center lg:gap-2"
      >
        <NuxtLink
          v-if="linked"
          :to="event.path"
          class="link flex gap-1 lg:gap-2"
        >
          <span>#{{ event.number }}:</span>
          <span v-html="event.theme" />
        </NuxtLink>
        <template v-else>
          <span>#{{ event.number }}:</span>
          <span v-html="event.theme" />
        </template>
      </component>
    </div>

    <component
      :is="imageWrapper"
      :to="linked ? event.path : undefined"
      class="overflow-hidden"
    >
      <AppRecoloredImage
        :src="event.image"
        :alt="title"
        :color="globalColor"
        class="my-4 h-40 w-40 lg:h-50 lg:w-50"
        :style="{
          imageRendering: 'pixelated',
        }"
      />
    </component>

    <div
      v-if="event.body"
      class="body-text lg:leading-default! text-sm text-center max-w-[25em] lg:text-[1em]/normal"
    >
      <ContentRenderer :value="event" />
    </div>

    <div class="mt-[1em] pb-[1em]">
      <NuxtLink
        v-if="linked"
        :to="event.path"
        class="link leading-none px-4 py-2 border-[0.2em] border-current rounded"
      >
        read more
      </NuxtLink>
      <a
        v-else-if="event.link"
        :href="event.link"
        target="_blank"
        rel="noopener noreferrer"
        class="link leading-none px-4 py-2 border-[0.2em] border-current rounded"
      >
        read the recap
      </a>
    </div>
  </section>
</template>
