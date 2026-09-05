import {useMediaQuery} from '@/components/console/useMediaQuery'

/**
 * `prefers-reduced-motion: reduce`, live. SPEC §11.5 turns off the idle drift
 * and the flap spring for these visitors — not all motion, only the motion that
 * is decoration rather than explanation.
 */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
