import type {NextConfig} from 'next'

const isDev = process.env.NODE_ENV === 'development'

/**
 * SPEC §14's security headers.
 *
 * The CSP is as tight as this stack allows, and the two loose directives are
 * loose for reasons rather than by default:
 *
 * - `script-src 'unsafe-inline'`. Next streams the RSC payload as inline
 *   `<script>self.__next_f.push(...)` tags. The strict alternative is a per-request nonce
 *   from a proxy, which would make `/` dynamic — trading the prerendered page,
 *   and the LCP that depends on it, for a defence against injected script on a
 *   site with no user input, no comments, no search and no forms.
 * - `style-src 'unsafe-inline'`. The screen is authored in inline styles so
 *   that one panel can be scaled onto the glass in 3D, and the Studio styles
 *   itself the same way.
 *
 * Everything else is closed: no plugins, no other origins for scripts, images
 * only from here and Sanity's CDN, frames only from here and the two trailer
 * players, and the page may only be framed by itself — which is what the
 * Studio's own preview needs and nothing else does.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.sanity.io",
  "font-src 'self' data:",
  "connect-src 'self' https://*.sanity.io wss://*.api.sanity.io",
  "media-src 'self' https://cdn.sanity.io",
  "worker-src 'self' blob:",
  // The trailers: a project's `videoUrl` plays inline in its own embed player.
  "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const nextConfig: NextConfig = {
  // `@sanity/workbench` (a transitive dependency of `sanity`) points its
  // `development` export condition at raw TypeScript source, which Turbopack
  // refuses to load from node_modules. Compiling it here keeps `next dev`
  // working; production resolves `dist` and is unaffected.
  transpilePackages: ['@sanity/workbench'],

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {key: 'Content-Security-Policy', value: csp},
          {key: 'X-Content-Type-Options', value: 'nosniff'},
          {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
          // The console needs none of these, so it asks for none of them.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
