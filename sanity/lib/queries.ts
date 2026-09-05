import {defineQuery} from 'next-sanity'

/**
 * Queries must be assigned to a named variable and wrapped in `defineQuery`
 * for Sanity TypeGen to pick them up — inline query strings are skipped.
 */

export const siteSettingsQuery = defineQuery(`*[_type == "siteSettings"][0]{
  fullName,
  title,
  statusLine,
  aboutHeadline,
  aboutBody,
  resumeLabel,
  "resumeUrl": resumeFile.asset->url,
  seo
}`)

export const socialLinksQuery = defineQuery(`*[_type == "socialLink"] | order(buttonSlot asc){
  _id,
  platform,
  url,
  buttonSlot,
  label
}`)

export const projectsQuery = defineQuery(`*[_type == "project"] | order(order asc){
  _id,
  title,
  "slug": slug.current,
  order,
  blurb,
  description,
  role,
  year,
  engine,
  tech,
  platforms,
  cover,
  gallery,
  videoUrl,
  links[]{label, url},
  teamSize,
  featured
}`)
