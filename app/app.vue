<script setup lang="ts">
import '~/assets/css/main.css'

if (import.meta.server) {
  useHead({
    htmlAttrs: {
      lang: 'en',
    },
  })
}

useGlobalColorObserver()
</script>

<template>
  <Html>
    <Body
      class="bg-bg py-4 font-gt-standard text-global tracking-[0.015em] leading-default lg:px-16 px-2"
    >
      <AppBorder>
        <main id="main" class="w-full">
          <NuxtPage />
        </main>
      </AppBorder>
    </Body>
  </Html>
</template>
