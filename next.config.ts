import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  // `@sanity/workbench` (a transitive dependency of `sanity`) points its
  // `development` export condition at raw TypeScript source, which Turbopack
  // refuses to load from node_modules. Compiling it here keeps `next dev`
  // working; production resolves `dist` and is unaffected.
  transpilePackages: ['@sanity/workbench'],
}

export default nextConfig
