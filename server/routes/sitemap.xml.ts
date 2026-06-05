import { SitemapStream, streamToPromise } from 'sitemap'
import { withoutTrailingSlash } from 'ufo'

export default defineEventHandler(async (event) => {
  const { siteUrl } = useRuntimeConfig(event).public
  const sitemap = new SitemapStream({ hostname: siteUrl })

  // Add your routes here
  sitemap.write({ url: withoutTrailingSlash('/') })

  sitemap.end()
  return streamToPromise(sitemap)
})
