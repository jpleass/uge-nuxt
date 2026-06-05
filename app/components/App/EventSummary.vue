<script lang="ts" setup>
import type { Collections } from '@nuxt/content'

const props = defineProps<{
  event: Collections['events']
}>()

const { globalColor } = useGlobalColor()
</script>

<template>
  <section
    class="flex flex-col items-center gap-4 pt-16 w-full transition-colors"
    :data-color="event.color"
  >
    <div class="text-center">
      <h4 v-if="event.date" class="lg:text-lg">
        {{ event.date }}
      </h4>
      <div class="flex justify-center gap-2">
        <span>#{{ event.number }}:</span>
        <span v-html="event.theme" />
      </div>
    </div>

    <AppRecoloredImage
      :src="event.image"
      :alt="event.title"
      :color="globalColor"
      class="my-4 w-50 h-50"
    />

    <ContentRenderer
      v-if="event.body"
      :value="event"
      class="body-text max-w-[25em] leading-default text-center"
    />
  </section>
</template>
