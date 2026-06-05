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
    <Body class="bg-bg py-4 font-gt-standard text-global">
      <AppBorder>
        <main id="main" class="w-full">
          <NuxtPage />
        </main>
      </AppBorder>
    </Body>
  </Html>
</template>
