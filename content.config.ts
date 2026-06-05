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
        theme: z.string().optional(),
        link: z.string().optional(),
      }),
    }),
  },
})
