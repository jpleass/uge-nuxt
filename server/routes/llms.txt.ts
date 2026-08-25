/**
 * https://llmstxt.org convention — a plain-markdown index of the site so that
 * models crawling it get the structure without parsing the visual layer.
 */
import { queryCollection } from '@nuxt/content/server'

export default defineEventHandler(async (event) => {
  const { siteUrl } = useRuntimeConfig(event).public
  const base = siteUrl.replace(/\/$/, '')

  const events = await queryCollection(event, 'events')
    .order('stem', 'DESC')
    .all()

  const upcoming = events.filter((item) => item.upcoming)
  const past = events.filter((item) => !item.upcoming)

  const line = (item: (typeof events)[number]) =>
    `- [${eventTitle(item)}](${base}${item.path}): ${eventDescription(item)}`

  const sections = [
    '# [untitled games event]',
    '',
    '> A monthly Amsterdam gathering for experimental games, playable arts, and conversations around play, held at Tussen de Bogen 46, 1013 JB Amsterdam.',
    '',
    `Contact: untitledgamesevent@proton.me. Newsletter: https://buttondown.com/untitledgamesevent. Instagram: https://www.instagram.com/untitledgamesevent/. Bluesky: https://bsky.app/profile/untitledgamesevent.bsky.social`,
    '',
  ]

  if (upcoming.length) {
    sections.push('## Upcoming', '', ...upcoming.map(line), '')
  }
  if (past.length) {
    sections.push('## Past editions', '', ...past.map(line), '')
  }

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return sections.join('\n')
})
