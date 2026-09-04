import {useCallback, useSyncExternalStore} from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * `prefers-reduced-motion: reduce`, live. SPEC §11.5 turns off the idle drift
 * and the flap spring for these visitors — not all motion, only the motion that
 * is decoration rather than explanation.
 *
 * React's own `useSyncExternalStore` covers this; `motion/react` does not arrive
 * until Phase 4 and would be a dependency for eight lines.
 */
export function useReducedMotion(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const media = window.matchMedia(QUERY)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}
