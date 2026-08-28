/**
 * Shared derivation of titles, descriptions, dates and structured data for
 * events. Lives in `shared/` so the pages, the sitemap route and `/llms.txt`
 * all produce identical strings — a `<title>` and its JSON-LD `name` drifting
 * apart is exactly the kind of mismatch search engines penalise.
 */

/** The event has always run at the same venue. */
export const VENUE = {
  name: 'Tussen de Bogen',
  streetAddress: 'Tussen de Bogen 46',
  postalCode: '1013 JB',
  addressLocality: 'Amsterdam',
  addressCountry: 'NL',
} as const

// Editions run 16:30–19:00. Add `time: 'HH:MM'` to an event's frontmatter if a
// particular one started at a different hour.
const DEFAULT_START_TIME = '16:30'
const DEFAULT_DURATION_MINUTES = 150

/** Loose shape — accepts both the client `Collections['events']` and the raw server row. */
export interface EventDoc {
  path?: string
  stem?: string
  number?: number
  theme?: string
  date?: string
  time?: string
  image?: string
  link?: string
  seoTitle?: string
  seoDescription?: string
  upcoming?: boolean
  body?: unknown
}

/**
 * The numeric prefix on an event filename, as `[edition, part]`:
 * `9.1.september-2026` → `[9, 1]`, `10.october-2026` → `[10, 0]`. Matches the
 * basename, not the whole stem — Nuxt Content stems carry the collection
 * directory (`events/9.1.september-2026`). Falls back to the `number`
 * frontmatter when the basename doesn't start with a number.
 */
function eventIndex(event: EventDoc): [number, number] {
  const name = (event.stem ?? '').split('/').pop() ?? ''
  const match = /^(\d+)(?:\.(\d+))?/.exec(name)
  if (!match) return [event.number ?? -1, 0]
  return [Number(match[1]), match[2] ? Number(match[2]) : 0]
}

/**
 * Newest edition first, but the parts of a multi-day edition in reading order:
 * October above September, and September's day 1 above its day 2. Sorting on the
 * stem as a string would put `10.…` below `2.…`, hence the numeric compare.
 */
export function compareEvents(a: EventDoc, b: EventDoc) {
  const [editionA, partA] = eventIndex(a)
  const [editionB, partB] = eventIndex(b)
  if (editionA !== editionB) return editionB - editionA
  if (partA !== partB) return partA - partB
  return (a.stem ?? '').localeCompare(b.stem ?? '')
}

export function stripTags(value?: string) {
  return (value ?? '').replace(/<[^>]*>/g, '').trim()
}

/**
 * Flatten a minimark node into plain text. Body nodes are `[tag, props, ...children]`
 * arrays with bare strings as leaves.
 */
function minimarkText(node: unknown): string {
  if (typeof node === 'string') return node
  if (!Array.isArray(node)) return ''
  // Skip the tag name and the props object, keep the children.
  return node.slice(2).map(minimarkText).join('')
}

/**
 * The lineup, as plain strings. Most editions write it as a list, but some
 * (May 2026) use one paragraph per act — so two or more top-level paragraphs
 * count as a lineup too. A single paragraph is prose, not a lineup.
 */
export function eventLineup(event: EventDoc): string[] {
  const value = (event.body as { value?: unknown[] } | undefined)?.value
  if (!Array.isArray(value)) return []

  const items: string[] = []
  const walk = (node: unknown) => {
    if (!Array.isArray(node)) return
    if (node[0] === 'li') {
      const text = minimarkText(node).trim()
      if (text) items.push(text)
      return
    }
    node.slice(2).forEach(walk)
  }
  value.forEach(walk)
  if (items.length) return items

  const paragraphs = value
    .filter((node): node is unknown[] => Array.isArray(node) && node[0] === 'p')
    .map((node) => minimarkText(node).trim())
    .filter(Boolean)
  return paragraphs.length > 1 ? paragraphs : []
}

/** All body prose as one string, used when an event has no lineup list. */
export function eventBodyText(event: EventDoc): string {
  const value = (event.body as { value?: unknown[] } | undefined)?.value
  if (!Array.isArray(value)) return ''
  return value.map(minimarkText).join(' ').replace(/\s+/g, ' ').trim()
}

export function eventTitle(event: EventDoc) {
  if (event.seoTitle) return event.seoTitle
  const theme = stripTags(event.theme)
  const base = `Untitled Games Event #${event.number}`
  return theme ? `${base}: ${theme}` : base
}

/**
 * Derived, not authored — built from the date, the venue and the lineup so
 * every event page gets a distinct meta description without new copy.
 */
export function eventDescription(event: EventDoc, fallback = '') {
  if (event.seoDescription) return event.seoDescription

  const where = event.date
    ? `${event.date} at ${VENUE.name}, ${VENUE.addressLocality}.`
    : `${VENUE.name}, ${VENUE.addressLocality}.`

  const lineup = eventLineup(event)
  if (lineup.length) {
    const shown = lineup.slice(0, 3).join('; ')
    const rest = lineup.length - 3
    return `${where} Featuring ${shown}${rest > 0 ? ` and ${rest} more` : ''}.`
  }

  const prose = eventBodyText(event)
  if (prose) return `${where} ${prose}`.slice(0, 300)

  return fallback ? `${where} ${fallback}` : where
}

