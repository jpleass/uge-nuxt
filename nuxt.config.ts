import { useNuxt } from '@nuxt/kit'
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@unocss/nuxt', '@vueuse/nuxt', '@nuxt/icon', '@nuxt/content'],

  compatibilityDate: '2025-08-01',

  devtools: {
    enabled: true,
  },

  // /life is a local authoring tool (Game of Life frame exporter), not part of
  // the site. Strip the route from production builds. NODE_ENV isn't reliably
  // set when this config is evaluated, so key off Nuxt's own dev flag.
  hooks: {
    'pages:extend': function (pages) {
      if (useNuxt().options.dev) return
      const i = pages.findIndex((page) => page.path === '/life')
      if (i !== -1) pages.splice(i, 1)
    },
  },

  runtimeConfig: {
    public: {
      // Override per-environment with NUXT_PUBLIC_SITE_URL.
      siteUrl: 'https://untitledgamesevent.nl',
    },
  },
  css: ['./app/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss() as any],
  },
})
