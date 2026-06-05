<script setup lang="ts">
import '~/assets/css/main.css'

// Site-wide SEO defaults, consumed by `setPage()` for per-page title/description
// and Open Graph tags.
useSite().value = {
  title: '[untitled games event]',
  description:
    '[untitled games event] is a monthly Amsterdam gathering for experimental games, playable arts, and conversations around play.',
  cover: { url: '/images/og_image.png' },
}

useHead({
  htmlAttrs: {
    lang: 'en',
  },
  link: [
    {
      rel: 'icon',
      type: 'image/png',
      href: '/favicon-96x96.png',
      sizes: '96x96',
    },
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'shortcut icon', href: '/favicon.ico' },
    {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      href: '/apple-touch-icon.png',
    },
    { rel: 'manifest', href: '/site.webmanifest' },
  ],
  meta: [{ name: 'theme-color', content: '#1a1a1a' }],
})

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
