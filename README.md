# [untitled games event]

The website for [untitledgamesevent.nl](https://untitledgamesevent.nl) — a monthly
Amsterdam gathering for experimental games, playable arts, and conversations around
play, held at Tussen de Bogen 46.

Built with [Nuxt 4](https://nuxt.com), [Nuxt Content](https://content.nuxt.com),
Tailwind CSS v4 and UnoCSS.

## Development

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm dev --tunnel # public tunnel, for testing on a phone
```

## Scripts

| Script            | Purpose                                    |
| ----------------- | ------------------------------------------ |
| `pnpm build`      | Production build (SSR, `node-server` preset) |
| `pnpm preview`    | Serve the production build locally         |
| `pnpm lint`       | ESLint (`lint:fix` to autofix)             |
| `pnpm format`     | Prettier                                   |
| `pnpm test:types` | `vue-tsc` type check                       |

## Content

Events live in `content/events/*.md`, one file per edition, ordered by the numeric
filename prefix (`8.august-2026.md`). The frontmatter schema is defined in
`content.config.ts`:

| Field            | Notes                                                       |
| ---------------- | ----------------------------------------------------------- |
| `number`         | Edition number, used in titles                              |
| `image`          | Square artwork under `public/images/events/`, recoloured at runtime |
| `color`          | Accent colour for the edition                               |
| `date`           | Human-readable, e.g. `23 August 2026`                       |
| `time`           | Optional `HH:MM` start (Europe/Amsterdam); defaults to 19:00 |
| `theme`          | Edition theme, may contain inline HTML                      |
| `upcoming`       | Pins the edition to the top of the homepage                 |
| `link`           | Optional off-site recap (Buttondown)                        |
| `seoTitle`       | Optional override for the derived page title                |
| `seoDescription` | Optional override for the derived meta description          |

The body is the lineup — either a list or one paragraph per act.

Adding a file gives you a page at `/events/<slug>` automatically, plus a sitemap
entry, `Event` structured data and an `/llms.txt` line. Nothing else to wire up.

## Routes

| Route             | Notes                                                       |
| ----------------- | ----------------------------------------------------------- |
| `/`               | Everything: hero, newsletter, contact, all editions          |
| `/events/<slug>`  | One edition, generated from `content/events/`                |
| `/ambient`        | Full-screen display for the venue. Noindexed, not in sitemap |
| `/life`           | Local Game of Life frame exporter. Stripped from production builds by a `pages:extend` hook in `nuxt.config.ts` |
| `/sitemap.xml`    | Generated from the content collection                        |
| `/llms.txt`       | Plain-markdown site index for AI crawlers                    |

## SEO

Page metadata goes through `setPage()` in `app/composables/page.ts` (title,
description, canonical, Open Graph, Twitter). Titles, descriptions and JSON-LD are
derived from event frontmatter in `shared/utils/eventMeta.ts` — shared between the
pages and the server routes so they cannot drift apart.

## Configuration

The canonical origin is `runtimeConfig.public.siteUrl`, overridable per environment
with `NUXT_PUBLIC_SITE_URL`. Everything absolute — canonicals, OG images, sitemap,
structured data — is built from it.
