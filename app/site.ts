/**
 * Where this site lives, as an absolute origin.
 *
 * Canonical links, Open Graph URLs, the sitemap and `robots.txt` all have to
 * name the site from the outside, and none of them can be relative. The value
 * is configuration rather than content — Yash owns what the site says, not what
 * it is deployed at — so it comes from the environment (SPEC §14) and Phase 9
 * sets it in Vercel without a code change.
 *
 * Three sources, in order: the variable if it is set; Vercel's own name for the
 * production deployment, which is right on a preview build that has no variable
 * yet; and localhost, so `pnpm dev` and `pnpm build` work on a laptop with no
 * environment at all. It is not `required()` like the Sanity variables, because
 * a missing domain is a wrong `<link rel="canonical">`, not a broken page.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured) return configured.replace(/\/+$/, '')

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel}`

  return 'http://localhost:3000'
}
