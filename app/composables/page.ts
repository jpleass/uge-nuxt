import type { HookResult } from '@nuxt/schema'
import { joinURL } from 'ufo'

export function usePage<T extends Record<string, any> = Record<string, any>>() {
  return useState<T>('app.page', () => ({}) as T)
}

export function setPage<T extends Record<string, any>>(page: T) {
  usePage().value = page

  const { siteUrl } = useRuntimeConfig().public
  const site = useSite()
  const title = page.title
    ? `${page.title} – ${site.value.title}`
    : site.value.title
  const description = page.description || site.value.description
  const url = joinURL(siteUrl, useRoute().path)
  const image = page?.cover?.url || site.value.cover?.url

  useServerHead({
    link: [{ rel: 'canonical', href: url }],
  })

  useSeoMeta({
    title,
  })

  useServerSeoMeta({
    description,
    ogTitle: title,
    ogDescription: description,
    ogUrl: url,
    ogType: 'website',
    ...(image && { ogImage: image }),
    twitterTitle: title,
    twitterDescription: description,
    twitterCard: image ? 'summary_large_image' : 'summary',
    ...(image && { twitterImage: image }),
  })

  const nuxtApp = useNuxtApp()
  nuxtApp._pageDependenciesRendered = true
  return nuxtApp.callHook('page-dependencies:rendered')
}

export async function hasPage() {
  if (import.meta.server) {
    const nuxtApp = useNuxtApp()
    const error = useError()

    return new Promise<void>((resolve) => {
      const resolver = () => { resolve() }

      if (error.value) return resolver()
      if (nuxtApp._pageDependenciesRendered) return resolver()

      nuxtApp.hooks.hookOnce('page-dependencies:rendered', resolver)
      nuxtApp.hooks.hookOnce('app:error', resolver)
      nuxtApp.hooks.hookOnce('vue:error', resolver)
    })
  }

  return Promise.resolve()
}

declare module '#app' {
  interface RuntimeNuxtHooks {
    'page-dependencies:rendered': () => HookResult
  }
}
