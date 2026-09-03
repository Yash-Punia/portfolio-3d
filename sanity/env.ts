/**
 * Single place where Sanity environment variables are read and validated.
 * Everything else imports from here rather than touching `process.env`, so a
 * missing variable fails loudly at import time instead of as a confusing 404
 * from the Sanity API at request time.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}. See .env.example.`)
  }
  return value
}

export const projectId = required(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  'NEXT_PUBLIC_SANITY_PROJECT_ID',
)

export const dataset = required(
  process.env.NEXT_PUBLIC_SANITY_DATASET,
  'NEXT_PUBLIC_SANITY_DATASET',
)

export const apiVersion = required(
  process.env.NEXT_PUBLIC_SANITY_API_VERSION,
  'NEXT_PUBLIC_SANITY_API_VERSION',
)

/** Cache tags used by `revalidateTag` in the Sanity webhook route (SPEC §3). */
export const CACHE_TAGS = ['siteSettings', 'socialLink', 'project', 'timelineEntry'] as const

export type CacheTag = (typeof CACHE_TAGS)[number]
