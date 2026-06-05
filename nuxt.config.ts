import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@unocss/nuxt', '@vueuse/nuxt', '@nuxt/icon', '@nuxt/content'],

  compatibilityDate: '2025-08-01',

  devtools: {
    enabled: true,
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