/**
 * `YYYY-MM-DD` from the parsed calendar date, avoiding the UTC shift that
 * `toISOString()` introduces for local-midnight dates.
 */
export function toIsoDate(value?: string) {
  const date = value ? new Date(value) : undefined
  if (!date || Number.isNaN(date.getTime())) return undefined
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** `+01:00` or `+02:00` depending on whether the date falls in Dutch summer time. */
function amsterdamOffset(isoDate: string) {
  const at = new Date(`${isoDate}T12:00:00Z`)
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Amsterdam',
    timeZoneName: 'longOffset',
  })
    .formatToParts(at)
    .find((part) => part.type === 'timeZoneName')?.value
  return name?.replace('GMT', '') || '+01:00'
}

/** Works in minutes so half-hour starts and durations survive the arithmetic. */
function addMinutes(time: string, minutes: number) {
  const [h = 0, m = 0] = time.split(':').map(Number)
  const total = (h * 60 + m + minutes) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Full ISO datetimes with the correct Amsterdam offset, as Event schema wants. */
export function eventDateTimes(event: EventDoc) {
  const isoDate = toIsoDate(event.date)
  if (!isoDate) return {}

  const offset = amsterdamOffset(isoDate)
  const start = event.time || DEFAULT_START_TIME
  return {
    startDate: `${isoDate}T${start}:00${offset}`,
    endDate: `${isoDate}T${addMinutes(start, DEFAULT_DURATION_MINUTES)}:00${offset}`,
  }
}

function absolute(siteUrl: string, path: string) {
  if (/^https?:\/\//.test(path)) return path
  return `${siteUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

/** The canonical page for an event on this site. */
export function eventUrl(event: EventDoc, siteUrl: string) {
  return absolute(siteUrl, event.path || '/')
}

export function organizationNode(siteUrl: string, description: string) {
  return {
    '@type': 'Organization',
    '@id': `${siteUrl}#organization`,
    name: 'Untitled Games Event',
    url: siteUrl,
    description,
    email: 'untitledgamesevent@proton.me',
    logo: absolute(siteUrl, '/web-app-manifest-512x512.png'),
    address: {
      '@type': 'PostalAddress',
      streetAddress: VENUE.streetAddress,
      postalCode: VENUE.postalCode,
      addressLocality: VENUE.addressLocality,
      addressCountry: VENUE.addressCountry,
    },
    sameAs: [
      'https://www.instagram.com/untitledgamesevent/',
      'https://bsky.app/profile/untitledgamesevent.bsky.social',
    ],
  }
}

/**
 * One `Event` node. `url`/`@id` point at this site's own page for the event —
 * an off-site `link` (a Buttondown recap) becomes `subjectOf` instead, so we
 * never hand the canonical event URL to another domain.
 */
export function eventNode(
  event: EventDoc,
  siteUrl: string,
  fallbackDescription = '',
) {
  const url = eventUrl(event, siteUrl)
  return {
    '@type': 'Event',
    '@id': url,
    url,
    name: eventTitle(event),
    description: eventDescription(event, fallbackDescription),
    ...eventDateTimes(event),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    isAccessibleForFree: true,
    location: {
      '@type': 'Place',
      name: VENUE.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: VENUE.streetAddress,
        postalCode: VENUE.postalCode,
        addressLocality: VENUE.addressLocality,
        addressCountry: VENUE.addressCountry,
      },
    },
    ...(event.image ? { image: absolute(siteUrl, event.image) } : {}),
    organizer: { '@id': `${siteUrl}#organization` },
    superEvent: { '@id': `${siteUrl}#series` },
    ...(event.link
      ? { subjectOf: { '@type': 'WebPage', url: event.link } }
      : {}),
  }
}

export function websiteNode(
  siteUrl: string,
  name: string,
  description: string,
) {
  return {
    '@type': 'WebSite',
    '@id': `${siteUrl}#website`,
    url: siteUrl,
    name,
    description,
    inLanguage: 'en',
    publisher: { '@id': `${siteUrl}#organization` },
  }
}

/** The monthly series the individual editions belong to. */
export function seriesNode(siteUrl: string, description: string) {
  return {
    '@type': 'EventSeries',
    '@id': `${siteUrl}#series`,
    name: 'Untitled Games Event',
    url: siteUrl,
    description,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: VENUE.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: VENUE.streetAddress,
        postalCode: VENUE.postalCode,
        addressLocality: VENUE.addressLocality,
        addressCountry: VENUE.addressCountry,
      },
    },
    organizer: { '@id': `${siteUrl}#organization` },
  }
}

/** A single `@graph` document, which is how Google prefers multiple linked nodes. */
export function jsonLdGraph(nodes: unknown[]) {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes })
}
