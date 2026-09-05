/**
 * Placeholder shown while the three.js chunk loads. A silhouette of the closed
 * console at the same size the camera will frame it, so nothing shifts when the
 * scene mounts (SPEC §12, CLS < 0.05). No spinner, no copy — SPEC §10.
 *
 * These proportions track `DEFAULT_TUNING`, not the live tuning values: the
 * skeleton is plain CSS that renders before any of the 3D code loads.
 */
export function Skeleton() {
  return (
    <div aria-hidden className="absolute inset-0 grid place-items-center">
      <div className="aspect-[7/6] w-[min(88vw,calc(62dvh*7/6))] rounded-[3%] bg-[#141416] sm:w-[min(80vw,calc(78dvh*7/6))] lg:w-[min(62vw,calc(82dvh*7/6))]" />
    </div>
  )
}
