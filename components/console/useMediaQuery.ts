import {useCallback, useSyncExternalStore} from 'react'

/**
 * A live `matchMedia` result. The server has no media to match, so every query
 * renders as `false` there and corrects itself on hydration — which is why the
 * callers below phrase their queries so that `false` is the default they want.
 *
 * React's own `useSyncExternalStore` covers this; a hook library would be a
 * dependency for ten lines.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
