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

/**
 * The two server-only secrets (SPEC §14), read rather than required.
 *
 * They are deliberately not `required()`: the site renders published content
 * without either of them, and a laptop with no `.env.local` should still run
 * `pnpm dev` and `pnpm build`. The routes that need one refuse to work when it
 * is missing, which is a 500 on a route nobody but Sanity calls rather than a
 * blank site.
 */
export const readToken = process.env.SANITY_API_READ_TOKEN
export const revalidateSecret = process.env.SANITY_REVALIDATE_SECRET
