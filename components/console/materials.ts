/**
 * Material properties from SPEC §4. Surfaces are differentiated by material,
 * not only by colour — that is what makes the console read as a physical object
 * rather than a black box.
 *
 * These are prop bags, spread onto the matching material element:
 *   <meshStandardMaterial {...SHELL} />
 */

/** Outer shell — matte, slightly soft plastic. */
export const SHELL = {
  color: '#141416',
  roughness: 0.65,
  metalness: 0.05,
  // The env map is the only thing separating one coplanar black face from the
  // next under a locked front-on camera, so it is dialled up rather than down.
  envMapIntensity: 1.6,
} as const

/** Screen bezel and seam interiors — darker, glossier, recessed. */
export const BEZEL = {
  color: '#0a0a0c',
  roughness: 0.35,
  metalness: 0.05,
} as const

/**
 * Red accents. SPEC §4: the centre seam strip, a hinge detail, the joystick
 * collar ring and the power-slider track. Nowhere else.
 */
export const ACCENT = {
  color: '#e12b38',
  roughness: 0.4,
  metalness: 0.05,
} as const

/** Screen glass — a faint reflection is what sells it as glass. */
export const SCREEN_GLASS = {
  color: '#05070a',
  roughness: 0.12,
  metalness: 0,
  transmission: 0.1,
  thickness: 0.02,
  clearcoat: 1,
  clearcoatRoughness: 0.18,
  // The screen's "powered" colour is SPEC §9's screen background, which is a
  // near-black; tone mapping then eats what little of it survives. The emissive
  // is scaled up so an empty, powered screen reads as lit rather than as one
  // more black face. Phase 4 puts content on it.
  emissiveIntensity: 2.6,
} as const

/** Button caps — off-white, not pure white (SPEC §4). */
export const BUTTON = {
  color: '#f2f2f0',
  roughness: 0.5,
  metalness: 0.02,
} as const
