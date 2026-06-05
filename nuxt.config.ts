import process from 'node:process'
import { prefetchQuery, siteQuery } from './app/queries'
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  // If you project doesn't require i18n, use the `without-i18n` branch instead:
  // https://github.com/johannschopplich/cacao-kit-frontend/tree/chore/without-i18n
  modules: ['@unocss/nuxt', '@vueuse/nuxt', 'nuxt-kirby', '@nuxt/icon', '@nuxt/content'],

  compatibilityDate: '2025-08-01',

  devtools: {
    enabled: true,
  },

  runtimeConfig: {
    public: {
      siteUrl: '',
    },
  },
  css: ['./app/assets/css/main.css'],

  kirby: {
    auth: 'bearer',
    prefetch: {
      kirbyStatic: prefetchQuery,
      // Currently only used to infer the type of the `site` query
      kirbySite: siteQuery,
    },
  },

  vite: {
    plugins: [tailwindcss() as any],
    server: {
      // This is only required for the `pnpm dev:tunnel` command
      // to proxy Kirby requests, especially images
      proxy: {
        '/__kirby': {
          target: process.env.KIRBY_BASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/__kirby/, ''),
        },
      },
    },
  },
})