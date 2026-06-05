<script lang="ts" setup>
import type { Collections } from '@nuxt/content'

const props = defineProps<{
  event: Collections['events']
}>()

const { setGlobalColor, globalColor } = useGlobalColor()
const el = useTemplateRef('el')

useIntersectionObserver(
  el,
  ([entry]) => {
    if (entry?.isIntersecting) setGlobalColor(props.event.color)
  },
  { rootMargin: '-45% 0px -45% 0px' },
)
</script>

<template>
  <div ref="el" class="w-full" :data-color="event.color">
    <section
      class="flex flex-col items-center gap-4 pt-12 w-full transition-colors"
      :style="{
        color: globalColor,
      }"
    >
      <div>
        <h4 v-if="event.date" class="text-center lg:text-lg">
          {{ event.date }}
        </h4>
        <div class="flex flex-row gap-2">
          <div class="text-center">#{{ event.number }}:</div>
          <div v-html="event.theme"></div>
        </div>
      </div>
      <div class="my-4">
        <AppRecoloredImage
          :src="event.image"
          :alt="event.title"
          :color="globalColor"
          class="w-50 h-50"
        />
      </div>
      <div v-if="event.body">
        <ContentRenderer
          v-if="event.body"
          :value="event"
          class="body-text leading-default text-center"
        />
      </div>
    </section>
  </div>
</template>
