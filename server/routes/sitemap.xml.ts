import { queryCollection } from '@nuxt/content/server'
import { SitemapStream, streamToPromise } from 'sitemap'
import { withoutTrailingSlash } from 'ufo'

export default defineEventHandler(async (event) => {
  const { siteUrl } = useRuntimeConfig(event).public
  const sitemap = new SitemapStream({ hostname: siteUrl })

  const events = await queryCollection(event, 'events')
    .order('stem', 'DESC')
    .all()

  sitemap.write({
    url: withoutTrailingSlash('/'),
    changefreq: 'weekly',
    priority: 1,
  })

  // `/ambient` is a venue display screen, deliberately left out (and noindexed).
  for (const item of events) {
    if (!item.path) continue
    sitemap.write({
      url: item.path,
      changefreq: item.upcoming ? 'weekly' : 'yearly',
      priority: item.upcoming ? 0.8 : 0.6,
      lastmod: toIsoDate(item.date),
    })
  }

  sitemap.end()

  setHeader(event, 'content-type', 'application/xml')
  return streamToPromise(sitemap)
})
