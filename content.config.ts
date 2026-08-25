import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    events: defineCollection({
      type: 'page',
      source: 'events/*.md',
      schema: z.object({
        number: z.number().optional(),
        image: z.string(),
        color: z.string(),
        date: z.string().optional(),
        upcoming: z.boolean().optional(),
        theme: z.string().optional(),
        link: z.string().optional(),
        // Optional overrides for the values derived in
        // `shared/utils/eventMeta.ts`. Deliberately NOT named `title` /
        // `description`: Nuxt Content auto-populates those from the filename and
        // the first paragraph, so they can't distinguish authored from derived.
        seoTitle: z.string().optional(),
        seoDescription: z.string().optional(),
        // Start time as `HH:MM` (Europe/Amsterdam). Used for the `startDate` in
        // the Event structured data; falls back to DEFAULT_START_TIME.
        time: z.string().optional(),
      }),
    }),
  },
})
