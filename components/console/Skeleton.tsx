/**
 * Placeholder shown while the three.js chunk loads. A silhouette of the closed
 * console at the same size the camera will frame it, so nothing shifts when the
 * scene mounts (SPEC §12, CLS < 0.05). No spinner, no copy — SPEC §10.
 */
export function Skeleton() {
  return (
    <div aria-hidden className="absolute inset-0 grid place-items-center">
      <div className="aspect-[23/15] w-[min(88vw,calc(55dvh*23/15))] rounded-[3%] bg-[#141416] sm:w-[min(72vw,calc(62dvh*23/15))] lg:w-[min(58vw,calc(66dvh*23/15))]" />
    </div>
  )
}
