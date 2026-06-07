<script lang="ts" setup>
import type { Collections } from '@nuxt/content'

const props = defineProps<{
  event: Collections['events']
}>()

const { globalColor } = useGlobalColor()

const altText = computed(() => {
  const theme = (props.event.theme ?? '').replace(/<[^>]*>/g, '').trim()
  return theme
    ? `Untitled Games Event #${props.event.number}: ${theme}`
    : `Untitled Games Event #${props.event.number}`
})
</script>

<template>
  <section
    class="flex flex-col items-center gap-4 pt-16 w-full"
    :data-color="event.color"
  >
    <div class="text-center">
      <h4 v-if="event.date" class="lg:text-lg text-sm">
        {{ event.date }}
      </h4>
      <div class="flex justify-center lg:gap-2 gap-1">
        <span>#{{ event.number }}:</span>
        <span v-html="event.theme" />
      </div>
    </div>

    <component
      :is="event.link ? 'a' : 'div'"
      :href="event.link || undefined"
      :target="event.link ? '_blank' : undefined"
      :rel="event.link ? 'noopener noreferrer' : undefined"
      class="md:hover:scale-105 transition-transform rounded overflow-hidden"
    >
      <AppRecoloredImage
        :src="event.image"
        :alt="altText"
        :color="globalColor"
        class="my-4 lg:w-50 lg:h-50 w-40 h-40"
        :style="{
          imageRendering: 'pixelated',
        }"
      />
    </component>

    <div
      v-if="event.body"
      class="body-text lg:leading-default! max-w-[25em] text-center text-sm lg:text-[1em]/normal"
    >
      <ContentRenderer :value="event" />
    </div>

    <div v-if="event.link" class="mt-[1em] pb-[1em]">
      <a
        :href="event.link"
        target="_blank"
        rel="noopener noreferrer"
        color="primary"
        class="link border-current rounded px-4 py-2 border-[0.2em] leading-none"
      >
        read more
      </a>
    </div>
  </section>
</template>
