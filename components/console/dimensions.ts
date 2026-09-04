/**
 * Every world-unit dimension of the console lives here.
 *
 * SPEC §4 forbids authoring the console as a GLTF precisely so that the form
 * stays tweakable in code — this file is where that tweaking happens. One world
 * unit is arbitrary; the camera derives its zoom from `CONSOLE` below, so
 * changing these numbers rescales the whole object without touching the camera.
 */

export const BODY = {
  width: 4.6,
  height: 3.0,
  /** Depth of the core slab. The face frame adds `FACE.depth` on top. */
  depth: 0.36,
  radius: 0.16,
} as const

/** The front frame of the body: an extruded panel with the screen cut out of it. */
export const FACE = {
  depth: 0.06,
  /** Aperture the frame leaves for the screen bezel. */
  apertureWidth: 3.3,
  apertureHeight: 2.0,
  apertureRadius: 0.06,
} as const

export const SCREEN = {
  width: 3.0,
  height: 1.7,
} as const

/**
 * The flaps are inset from the body outline so the body's rim shows around
 * them. Viewed dead-on under an orthographic camera, coplanar faces render as
 * one flat silhouette — the rim, the step down to it and the groove between the
 * doors are what give the closed console any depth at all.
 */
export const FLAP_INSET = 0.09

export const SEAM = {
  gap: 0.014,
  bandWidth: 0.017,
  bandDepth: 0.009,
} as const

export const FLAP = {
  width: (BODY.width - FLAP_INSET * 2 - SEAM.gap) / 2,
  height: BODY.height - FLAP_INSET * 2,
  depth: 0.17,
  /** Outer corners only — the inner (seam) edge stays square. */
  radius: 0.1,
} as const

/** Shallow recessed panel moulded into each flap face. */
export const PANEL = {
  depth: 0.032,
  margin: 0.2,
  radius: 0.05,
} as const

export const HINGE = {
  radius: FLAP_INSET / 2 - 0.004,
  length: BODY.height - 0.66,
  ringRadius: FLAP_INSET / 2 + 0.004,
  ringHeight: 0.055,
} as const

/** Front face of the body core, where the face frame starts. */
export const BODY_FRONT_Z = BODY.depth / 2
/** Front face of the face frame — the surface the closed flaps rest against. */
export const FACE_FRONT_Z = BODY_FRONT_Z + FACE.depth
/** Centre of a closed flap in Z. */
export const FLAP_CLOSED_Z = FACE_FRONT_Z + FLAP.depth / 2
/** Front-most surface of a closed flap, including its moulded panel. */
export const FLAP_FRONT_Z = FLAP.depth / 2 + PANEL.depth

/** X of the hinge axis: the flap's own outer edge. */
export const HINGE_X = BODY.width / 2 - FLAP_INSET
/** X of the visible hinge post, centred in the groove beside the flap. */
export const HINGE_POST_X = BODY.width / 2 - FLAP_INSET / 2

/** Overall closed footprint, used to derive the camera zoom. */
export const CONSOLE = {
  width: BODY.width,
  height: BODY.height,
} as const
