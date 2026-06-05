<script setup lang="ts">
import '~/assets/css/main.css'

if (import.meta.server) {
  useHead({
    htmlAttrs: {
      lang: 'en',
    },
  })
}

const { globalColor } = useGlobalColor()
</script>

<template>
  <Html>
    <Body
      class="bg-[rgb(230,230,230)] py-4 font-gt-standard"
      :style="{
        color: globalColor,
      }"
    >
      <AppBorder>
        <main id="main" class="w-full">
          <NuxtPage />
        </main>
      </AppBorder>
    </Body>
  </Html>
</template>
