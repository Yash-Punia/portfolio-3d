/**
 * Placeholder shown while the three.js chunk loads: the silhouette of whichever
 * console the viewport gets, at the size the camera will frame it, so nothing
 * shifts when the scene mounts. Plain CSS — it renders before any 3D code.
 *
 * The sizes track `zoomFor` in `Scene`: the desk is 12.4×6.4 world units framed
 * at 86% of the width or 94% of the height less 150px; the handheld 3.9×8.44 at
 * 96% of either.
 */
export function Skeleton() {
  return (
    <div aria-hidden className="absolute inset-0 grid place-items-center">
      <div className="hidden aspect-[124/64] w-[min(86vw,calc((100dvh-150px)*0.94*124/64))] rounded-[5.8%/11.25%] bg-[#1f1f1e] landscape:block" />
      <div className="hidden aspect-[390/844] w-[min(96vw,calc(96dvh*390/844))] rounded-[4%/2%] bg-[#c4bfb6] portrait:block" />
    </div>
  )
}
