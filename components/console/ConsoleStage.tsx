'use client'

import dynamic from 'next/dynamic'

import {Skeleton} from '@/components/console/Skeleton'

/**
 * The client boundary for the 3D scene.
 *
 * three.js is pulled in on the client only (SPEC §12) — `ssr: false` is only
 * valid inside a Client Component, so this wrapper exists to hold it. The
 * container fills the viewport before the chunk arrives, so the canvas cannot
 * shift the page in.
 */
const Scene = dynamic(() => import('@/components/console/Scene'), {
  ssr: false,
  loading: () => <Skeleton />,
})

export function ConsoleStage() {
  return (
    <div className="fixed inset-0">
      <Scene />
    </div>
  )
}
