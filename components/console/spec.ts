import {useMemo} from 'react'

import {deriveDimensions, type Dimensions} from '@/components/console/dimensions'
import {deriveMaterials, type Materials} from '@/components/console/materials'
import {useTuning} from '@/components/console/tuning'

export interface Spec {
  dimensions: Dimensions
  materials: Materials
}

/**
 * The console's form, rebuilt whenever a tuning value changes. This is the only
 * place the tuning store is read for geometry — every part takes what it needs
 * from here.
 */
export function useSpec(): Spec {
  const values = useTuning((state) => state.values)

  return useMemo(
    () => ({dimensions: deriveDimensions(values), materials: deriveMaterials(values)}),
    [values],
  )
}
