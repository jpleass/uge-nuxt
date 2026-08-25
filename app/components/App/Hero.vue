<script lang="ts" setup>
withDefaults(
  defineProps<{
    /**
     * Reduced header for subpages: the title only, smaller, linking back to the
     * homepage. Rendered as a plain element rather than `h1`, since on those
     * pages the page's own subject owns the `h1`.
     */
    compact?: boolean
  }>(),
  { compact: false },
)
</script>

<template>
  <div
    class="flex flex-col items-center"
    :class="compact ? 'pt-8 gap-4' : 'pt-16 gap-8 lg:gap-16'"
    data-color="#333333"
  >
    <component
      :is="compact ? 'div' : 'h1'"
      class="text-center whitespace-nowrap lg:tracking-widest"
      :class="compact ? 'text-[1.1em]' : 'text-[1.4em]'"
    >
      <NuxtLink v-if="compact" to="/" class="link">
        <span class="inline-block scale-120">[</span> untitled games event
        <span class="inline-block scale-120">]</span>
      </NuxtLink>
      <template v-else>
        <span class="inline-block scale-120">[</span> untitled games event
        <span class="inline-block scale-120">]</span>
      </template>
    </component>

    <template v-if="!compact">
      <p class="leading-default tracking-wide text-center max-w-xl">
        a monthly event for experimental games, playable arts, and conversations
        around play
      </p>

      <div
        class="leading-default text-center flex flex-wrap gap-8 justify-center lg:pt-0 lg:gap-24"
      >
        <a
          class="link tracking-wide lg:max-w-[20em]"
          href="https://maps.google.com/?q=Tussen+de+Bogen+46,+1013+JB"
          target="_blank"
          rel="noopener noreferrer"
        >
          Tussen de Bogen 46<br />1013 JB, Amsterdam
        </a>
      </div>
    </template>
  </div>
</template>
