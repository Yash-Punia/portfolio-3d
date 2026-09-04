'use client'

import {Body} from '@/components/console/parts/Body'
import {Flap} from '@/components/console/parts/Flap'
import {Hinge} from '@/components/console/parts/Hinge'

/**
 * The console, closed. Phase 1 is static: no idle drift, no flap springs, no
 * drag-to-rotate. The root group is where Phase 3's rotation spring will go.
 */
export function Console() {
  return (
    <group>
      <Body />
      <Hinge side="left" />
      <Hinge side="right" />
      <Flap side="left" />
      <Flap side="right" />
    </group>
  )
}
