# NOTES

Running log of decisions, dead ends, and known issues. Updated at every phase checkpoint.

## Phase 0 — Scaffold

### Versions installed

| Package                            | Version |
| ---------------------------------- | ------- |
| next                               | 16.3.4  |
| react / react-dom                  | 19.2.8  |
| tailwindcss / @tailwindcss/postcss | 4.3.3   |
| typescript                         | 5.9.3   |
| sanity                             | 6.12.0  |
| next-sanity                        | 13.3.4  |
| @sanity/client                     | 8.4.0   |
| @sanity/image-url                  | 2.1.1   |
| @sanity/icons                      | 5.2.1   |
| eslint                             | 9.39.5  |
| prettier                           | 3.9.6   |
| pnpm                               | 11.25.0 |

Docs for next-sanity, Sanity TypeGen and Tailwind v4 were pulled through Context7 before any
code was written (SPEC §2), and Next 16's own bundled docs under `node_modules/next/dist/docs/`
were read for the caching model.

### Decisions

- **No `src/` directory.** SPEC §3 names `sanity/schemaTypes/`; the layout matches the spec
  literally. App Router lives at `app/`, alias `@/*` maps to the repo root.
- **Legacy caching model, not Cache Components.** Next 16 ships `cacheComponents` (`use cache`,
  `cacheTag`, `updateTag`) and next-sanity's newest guidance is built around `defineLive`. SPEC §3
  explicitly locks tag-based `fetch` caching plus `revalidateTag`, so that is what is wired.
  Next 16 documents the model as "Caching and Revalidating (Previous Model)" and still supports it.
- **`cache: 'force-cache'` is passed alongside `next: { tags }`.** In Next 16 `fetch` is no longer
  cached by default, so the spec's `{ next: { tags: [...] } }` alone would tag a request that is
  never cached and `revalidateTag` would have nothing to invalidate. This is an addition to the
  spec's snippet, not a departure from its intent.
- **`aboutHeadline` is optional, not required.** SPEC §3 lists it as required, but §3.1 says it is
  not yet supplied and must be left empty, and §3.2 requires the About tile to render without it.
  A `required()` rule would block publishing `siteSettings` at all. Max length 60 is enforced.
  Flip it to required once Yash supplies a headline.
- **`siteSettings` is a true singleton**: fixed document id `siteSettings`, removed from the global
  create menu and from initial-value templates, reachable only through its own structure item.
- **`socialLink` uniqueness on `platform` and `buttonSlot`** is enforced with an async custom
  validator that queries for a sibling document holding the same value (ignoring the draft/published
  pair of the document being edited). Sanity has no built-in cross-document unique constraint.
- **`@sanity/icons` and `@sanity/client` added as direct dependencies.** Both were already in the
  tree transitively, but pnpm's strict `node_modules` means schema files importing icons fail to
  resolve during `sanity schema extract`, and the TypeGen module augmentation
  (`declare module '@sanity/client'`) does not type-check unless the package is a direct dependency.
  Without the latter, `client.fetch()` results silently degrade to `any`.
- **Phase 0 installs no 3D dependencies.** three, R3F, drei, react-spring, motion and zustand land
  in the phase that first needs them.
- **No fonts loaded yet.** The scaffold's Geist/Geist Mono were removed — SPEC §10 allows only
  Archivo and Martian Mono, which arrive with the firmware UI in Phase 4.
- **`app/page.tsx` is a plain typed-GROQ readout**, not a design. It proves the Sanity round-trip
  for this checkpoint and becomes the visually-hidden semantic landmark required by SPEC §11.1 in
  Phase 8. It renders no string it was not given.

### Verified

- `pnpm typegen` — `sanity schema extract` runs entirely locally (no network, no auth) and emits
  `schema.json`; `sanity typegen generate` produces `sanity.types.ts` with 18 schema types and
  both query result types. Neither artifact contains the project id, so wiring `typegen` into
  `build` is safe on Vercel.
- `pnpm typecheck` — clean under `strict` + `noUncheckedIndexedAccess` + `noImplicitOverride`.
  No `any`, no `@ts-ignore` in the tree.
- `pnpm lint` — clean.
- `pnpm format` — clean.
- Typed GROQ: `SiteSettingsQueryResult` and `SocialLinksQueryResult` are generated from the
  queries in `sanity/lib/queries.ts` and applied automatically at the `client.fetch()` call site.

### Known issues / open risks

- **Blocked on Sanity login.** The Sanity project has not been created yet: `sanity login` needs an
  interactive browser flow. Until then there is no `.env.local`, so `pnpm build`, `pnpm dev` and
  `/studio` cannot run — `sanity/env.ts` throws by design rather than failing later with a confusing 404. Remaining Phase 0 checkpoint items: `/studio` visual verification, validation-rule screenshots,
  an empty-dataset `pnpm build`, and Yash entering the §3.1 values.
- `pnpm peers check` reports one unmet peer inside Sanity's own tree
  (`@sanity/workbench@0.1.0-alpha.24` wants `@sanity/sdk@^2.9.0`, installed 3.0.0). Upstream, not
  ours; nothing in this project imports either package.
- Prettier reformatted `SPEC.md` on its first run (table padding only — no content changed).
  `SPEC.md` is now in `.prettierignore` so the spec stays as authored.
- `corepack enable pnpm` needs an elevated shell on this machine (`EPERM` writing to
  `C:\Program Files\nodejs`). pnpm 11.25.0 was installed with `npm i -g pnpm` instead, landing in
  `%APPDATA%\npm`.

### Phase 0 follow-up — after Sanity login

Reusing the existing Sanity project **`yash-punia` (24ye8s9j)** rather than creating a new one. Its
`production` dataset held only Sanity's own system documents (`system.group`, `system.retention`),
so there was nothing to collide with. `.env.local` points at it; `http://localhost:3000` was added
to the project's CORS allowlist with credentials (it previously only allowed `localhost:3333`).

Three real bugs surfaced and were fixed:

1. **`sanity schema extract` refuses to overwrite `schema.json`.** The build script needed
   `--force`, otherwise every build after the first failed with
   `Schema file already exists`. Would have broken the first Vercel rebuild.
2. **`@sanity/icons` v5 is types/runtime mismatched.** Its `.d.ts` declares every icon as a named
   export, but the runtime root module only exports `Icon` and a lazy `icons` map — individual icons
   moved to subpath exports. `tsc` passed, the bundle failed. Icons were polish, not requirement, so
   the dependency was removed rather than worked around; the Studio uses default document icons.
3. **`@sanity/workbench` breaks `next dev`.** This transitive alpha dependency of `sanity` 6.12 maps
   its `development` export condition at raw TypeScript source, which Turbopack refuses to load from
   `node_modules` (`Error: Unknown module type`). Production resolves `default` → `dist` and was
   unaffected, so `pnpm build` passed while `/studio` 500'd in dev. Fixed with
   `transpilePackages: ['@sanity/workbench']` in `next.config.ts`. Revisit when `sanity` ships a
   stable workbench.

Verified after the fixes:

- `pnpm build` — clean against the empty dataset. Three routes, all prerendered static:
  `/`, `/_not-found`, `/studio/[[...tool]]`.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` — all clean.
- `/studio` loads in the browser, authenticates against project 24ye8s9j, shows the workspace title
  "Yash Punia — Portfolio". Zero console errors in a fresh tab.
- `/` renders as an empty document against the empty dataset — no placeholder copy, no errors, no
  invented strings. This is the SPEC §3.2 zero-data case for the page shell.

Still open at the end of Phase 0:

- **Studio logged-in verification is Yash's to do** — signing in means entering credentials, which
  is out of scope for the agent. Needs a look at: all four types listed and human-labelled,
  `siteSettings` behaving as a singleton (no create button, no list), and the `aboutBody` (320) /
  `blurb` (90–200) / `socialLink` uniqueness rules firing.
- **The §3.1 values are not entered yet** — `siteSettings` and the four `socialLink` documents.
  Until then the typed GROQ queries return `null` and `[]`, which is the correct empty-state result
  but does not prove the populated path.
- ~~**Chrome is not installed on this machine**, so the Chrome DevTools MCP cannot launch.~~
  **Resolved at the start of Phase 1** — Yash installed Chrome. The DevTools MCP now drives it:
  WebGL 2.0 on hardware `ANGLE (Intel … Direct3D11)`, `resize_page` and `take_screenshot` both
  working. All Phase 1 verification used it, per SPEC §0 rule 2.

## Phase 1 — Static console

Orthographic scene, procedural closed console, materials from SPEC §4, lighting, responsive camera
zoom. No interaction — no flap springs, no idle drift, no drag-to-rotate.

### Versions installed

| Package            | Version |
| ------------------ | ------- |
| three              | 0.185.1 |
| @react-three/fiber | 9.7.0   |
| @react-three/drei  | 10.7.8  |
| @types/three       | 0.185.4 |

R3F 9.7's peer range is `react >=19 <19.3`; the project's 19.2.8 sits inside it. Current docs for
R3F and drei were pulled through Context7 before any code was written (SPEC §2), and Next 16's own
bundled `lazy-loading.md` was read for the `ssr: false` rule.

No `@react-spring/three`, `zustand` or `motion` yet — Phases 2/3/4 each pull in their own.

### Decisions

- **The environment map is procedural, not `preset="city"`.** SPEC §4 names drei's `city` preset,
  but the presets fetch an HDRI from a third-party CDN at runtime — drei's own docs flag this as not
  production-ready, and it would put a network round-trip in front of the hero object (SPEC §12).
  `<Environment frames={1} resolution={256}>` with three `<Lightformer>` planes builds the same map
  in-scene: no network, no dependency, and placed softboxes shape a matte black shell better than a
  generic city HDRI. Faithful to §4's stated intent ("at low intensity for edge definition").
- **No `<ContactShadows>`.** §4 asks for one in place of shadow maps. It catches shadows on a
  _horizontal_ plane, and §4 also locks the camera front-on with no ground in frame — so the plane
  renders edge-on and contributes zero pixels while costing three extra full-scene renders per
  frame. This was verified, not assumed: tinted `#ff2200` at `opacity={1}`, it produced no pixels in
  any orientation reachable through the component's props (drei bakes `rotation-x={Math.PI/2}` into
  its group, and a prop that overrides it also flips the catcher plane away from the camera).
  Standing it up as a backdrop halo would darken exactly the area that currently separates a black
  shell from a black stage. The object is grounded by the pool of light behind it instead — a CSS
  radial on the page, since the canvas is transparent.
- **Panels are extruded `Shape`s, not `<RoundedBox>`.** RoundedBox rounds all twelve edges, which is
  wrong for the flaps: their inner edges meet at the centre seam and must stay square or the
  "hairline seam" opens into a lens-shaped notch at top and bottom. `geometry.ts` builds a rounded
  rect with per-corner radii and extrudes it, which also gives the frame-with-a-hole for the screen
  aperture for free. One helper, used by the body core, the body face, both flaps and both mouldings.
- **The flaps are inset 0.09 from the body outline, and each carries a shallow moulded panel.** This
  is the central lesson of the phase: under an orthographic camera locked dead-on, _coplanar faces
  render as one flat silhouette_. The first build was a featureless black rectangle. Depth had to
  come from geometry that breaks the plane — the body rim showing around the doors, the groove
  between them, the hinge posts standing in that groove, and the moulding's inner edges. The
  directional light was also moved from `[-5, 6, 7]` (near head-on, shades a flat face evenly) to
  `[-7, 6, 2.4]` (raking).
- **`envMapIntensity: 1.6` on the shell**, on top of §4's locked colour/roughness/metalness. At
  roughness 0.65 the env contribution is weak, and it is the only thing distinguishing one black
  face from the next.
- **The red seam is a painted band on each flap's inner edge**, not a strip at x=0. When the flaps
  open in Phase 2 the red travels with the doors, like a painted edge on a real moulding. Closed,
  the two bands read as one line split by the hairline gap — the gap was cut from 0.024 to 0.014
  because a dark gap wider than each band read as two stripes rather than one seam.
- **The flaps are hinge-pivot groups from the start**, at `rotation-y = 0`. Phase 2 springs an
  existing pivot rather than re-cutting geometry.
- **Camera is drei's `<OrthographicCamera makeDefault>` with a computed `zoom` prop**, not a mutated
  `state.camera`. The React Compiler lint rule `react-hooks/immutability` rejects writing to a value
  returned from a hook, and the declarative form is the correct fix rather than an eslint-disable.
  `useConsoleZoom` is now a pure computation off `state.size`.
- **All dimensions live in `dimensions.ts`.** This is the stated reason §4 forbids a GLTF, so the
  form stays tweakable in one file. `materials.ts` holds §4's material table as prop bags.
- **`app/page.tsx`'s markup moved into `.sr-only`.** Satisfies SPEC §1 (no text outside the console)
  today and pre-lands part of §11.1. It still renders nothing it was not given.

### Verified

- `pnpm typecheck` — clean under `strict` + `noUncheckedIndexedAccess`. No `any`, no `@ts-ignore`.
- `pnpm lint`, `pnpm format:check` — clean.
- `pnpm build` — clean against the empty dataset. Three routes, all prerendered static.
- Chrome DevTools MCP against `pnpm start` (production build): screenshots at 1440x900 and 390x844.
  Both show the closed console centred and correctly proportioned, with the body rim, the seam, the
  hinge posts and the moulded flap panels all reading.
- `list_console_messages` — one message, upstream (below). No errors.
- Canvas is `frameloop="demand"`, `dpr={[1, 2]}`, and three.js is behind
  `dynamic(..., {ssr: false})` in a Client Component (`ssr: false` is invalid in a Server Component
  in Next 16). The container is `fixed inset-0`, so the canvas reserves its space before the chunk
  arrives.

### Known issues / open risks

- **`THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.`** — one console
  warning, from `@react-three/fiber`'s own store (`new THREE.Clock()` in `events-*.esm.js`), not
  from this codebase. three r185 deprecated `Clock`; R3F has not migrated. Not fixable here without
  downgrading three or patching a dependency. SPEC §15 wants zero console warnings, so revisit at
  Phase 8 — by then R3F may have shipped the fix.
- Body bezel, screen plane and screen glass are built but **not visually verified** — the closed
  flaps cover the whole body face. They get their first look in Phase 2 when the flaps open.
- Stage background (`#0d0d10` with a radial lift to `#212429`) is a look call, not a spec value.
  SPEC gives no page background. Expect to retune it in Phase 7 alongside the screen themes.
- Bundle sizes not measured — SPEC §12's budget and `@next/bundle-analyzer` are Phase 8.
- Everything still open from Phase 0 stays open: the §3.1 content values are not entered, and the
  logged-in Studio verification is still Yash's to do.

## Phase 2 — Open/close and flaps

Flap hinges and springs, open on click, physical close button, `Escape`, a boot-free powered screen,
idle drift and the seam glow, and reduced-motion handling. No physical controls yet, no
drag-to-rotate, nothing on the screen.

### Versions installed

| Package             | Version |
| ------------------- | ------- |
| @react-spring/three | 10.1.2  |
| zustand             | 5.0.15  |

R3F 9.7 and React 19.2.8 both sit inside `@react-spring/three` 10's peer ranges. Current docs for
both packages were pulled through Context7 before any code was written (SPEC §2).

### Decisions

- **The flaps open to 172°, not SPEC §4's ±105°.** Agreed with Yash before building. The camera is
  locked front-on and never orbits, so a door stopped at 105° stands ~15° off edge-on: its inner
  face — which §4's own layout diagram covers with the info monitor, joystick, ABXY cluster and
  close button — would be a sliver, and Phase 3's controls would be unusable. 172° lays the doors
  flat beside the body, square to the camera as that diagram shows, keeping the last few degrees so
  they still read as hinged doors and catch a gradient. `FLAP_OPEN_ANGLE` in `dimensions.ts`.
- **The camera widens on open at ≥640px only.** Open, the console is roughly twice as wide
  (`CONSOLE_OPEN` is derived from the angle, ~8.8 units against 4.6 closed), so §6's "whole console
  visible, flaps in frame" needs a wider framing. Below 640px the zoom is unchanged and the flaps
  clip out of frame, which is §6's stated mobile behaviour; its other half — the camera springing in
  on the screen — is Phase 6.
- **The camera zoom is damped in `useFrame`, not sprung through a prop.** A `zoom` prop that tracks
  the target snaps on the state change, so the prop carries only the first computed value (held in
  `useState`, not a ref — the `react-hooks/refs` lint rule rejects reading `ref.current` during
  render) and `MathUtils.damp` owns it after that. Reduced motion goes back to the plain prop.
- **The screen's glass lights up; there is no lit plane behind it.** §4's glass transmits ~0.1, so a
  panel behind it would be invisible. The glass's `emissive` lerps black → §9's `#0A0F12` on open.
  That colour is near-black and tone mapping eats most of what is left, so `emissiveIntensity` is
  2.6 — a look call, not a spec value, and the first thing to retune when Phase 4 puts content on
  the screen. This is the "boot-free black screen plane" of §13: powered, no CRT sequence, no
  content.
- **Three small `useFrame`s rather than one.** The plan had the root group animating everything, but
  that meant threading refs from `Console` into every flap's seam material and into the screen. Each
  part owns the frame work for its own material instead: `Console` the yaw drift, `Flap` its seam
  glow, `Body` the screen power.
- **Idle drift damps its amplitude, not its angle.** Opening eases the drift out over ~0.5s instead
  of snapping the object straight while the flaps are still swinging.
- **`frameloop` is `"always"` unless motion is reduced.** §12 permits `"demand"` only while the idle
  animation is off, and §5's drift runs the whole time the console is closed. Reduced motion has
  nothing to animate, so it gets `"demand"` — and R3F invalidates on commit, so open/close still
  repaints without a manual `invalidate()`. Measured: 117 rAF callbacks in 600ms normally, 0 while
  idle under reduced motion, and 2 for the whole of an open.
- **Cursor ownership.** A closed flap sets `pointer`; an open one does not touch the cursor at all,
  because its events bubble past the close button's and would clear what the button just set.
  Neither R3F nor the browser fires a pointerout when the thing under a stationary pointer moves
  away, so `Flap` and `CloseButton` each drop the cursor in an effect when the console's state
  changes under them.
- **The keyboard listener lives in `ConsoleStage`,** on the DOM side, so it works before the
  three.js chunk lands. `Escape` closes; `Enter`/`Space` open when closed and nothing else has focus
  — a canvas that only opens by pointer is a dead end for keyboard visitors (§11.4). §8's "Escape
  closes the detail view first" arrives in Phase 4 with a detail view to close.
- **The store holds `isOpen` and nothing else.** §8's other fields are added by the phase that first
  reads them rather than stubbed now.

### Verified

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — all clean. Three routes, all
  prerendered static.
- Chrome DevTools MCP against `pnpm start` (production build), 1440×900 and 390×844:
  closed, mid-open and fully open at both widths. Mid-open frames are read off the WebGL canvas
  inside a `requestAnimationFrame` (the MCP screenshot round-trip is ~5s, far longer than the
  ~700ms spring) and composited over the stage gradient. The right flap visibly trails the left in
  both mid-open frames — the 60ms delay reads.
- Click a closed flap → opens, and the cursor is `pointer` over it beforehand and cleared after.
  Clicking an open flap changes the frame by 1/255 at most, against 18/255 for the same window with
  no input at all — nothing re-animates, so opening is idempotent.
- The close button closes it; `Escape` closes it; reopening returns to the same pose.
- Closed and idle, 2% of sampled pixels change over 1.2s (max 127/255 on the seam's red channel):
  the yaw drift and the glow pulse are both alive and both subtle.
- Reduced motion (`matchMedia` overridden before load): flaps open with no animation, no drift, no
  pulse, no zoom move, and the screen is lit the moment it is open.
- `list_console_messages` — one message, the known upstream `THREE.Clock` deprecation from R3F. No
  errors.

### Known issues / open risks

- **On mobile, an open console has no close affordance.** The close button rides the right flap,
  which clips off-screen at <640px by design (§6). `Escape` still closes it, which a phone does not
  have. §6's DOM control overlay — close button included — is Phase 6, and this gap closes with it.
- The screen's powered look (`emissiveIntensity` 2.6 on a near-black `#0A0F12`) is a look call
  against a black stage. Revisit in Phase 4 when real content sits on it, and in Phase 7 with the
  light theme.
- The flap interiors are bare — the info monitor, joystick, ABXY and CV button are Phase 3. The
  close button has no glyph yet for the same reason.
- Bevelled corners on the flaps mean the seam band stops short of the top and bottom corners; closed,
  the join reads as one line, but the band is `FLAP.radius` short at each end. Left as is.
- `THREE.Clock` deprecation warning, drag-to-rotate, bundle budget: all still open from Phase 1.
- Everything still open from Phase 0 stays open: the §3.1 content values are not entered, and the
  logged-in Studio verification is still Yash's to do.

### Phase 2a — Proportions and the tuning panel

Yash asked for a taller console covering more of the screen, thinner screen bezels, and a squarer
overall shape with a 4:3 screen — plus browser controls to fine-tune all of it before the numbers
are baked in. Not committed yet; the defaults below are a starting point to dial in.

**The form is now state, not constants.** `dimensions.ts` and `materials.ts` became pure
`derive*(tuning)` functions, `tuning.ts` holds the values in a persisted zustand store, and
`useSpec()` gives every part the derived geometry and materials. Nothing else reads the tuning
store. SPEC §4 forbids a GLTF so the form stays tweakable in code; this keeps that property while
making the tweaking live.

**New defaults.**

| Value       | Was               | Now             |
| ----------- | ----------------- | --------------- |
| Body        | 4.6 × 3.0 (23:15) | 4.2 × 3.6 (7:6) |
| Screen      | 3.0 × 1.7 (16:9)  | 3.6 × 2.7 (4:3) |
| Side bezel  | 0.80              | 0.30            |
| Top bezel   | 0.65              | 0.45            |
| Flap        | 2.20 × 2.82       | 2.00 × 3.42     |
| Closed fill | 58% w / 66% h     | 62% w / 82% h   |

The screen aperture is now derived (`screen + bezelPadding` per edge) rather than being an
independent number, so thinning the bezel is one control instead of three that have to agree. Height
is the binding constraint on a square-ish object at desktop aspect ratios, so the vertical fills do
the work: at 1440×900 the closed console is ~861 × 738 CSS px against ~836 × 545 before.

The vertical bezel stays deliberately deeper than the horizontal one — SPEC §4 puts the power slider
on the lower bezel below the screen, and Phase 3 needs somewhere to put it. If that ends up looking
top-heavy, split the padding per edge rather than shrinking it everywhere.

**The tuning panel** (`TuningPanel.tsx`) renders only behind the `?tune` query flag and is
`next/dynamic` in its own chunk, so no visitor pays for it and no text reaches the page for anyone
who does not ask (SPEC §1). It covers every dimension, the open angle, two camera-zoom multipliers,
and the five material colours. Edits persist in `localStorage` (a key added to `Tuning` later falls
back to its default rather than arriving `undefined` from an older record); "copy defaults" puts a
`DEFAULT_TUNING` body on the clipboard to paste into `tuning.ts`; "reset" returns to what the source
says today.

Verified: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` clean. Against
`pnpm start`, editing body height, screen height and the accent colour through the panel's own
inputs rebuilds the geometry and reframes the camera live, the values survive in `localStorage`, and
reset restores every one of them. `/` without `?tune` renders no panel. One console message, the
known upstream `THREE.Clock` warning.

Open risks: `Skeleton.tsx` tracks `DEFAULT_TUNING`'s 7:6 by hand — it is plain CSS that renders
before any 3D code loads, so a tuned body ratio will not match the placeholder until the numbers are
baked in. The panel is unstyled beyond the minimum and is not part of the product.

**Saving the tuned values as the defaults.** "save as default" in the panel POSTs the current values
to `app/api/tuning/route.ts`, which rewrites the `DEFAULT_TUNING` block in `tuning.ts` in place. The
panel then clears its `localStorage` override and reloads, so what renders afterwards is the new
default rather than a saved copy sitting on top of a stale one. "copy" still puts the same block on
the clipboard, which is the route out when the endpoint is not there.

The endpoint edits a source file, so it is fenced in rather than trusted:

- it 404s unless `NODE_ENV` is development, so a deployed build has no file-writing route — verified
  against `pnpm start`, where the POST 404s and `tuning.ts` is untouched. It is still listed in the
  build output as `ƒ /api/tuning`; the guard is what makes it inert, not its absence;
- the path it writes is a constant here and never comes from the request;
- it only ever replaces the `DEFAULT_TUNING` block, and fails with a 500 if that block is not found;
- the body must carry exactly the keys `DEFAULT_TUNING` has, each with its default's type: numbers
  finite and within ±1000, colours a six-digit hex. Anything else is a 400 with nothing written.
  Verified: an empty object, a named colour, a string where a number belongs, an extra key, and
  `1e9` are each rejected, and a valid body writes exactly the one changed line and leaves the file
  Prettier-clean;
- the values written are re-rendered from the validated primitives, so nothing from the request
  reaches the file verbatim. Numbers go through `toFixed(4)` because slider arithmetic produces
  things like `0.30000000000000004`.

Verified end to end against `next dev`: changing the corner radius in the panel and pressing "save
as default" wrote `bodyRadius: 0.22` into `tuning.ts`, cleared the stored override, reloaded, and
left the panel reading no changes — the tuned value had become the default. The test values were
restored afterwards; the defaults in the table above are what is in the file.

## Phase 3 — Physical controls

Joystick with two-way arrow-key mirroring, ABXY bound to the `socialLink` documents, the power
slider, the CV button, the info monitor, and drag-to-rotate with clamping and snap-back. Nothing is
drawn on the main screen — that is Phase 4.

### Versions installed

None. Everything here is built from what Phases 0–2 already pulled in; the only new imports are
three's own `SVGLoader` (bundled with three) and `next/font/google`. Current drei (`<Html>`) and
`@react-spring/three` docs were pulled through Context7 before writing against them (SPEC §2).

### Decisions

- **Sanity content reaches the canvas as props, not context.** `app/page.tsx` already fetched
  `siteSettings` and the four `socialLink`s; they now travel `ConsoleStage → Scene → Console → Flap`
  as a `ConsoleContent` object (`content.ts`). React context does not cross R3F's separate
  reconciler without drei's `useContextBridge`, and the tree is four hops deep — props are smaller
  and have no such caveat.
- **`theme` is `'dark' | 'light' | null` in the store, and `null` means "not chosen".** `useTheme()`
  resolves it against `prefers-color-scheme`, so the slider is the source of truth only once it has
  been touched (SPEC §9). The store gained `persist` with `partialize` to `{theme}` — whether the
  console was open is a property of a visit, not of the visitor. `rotation` stays out of the store
  entirely: SPEC §8 sketches it, but one component reads it and a spring inside that component is
  the whole implementation.
- **Direction input lives in its own module (`input.ts`), not the console store.** It is transient
  hardware state. `hold(direction)` owns the 180ms key repeat, and both the arrow keys and a
  joystick drag call it — which is what makes the mirroring one input rather than two that agree.
  `tick` (the repeat stream) has no consumer until Phase 4's rails; the joystick renders its lean
  from `held`.
- **Flap-interior parts wrap their content in a group turned through π.** A door that swings 172°
  mirrors everything on its inner face. One `rotation-y={Math.PI}` group per part cancels that, so
  the furniture is authored as if facing the camera (+x right, +y up, +z out of the surface) and
  glyphs read the right way round. `dimensions.faceZ` is that plane.
- **The joystick cap is a dome, not a disc.** Built flat first, it was invisible: under a locked
  front-on camera a flat cap shades exactly like the flat flap behind it. This is Phase 1's lesson
  again — curvature is what carries a gradient. Verified by tinting the shell red to prove the mesh
  was there before changing its shape.
- **Brand marks are inline SVG path data** (`glyphs.ts`), parsed with three's `SVGLoader` and laid
  on the caps as flat `ShapeGeometry` (SPEC §4's "flat extruded SVG"; §2 forbids an icon package).
  The marks are the owners' own, used to link to Yash's profiles. `ShapePath.toShapes()` rather than
  `SVGLoader.createShapes()`, which three r185 deprecated and which warned six times per load.
  SVG's y axis points down, so the geometry is flipped on y — which reverses winding, hence
  `side: DoubleSide` on the glyph meshes (wanted anyway: the doors rotate through 172°).
- **An unbound ABXY slot keeps its cap and loses its mark.** A physical console does not lose a
  button because a document has not been published (SPEC §3.2).
- **The CV button carries the arrow and no words.** The label lives in the `.sr-only` landmark
  (and, from Phase 4, in the firmware); a printed label on a 0.9-unit cap would be unreadable at
  every breakpoint. A Sanity asset is cross-origin, where `download` is ignored, so those hrefs get
  Sanity's `?dl=` parameter; the committed `/resume.pdf` fallback gets a real `download` attribute.
- **Tab focus reuses the anchors already on the page.** The `.sr-only` list is four real,
  server-rendered links carrying the accessible names, so each now also carries `data-social-slot`
  and `ConsoleStage` mirrors their focus onto the matching 3D focus ring (SPEC §11.4). A second,
  hidden set of controls would have made a screen reader read every link twice.
- **The info monitor's text is drei `<Html transform>`,** the same mount SPEC §7 locks for the
  firmware screen, mounted only while the console is open (closed, it faces into the body, and DOM
  in 3D space has no depth test) and `aria-hidden` (the landmark is the accessible copy). drei lays
  transform-mode content out at `400 / distanceFactor` px per world unit — 40px by default — which
  the panel's scale has to undo; without that the whole monitor rendered 6px wide.
- **Archivo and Martian Mono load now, one phase earlier than planned,** because the info monitor is
  the first surface with text on it (SPEC §10 permits exactly these two).
- **A closed flap takes part in a drag.** SPEC §5 says drags starting on interactive meshes must not
  rotate the model, but it also wants a shaky tap on a door to still open it — so the flap records
  its pointerdown, lets it bubble to the drag handler, and opens only if the release landed within
  6px. Buttons, the joystick, the slider and the screen all stop their pointerdown, so a drag from
  any of them rotates nothing.
- **`sliderY` defaults to −1.84, not −1.9.** At −1.9 the nub poked below the closed flaps and read
  as a stray white chip on an otherwise clean closed silhouette.
- **New tuning knobs are positions and sizes only** (eleven of them, plus `screenLightColor`).
  Internal proportions — collar thickness, cap heights, glyph size, LED radius, nub travel — are
  derived constants in `dimensions.ts` next to the ones that were already there.

### Verified

All against `pnpm build` + `pnpm start` (production) at 1440×900, driven by the Chrome DevTools MCP.
Synthetic pointer events need `offsetX`/`offsetY` defined explicitly — R3F raycasts from those, and
a `PointerEvent` constructed in the page has them at 0 — plus a following `click` for R3F to
synthesise `onClick`.

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` — all clean, no `any`, no
  `@ts-ignore`. `/` still prerendered static.
- **Info monitor** — renders "Yash Punia" / "Game Programmer" from `siteSettings`. `statusLine` is
  empty in the dataset and correctly renders nothing. The empty-dataset case was seen for real
  (a build that raced a running server prerendered no data): the panel renders lit and blank, with
  no placeholder copy and no error.
- **Joystick** — holding `ArrowLeft` leans the dome left in the screenshot; keyup re-centres it.
  Hovering the cap sets `grab`, and a pointer drag from it emits the same held direction. The 180ms
  repeat has no consumer to observe until Phase 4, so its cadence is asserted by construction.
- **ABXY** — with `window.open` stubbed: clicking each cap opens exactly its own URL with
  `noopener,noreferrer` (X→x.com, A→itch.io, B→github, Y→linkedin — §3.1's table, unchanged), and
  pressing `a`/`b`/`x`/`y` opens the same four. Focusing the hidden `B` anchor lights the ring
  around the GitHub cap and nothing else.
- **CV button** — with `HTMLAnchorElement.prototype.click` stubbed, the press resolves to
  `https://cdn.sanity.io/…/….pdf?dl=Yash-Punia-Gameplay-Programmer.pdf` (Sanity has a `resumeFile`
  uploaded). The fallback branch was seen in the same empty-data build: `/resume.pdf` with
  `download="Yash-Punia-Gameplay-Programmer.pdf"`.
- **Power slider** — a click travels the nub, dims the LED, and swaps both the screen glass and the
  info monitor between `#0a0f12` and `#edeae2`; the chassis is unchanged in both. `localStorage`
  holds `{"theme":"light"}` after the first click and `dark` after the second.
- **Drag-to-rotate** — a 900×400px drag from the flap shell holds at the clamp (~22° yaw, ~14°
  pitch) instead of spinning; release springs back to square. A drag that starts on the screen
  rotates nothing.
- **Tap versus drag** — `Escape` closes; hovering a closed flap sets `pointer`; a 96px drag across a
  closed flap does not open it; a 4px shaky tap does.
- **Reduced motion** (`matchMedia` overridden before load) — the console opens with no animation and
  30ms after releasing a drag it is already square: no snap-back animation, no spring on any press.
- **Tuning panel** — `?tune` shows the four new groups and all eleven new number inputs; editing
  `abxySpacing` rebuilds the cluster live and persists. `/` without `?tune` renders no panel.
- `list_console_messages` — one message, the known upstream `THREE.Clock` deprecation from R3F. The
  `SVGLoader.createShapes` warning this phase introduced was fixed rather than accepted.

### Known issues / open risks

- **The light theme's screen is blown out.** `screenEmissiveIntensity` (2.6) was dialled in against
  a near-black dark screen; the same value on `#edeae2` renders as flat white rather than a backlit
  LCD. It wants to be per-theme, which is a Phase 7 job alongside the contrast audit.
- **The 180ms key repeat is unobservable until Phase 4** — nothing subscribes to `input.tick` yet.
  Verify the cadence when the rails consume it.
- **`next build` while `next start` is running prerenders a page with no CMS data.** It cost an hour
  of chasing a phantom regression here. Stop the server before building.
- The Chrome window will not resize below ~501px wide on this machine, so this phase's small-screen
  check was made at 501×844 (closed console, clean). The mobile-open framing and the DOM control
  overlay are Phase 6, and Phase 2's "no close affordance on mobile" gap stays open with them.
- The info monitor is themed by the power slider along with the screen. SPEC §5 only exempts the
  chassis, and a second display that ignored the toggle would read as a bug — but it is a call, not
  a spec line.
- `THREE.Clock` deprecation warning and the bundle budget: still open from Phases 1–2.
- Everything still open from Phase 0 stays open: the logged-in Studio verification is Yash's to do.
  `siteSettings` and the four `socialLink` documents are populated and published now, so this phase
  exercised the real content path rather than the empty one.

### Amendment — the resume link moved into the monitor

The physical CV cap is gone. The resume is now a "Download Resume" line inside the info monitor,
which turns the accent colour on hover.

- The cap could only ever carry an arrow — 0.63 world units is too small for a word at any
  breakpoint — while the monitor is the one lit surface on that flap and already renders type. So
  the words went where they can be read, and `CvButton.tsx`, the `download` glyph, and the
  `cvButtonY` / `cvButtonWidth` knobs were deleted rather than left unused.
- It is a `<span>`, not a `<button>` or `<a>`: the `<Html>` wrapper is `aria-hidden`, and a
  focusable element inside an `aria-hidden` subtree is a focus trap. Keyboard and screen-reader
  visitors download from the `.sr-only` anchor in the landmark, which was already there. The
  wrapper keeps `pointer-events: none` and the span alone re-enables it, so the rest of the panel
  stays click-through to the meshes behind it.
- **The label is hard-coded**, which SPEC §15 ("every string on screen originates from Sanity")
  does not allow. `siteSettings.resumeLabel` exists and currently reads "Resume"; switching to it
  is a one-line change once the field says what should appear on the monitor.
- Verified in the production build: the span renders `#e9f0f1` at rest and `#4be12d` (the tuned
  accent) on `pointerover`, and clicking it resolves the same Sanity href with
  `?dl=Yash-Punia-Gameplay-Programmer.pdf` the cap used to.

## Phase 4 — Firmware: Library

The screen has a UI on it. `<Firmware />` is a self-contained DOM tree — a status bar, a boot
sequence, the Library rail and an expanded detail view — mounted through drei's `<Html transform>`
onto the screen plane. The timeline rail is Phase 5; the mobile mount and the DOM control overlay
are Phase 6.

### Versions installed

None. Everything here is built from what Phases 0–3 already pulled in. `@react-spring/web` is
**not** installed — only `@react-spring/three` is, and it does not carry the web entry point — so
the rail's motion is CSS transitions rather than springs. At 280ms on one transform that is the
whole of what a spring would have bought, and it is one fewer package in the bundle (SPEC §12).

### SPEC §16, answered

All four open items were confirmed before this phase, three of them at the SPEC's own default:

1. **Rail order** — About is index 0 of the same rail as the projects.
2. **Detail view** — `Enter` opens an expanded in-place panel.
3. **Firmware version string** — `YP-OS 1.0`.
4. **Sound** — not built. SPEC §13 puts audio in Phase 7 and there is nothing here for a hook to
   attach to yet; no muted stubs were left behind.

A fifth question the SPEC could not have asked: the chassis accent is a tuning value and has been
dialled to something other than §9's red, so **the screen's selection colour follows
`accentColor`** rather than hard-coding a red. The screen and the object it is set into agree, and
one knob retunes both.

### Decisions

- **The firmware knows nothing about 3D.** `components/firmware/` imports the store, the content
  types and the reduced-motion hook, and not one thing from three.js. That is what makes Phase 6's
  fullscreen mobile mount a second `<Firmware />` call rather than a second implementation
  (SPEC §7).
- **Authored at 900×875 CSS px and scaled to the panel.** The same trick the info monitor already
  used, now shared: `htmlScale()` holds drei's `400 / distanceFactor` arithmetic and the comment
  explaining it, and both surfaces call it. The authored size matches the screen's own 3.6 × 3.5
  ratio, so scaling by width lands it on the glass — retuning the screen's proportions means
  retuning `SCREEN_PX` with them.
- **The screen is nearly square, and the SPEC §8 sketch is not.** That diagram implies a widescreen
  rail with four tiles across. At 1.03:1 only two and a bit fit, so the rail carries fewer tiles and
  the description block below them does the work.
- **No `occlude="blending"`.** drei's occlusion writes the panel into the depth buffer through a
  hidden mesh. Under this scene's orthographic, dead-on camera nothing ever passes in front of the
  screen, so it buys nothing while costing a draw — and with the flaps swinging through 172° it
  gives the doors something to fight.
- **One palette module, two surfaces.** `firmware/theme.ts` owns SPEC §9's two palettes as CSS
  custom properties, and the info monitor's hard-coded copy is gone. The monitor's lit plane colour
  now comes from `palette.bg` rather than the tuning's `screenColor` — the same value, one source.
- **The accent is contrast-corrected, in the right direction.** `readableAccent()` steps the tuned
  accent away from the screen background until it clears 4.5:1 — _lightening_ on the dark theme,
  _darkening_ on the light one. The first cut only darkened, which made a red on a near-black
  background worse, and "ENTER — DETAILS" was very nearly invisible on screen. SPEC §9's own two
  accents (a brighter red for dark, a deeper one for light) encode the same rule.
- **The About tile carries the name, not the headline.** The headline is already the heading
  directly below the rail when About is selected; a tile repeating the sentence under it reads as a
  bug rather than a design.
- **Enter on About is a no-op.** There is no expanded view of the About tile to open, so it does not
  open an empty one.
- **`input.tick` finally has a consumer.** The 180ms repeat stream Phase 3 built asserted its
  cadence by construction because nothing subscribed to it; the rail subscribes now, and the
  joystick and the arrow keys move the selection through the same path. `up`/`down` are still
  no-ops — Phase 5 gives them somewhere to go.
- **Wheel input discards inertia rather than queueing it.** Delta accumulates to 40, fires one move,
  then locks for 120ms — and anything arriving _during_ the lock is thrown away instead of banked.
  Banking it would just replay the flick one tile at a time after the lock expired, which is the
  skipping SPEC §8 forbids by another route.
- **The clock is `useSyncExternalStore`, polled twice a minute.** Its snapshot is `HH:MM`, so React
  re-renders only when the minute actually turns — and every re-render of this tree repaints the
  canvas it is drawn into. A `useEffect` + `setState` clock is also what
  `react-hooks/set-state-in-effect` rejects.
- **The firmware is `aria-hidden`, and the live region is not in it.** The page's `.sr-only`
  landmark is the accessible copy of every string on the screen (SPEC §11.1) and now carries the
  projects too — heading, blurb and each link as a real anchor. What a screen reader cannot learn
  from it is that the joystick moved the selection, so `ConsoleStage` renders one `aria-live` line
  saying what is selected, in the page's own DOM. Links inside the panel stay `<span>`s for the
  reason the resume link already is one: a focusable element inside an `aria-hidden` subtree is a
  trap.
- **Portable Text is rendered by twelve lines, not a package.** `description` is empty on every
  published project, and the schema's editor produces blocks of spans. If it ever grows lists or
  marks that matter, swap in `@portabletext/react` rather than growing this.
- **Covers are plain `<img>` with Sanity CDN transforms.** The element lives inside an `<Html>`
  subtree in the canvas, and Sanity already does the resizing and format negotiation `next/image`
  would add. The `@next/next/no-img-element` rule is disabled on those two lines, with the reason.

### Verified

Chrome DevTools MCP against `pnpm dev`, then again against `pnpm build && pnpm start` (SPEC §0
rule 2). No console errors in either; the only warnings are Phase 1's `THREE.Clock` deprecation and
the HLSL precision notices.

- Opening plays the boot once and hands over at **981ms**; closing and reopening ends at **322ms**
  — the full and short forms of SPEC §7 (900 / 250 plus a render frame). The Library is mounted and
  interactive underneath the overlay throughout.
- `←`/`→` and the joystick move one tile per press through `input.tick`; holding repeats at 180ms.
- A twenty-event inertial flick (600px of `deltaY` in one burst) moves **one** tile. Two notches
  300ms apart move two. Reversing moves back.
- At the end of the rail, another notch does nothing: clamped, no wrap, no bounce (SPEC §3.2).
- `Enter` opens the detail panel — cover, meta grid, blurb, links; `Escape` closes it and a second
  `Escape` closes the console (SPEC §8).
- **Contrast, measured rather than assumed (SPEC §9).** Dark: foreground 16.7:1, muted 5.46:1,
  accent 4.97:1. Light: foreground 14.87:1, muted **4.23:1 — a fail**, so the light muted was
  darkened from SPEC §9's `#6b6f70` to `#656a6b` (4.56:1), hue unchanged. All body text now clears
  AA on both themes.
- Empty states, forced by stubbing the query result in `app/page.tsx`:
  - **Zero projects** — the rail holds the About tile alone, no scroll affordance, no placeholder
    cards, and `Enter` opens nothing.
  - **One item** — left and right are no-ops.
  - **No cover** — an accent-tinted tile with the title in Archivo Expanded, in both the rail and
    the detail view. No broken-image icon, no `<img>` in the DOM at all.
- `prefers-reduced-motion: reduce` (injected `matchMedia`): the boot is skipped entirely — no
  animated element in the tree 250ms after opening — and the Library is present immediately.
- Light theme via `prefers-color-scheme`: screen, info monitor and accent all flip together.
- `Tab` still reaches the `.sr-only` anchors and still lights the matching ABXY focus ring in 3D;
  the landmark's headings now read About, then each project.
- `pnpm typecheck`, `pnpm lint`, `pnpm build` all clean.

### Known issues / open risks

- **The rail's lower half is empty space.** On a square screen the tiles sit at the top and the
  description under them ends around two-thirds down. Phase 5's timeline indicator belongs in that
  gap, so it is left alone rather than padded out now.
- **Touch swipe on the screen is not wired.** SPEC §8 lists swipe left/right and up/down; those are
  mobile input and land with Phase 6's fullscreen mount, alongside the DOM control overlay.
- **`ENTER — DETAILS` and `ESC — BACK` are hard-coded strings**, as is `YP-OS 1.0`. SPEC §15 wants
  every string on screen to originate from Sanity. These are console chrome rather than content —
  the same argument the info monitor's `Download Resume` label is still open on — and both should be
  settled together, either by adding fields or by amending §15 to exempt diegetic chrome.
- **`libraryIndex` resets to 0 on every open.** SPEC §7 ends the boot with the About tile focused,
  so reopening deliberately does not restore where you were.
- **The detail panel scrolls with no visible affordance** when a project has a long description.
  Nothing published is long enough to scroll yet; revisit when one is.
- **Two `<Html transform>` mounts now sit in the scene** (the monitor and the screen), each its own
  DOM layer over the canvas. No frame-rate impact measured on this machine; the bundle and
  performance budget are still Phase 8.
- `THREE.Clock` deprecation warning and the bundle budget: still open from Phases 1–3.
- Everything still open from Phase 0 stays open: the logged-in Studio verification is Yash's to do,
  and `socialLink` still has three documents for four ABXY slots — the unbound cap renders without a
  glyph, as designed.

### Phase 4a — Firmware tuning

The `?tune` panel now has two tabs, **console** and **firmware**, and the firmware UI's sizes and
spacing are tuning values rather than constants in the components.

- **One store, one record, one save.** The firmware keys live in the same `Tuning` interface as the
  geometry, so persistence, "copy", "reset" and the `/api/tuning` save-as-default route all carry
  them with no change — the route iterates `DEFAULT_TUNING`'s keys and validates against their
  types, so it picked up sixteen new numbers on its own. Only the panel's list of controls splits
  in two, which is what the tabs are.
- **`firmware/layout.ts` is the firmware's `spec.ts`.** `useFirmwareLayout()` derives the layout
  from the tuning values the same way `useSpec()` derives the geometry, and every firmware
  component reads it. Nothing in `components/firmware/` holds a hard-coded pixel size any more.
- **The panel's height is not a knob.** It follows the screen's own aspect
  (`fwPanelWidth * screenHeight / screenWidth`), because a panel of any other shape would not land
  on the glass. `SCREEN_PX` is gone with it.
- **`fwPanelWidth` is the whole UI's zoom.** Everything else is authored in that space, so lowering
  it magnifies the entire screen UI at once and raising it shrinks it — one knob for "the firmware
  is too big", before touching any individual size.
- **Sizes that should not drift apart are derived, not knobbed.** The tile title follows the tile
  width, the `ENTER — DETAILS` line follows the meta size, the detail title follows the rail title.
  Sixteen knobs already ask a lot of a tuning session; thirty would be a worse tool.
- **Colours stay on the console tab.** The screen's palette is SPEC §9's and its accent is the
  chassis accent, so there is no colour that belongs only to the firmware.

Verified in the browser: the firmware tab renders all five groups; dragging `fwPanelWidth` from 900
to 620 magnifies the UI live and the panel still fills the glass exactly; `save as default` round
-tripped two changed firmware values into `tuning.ts` and back out again; the console tab, the rail
and the detail view are unchanged at the default values. `pnpm typecheck`, `pnpm lint` and
`pnpm build` are clean.

One sharp edge, unchanged from before: `save as default` answers **500 "Could not find
DEFAULT_TUNING in tuning.ts"** when the posted values are identical to what is already in the file
— the route reports "the file did not change" as a failure to find the block. Harmless, and only
reachable by posting to the route directly, since the button disables itself when nothing has
changed.

## Phase 5 — Firmware: Timeline

The screen has a second section. `↓` from the Library enters a horizontal timeline of experience
and education, `↑` comes back, and the selected dot's panel sits under the axis. The mobile mount
and touch swipe are still Phase 6; themes and polish are Phase 7.

### Versions installed

None. Same as Phase 4: everything is built from what Phases 0–3 pulled in, and the axis moves on
the same CSS transition the Library rail uses rather than a spring package that is not installed.

### Decisions

- **Order is SPEC §8's, not the date order the content implies.** The query sorts
  `select(kind == "work" => 0, 1)` then `startDate desc` — work group first, education after, each
  most-recent-first. The group key is written out rather than leaning on `"work"` sorting after
  `"education"` alphabetically, which is true but accidental. **Consequence with the published
  content:** `BTech` and `Class 12th` are both saved with `kind: "work"`, so the axis reads
  Hypemasters → Goldman Sachs → Lucid Labs → Ajna Lens → BTech → Class 12th → MTech, and the MTech
  lands right of Class 12th. That is a content fix in the Studio (set both to Education), not a code
  one — Yash confirmed the SPEC ordering knowing this.
- **`Enter` on a timeline entry does nothing** (confirmed with Yash). The entry's detail is already
  on screen when it is selected, so there is no second layer to open and no second `Escape` level.
  The Library keeps its drill-down; the check is on `section === 'library'`, not on the index alone.
- **One `move()`, three inputs.** The arrow keys, the joystick and the wheel all land in the same
  function in `ConsoleStage`, which dispatches on the section: left/right move within the rail on
  screen, down/up move between the sections. Phase 4 left `up`/`down` as no-ops in the tick
  subscriber; they are now the only place section changes happen, so the joystick, the keys and the
  section hint cannot drift apart.
- **The section hint is a control, not a sign.** `▾ TIMELINE` / `▴ LIBRARY` sits in the band the
  rail leaves empty at the bottom of the screen — the gap Phase 4's notes flagged — and clicking it
  switches. Everything else on the screen is clickable; a label that was not would read as broken.
  With no timeline entries it does not render at all.
- **The dots carry `kind` in their fill, not in a label.** Work is filled, education is ringed, the
  selected one is accent-filled at 1.7×. The scale is a `transform` inside a fixed-size box, so the
  axis line stays put and nothing reflows as the selection moves.
- **`monthLabel`/`entryDates` live in `content.ts`, not in the firmware.** The hidden landmark
  renders the same date strings on the server that the axis renders on the client. They slice the
  `YYYY-MM-DD` string rather than parsing it — `new Date('2022-02-01')` is UTC midnight and reads as
  January west of Greenwich — and use a fixed month table rather than `Intl`, because a locale that
  disagreed between server and client is a hydration mismatch.
- **Four knobs, not ten.** `fwAxisTop`, `fwDotGap`, `fwDotSize`, `fwEntryGap` join the firmware tab;
  every font on the axis derives from the sizes already there. `/api/tuning` picked the four up on
  its own, as designed.
- **`logo` is queried and rendered nowhere.** Every published entry has one, but SPEC §8's timeline
  is dots, dates and organisation names — a row of logos is a different design. The field is not in
  the query at all, so adding it later is a query change plus a render, not a cleanup.

### Verified

Chrome DevTools MCP against `pnpm dev`, then again against `pnpm build && pnpm start` (SPEC §0
rule 2). No console errors in either; the only warning is Phase 1's `THREE.Clock` deprecation.

- `↓` enters the timeline and the status bar reads `TIMELINE`; `↑` returns and it reads `LIBRARY`.
  A second `↑` in the Library does nothing.
- Order on screen is Hypemasters → Goldman Sachs → Lucid Labs → Ajna Lens → BTech → Class 12th →
  MTech, matching the query and the decision above.
- `←`/`→` move one entry per press; **holding for 560ms moved four entries** — one on the take plus
  three at the 180ms repeat, so the joystick's stream drives the axis exactly as it drives the rail.
- A twenty-event inertial flick (600px of `deltaY`) moves **one** entry.
- At either end, another notch does nothing: clamped, no wrap, no bounce.
- `Enter` on a selected entry leaves the screen unchanged; `Escape` still closes the console.
- The live region announces `Timeline, <role> at <organisation>` on every move, and the `.sr-only`
  landmark now carries all seven entries as real headings with dates, summary and result.
- Empty states, forced by stubbing the query result in `app/page.tsx`:
  - **Zero entries** — the section hint does not render, `↓` is a no-op, no axis is mounted.
  - **One entry** — left and right are no-ops and the axis does not translate.
  - **No `highlights`, no `relatedProjects`, no `result`** — each collapses; nothing published has
    highlights, and `result` renders only on the three entries that have one.
  - **`isCurrent`** — the range reads `Mar 2026 – now`.
- **Chips**, stubbed by linking a project to the first entry: the chip renders under the summary and
  clicking it lands on that project in the Library rail with the status bar back to `LIBRARY`.
- `prefers-reduced-motion: reduce` (injected `matchMedia`): the axis and dots fall back to the 100ms
  opacity crossfade, and the panel has no entry animation.
- Light theme via `prefers-color-scheme`: the screen, the axis and the accent flip together and the
  chassis is unchanged.
- `pnpm typecheck`, `pnpm lint`, `pnpm build` all clean.

### Known issues / open risks

- **Unselected dots and their labels sit at `fwUnselectedOpacity` (0.5)**, which puts them under AA
  as measured text. That is the Library rail's existing treatment for unselected tiles and the same
  argument holds: the accessible copy of every entry is the landmark, and the selected entry — the
  one being read — is at full contrast. Worth revisiting in Phase 7 if the light theme's muted grey
  proves too quiet at 50%.
- **A neighbour's organisation name is clipped mid-word at both panel edges** as the axis slides
  (`ool` of "DAV Public School" at the left edge, `NIT Ham` at the right). It is the rail continuing
  past the frame, the same as the Library's tiles, but a soft mask at the edges would read better.
  Phase 7.
- **`timelineIndex` is not reset when the section changes**, only when the console opens. Coming
  back to the timeline returns you to where you were in it, which is the opposite of the Library's
  behaviour on open — deliberate, but the two rules are worth stating together if a third section
  ever appears.
- **`RESULT — ` is another hard-coded chrome string**, joining `ENTER — DETAILS`, `ESC — BACK`,
  `YP-OS 1.0` and the section hint's `TIMELINE` / `LIBRARY`. SPEC §15 wants every on-screen string to
  come from Sanity; these are diegetic chrome and the question is still open from Phase 4.
- The `THREE.Clock` deprecation warning and the bundle budget: still open from Phases 1–3.
- **Verification tip, learned the hard way:** `console-tuning` in `localStorage` is per-origin, so a
  `pnpm start` on a different port than the last one can render with months-old proportions and
  colours. Clear it before trusting a screenshot.

### Phase 5a — Menu, section arrows, no About tile

Three changes Yash asked for after seeing Phase 5 on the screen.

- **The About tile is gone from the Library rail.** Index 0 is now the first project, and the rail
  is projects and nothing else. The name, title and about text move to the left flap's info monitor
  in a later pass, where they are visible whatever the screen is showing — which is the argument
  against a tile that had to be scrolled away from. `libraryIndex` shifted by one everywhere it is
  read: the rail, the detail lookup, the announcement, and the timeline's related-project chips.
  `aboutHeadline` / `aboutBody` still render in the hidden landmark (SPEC §11.1); nothing on the
  screen reads them at the moment.
- **The boot hands over to a menu, not to the Library.** Two buttons, one per half of the screen:
  `Games / Projects` on top, `Experience` under it. Up and down move the highlight, `Enter` opens
  it, a click opens that half directly, and hovering a half highlights it. The screens are now a
  vertical stack — menu, Library, Timeline — that up and down walk.
- **The stack is one definition.** `neighbours(section, content)` in `content.ts` says where up and
  down go from each screen, and both the keys and the arrows drawn on the screen read it, so a
  section that is not reachable cannot be drawn as reachable. `menuOptions()` is the same idea for
  the menu: a section with nothing published is not offered, is not a neighbour, and its arrow does
  not render.
- **`SectionArrow` replaces the small `▾ TIMELINE` hint.** A large accent chevron with the
  destination's name beside it, above the section for up and below it for down. The up/down axis is
  the one thing a horizontal rail cannot suggest on its own, which is why it needed to be bigger
  than a hint.
- **Two vocabularies for the same screens, deliberately.** The status bar keeps its short caps
  chrome (`MENU`, `LIBRARY`, `TIMELINE`); the menu and the arrows use readable names
  (`Games / Projects`, `Experience`, `Menu`) from `SECTION_LABELS`. Both are hard-coded chrome, the
  same open question as `ENTER — DETAILS` and `YP-OS 1.0`.
- **On the menu, every direction moves the highlight.** The two halves are stacked, so left and
  right do what up and down do rather than being swallowed — and the wheel, which maps vertical
  scroll to `left`/`right`, therefore also works there.

**The education ordering was already correct; the content is what is wrong.** The query sorts
`select(kind == "work" => 0, 1) asc, startDate desc`, so each group is newest-first — verified
against the live dataset by splitting it into two multi-entry groups, which came back in date order
within each. The education group has exactly one member because **`BTech` and `Class 12th` are both
published with `kind: "work"`**. Setting those two documents to Education in the Studio gives
Hypemasters → Goldman Sachs → Lucid Labs → Ajna Lens, then MTech → BTech → Class 12th. No code
change would produce that: nothing in the schema says a BTech is education except the field itself.

### Verified

- Boot ends on the menu with `Games / Projects` highlighted; `↓`/`↑` move between the halves and
  clamp at both ends; `Enter` and a click both enter the highlighted half.
- `↑` from the Library returns to the menu, `↓` goes to the Timeline; `↑` from the Timeline returns
  to the Library. The arrows on screen match, and clicking one switches.
- `Enter` on the first project now opens its detail — the tile that used to be About no longer
  swallows it — and `Escape` backs out to the rail, then closes the console.
- **Zero projects:** the menu offers only `Experience`, `↑` from the Timeline goes to the menu
  rather than to an empty rail.
- **Zero timeline entries:** the menu offers only `Games / Projects`, the Library draws only its
  `▴ Menu` arrow, and `↓` there does nothing.
- `pnpm typecheck`, `pnpm lint`, `pnpm build` and `prettier --check` all clean.

### Phase 5b — The power slider becomes a theme button on the right flap

SPEC §4 and §5 put a DS-style power slider on the body's lower bezel. Yash asked for it to move to
the top of the right flap as a physical control, so `PowerSlider.tsx` is gone and
`parts/ThemeToggle.tsx` takes its place.

- **Where "the top side of the right panel" landed.** On the flap's **inner face**, above the ABXY
  cluster — not on its top edge. The camera is orthographic and dead-on (SPEC §4), so a control on
  an upward-facing edge would be a line of pixels nobody could aim at. The toggle mirrors the close
  button: `closeButtonY` measures up from the flap's bottom edge, `toggleY` measures down from its
  top one.
- **It is a round cap like the others, and it turns over.** The first cut was a capsule switch with
  a sliding knob; Yash asked for a circle. So it is an ABXY-sized cap in a matching collar, but
  black instead of off-white, with a moon on one face and a sun on the other in the accent colour.
  Pressing it springs the cap through half a revolution: the mark on show _is_ the mode — moon for
  dark, sun for light — so the control needs no label and no separate lamp beside it, which is what
  SPEC §5's LED beside the slider track was for.
- **Half a revolution, not a crossfade.** The two marks are real geometry on opposite faces, so the
  one not showing is hidden by the cap itself rather than by a mask — and the rotation reads as a
  physical object turning over, which a fade does not. It is negative, so the mark on show leaves
  to the left and the next arrives from the right; the far mark is turned through π itself, or it
  would arrive mirrored.
- **The cap is deeper than a face button's.** It is seen edge-on halfway through every flip, and a
  wafer would read as a sheet of paper: `TOGGLE_CAP_HEIGHT` is 0.06 against the face buttons' cap.
- **Two glyphs joined `GLYPHS`.** A crescent moon, and a sun whose rays are rounded — the squared
  rays of the first attempt read as spikes at this size. The sun is drawn 14% larger than the moon:
  every glyph is normalised to its longest side, and the sun's rays inflate its bounding box, so at
  equal sizes it reads smaller. An optical correction, not a different size.
- **Drag-to-throw is gone with the slider.** It carried ~35 lines that turned a pointer drag past a
  quarter of its travel into a theme change, including the orthographic-zoom arithmetic that turned
  world travel into a pixel threshold. A button is pressed. That code is in `PowerSlider.tsx` at
  commit 3437be6, and the capsule switch that briefly replaced it is at 2d4022d.
- `sliderY` / `sliderWidth` in the tuning are now `toggleY` / `toggleRadius`, and the panel's
  "Power slider" group is "Theme toggle". The `slider` block in `dimensions.ts` is a `toggle`
  block; nothing else read it.

### Verified

- Clicked in a real browser and screenshotted: the cap turns over, the moon gives way to the sun,
  and the screen, the info monitor and the firmware all turn light with it. Clicking again turns it
  back. One frame caught it mid-flip, which is what confirms it is a rotation rather than a swap.
- The cursor becomes a pointer over the button only while the console is open, and is dropped when
  the flap carries it away.
- A press on it does not drag the console round — its `pointerdown` is swallowed, like the
  joystick's and the close button's.
- The body's lower bezel is now bare and the closed console is unchanged.
- `pnpm typecheck`, `pnpm lint`, `pnpm build` and `prettier --check` all clean.

### Known issues / open risks

- **The cap is black where every other cap is off-white**, which is deliberate — Yash asked for a
  black face with accent marks — but it does make this the one control on the object that does not
  announce itself as pressable by its colour. Its collar and its size are the ABXY vocabulary, so
  it still reads as a button; worth a look in Phase 7 with the rest of the polish.
- SPEC §4's list of permitted accent surfaces named the power-slider track; the toggle's two marks
  take that slot, so the count of accent surfaces on the object is unchanged.
- **The target is smaller than the capsule was** — an ABXY cap rather than a 0.6-wide switch. Fine
  with a mouse; Phase 6's mobile overlay gets its own DOM-sized control anyway.

### Phase 5c — The stage follows the theme

The theme button now flips the page behind the console as well as the screen: near-black in dark,
a warm off-white in light.

- **The chassis still does not change** (SPEC §5). What changed is the stage — the gradient
  `globals.css` paints on the body — because a light screen inside a near-black page reads as a
  lamp in a dark room rather than as a display with its backlight up.
- **`--stage` and `--stage-glow` are registered with `@property` as `<color>`.** Without that they
  are strings to the animation engine and the gradient built from them jumps; registered, the pair
  cross-fades over 320ms. Reduced motion drops the transition and swaps outright.
- **`ConsoleStage` sets `data-stage` on `<html>` and nothing else.** The colours and the fade live
  in CSS; the component only says which pair is in force, from the same `useTheme()` the screen and
  the info monitor read.
- The light stage is `#e4e0d7` with a `#f5f2eb` lift in the middle — a shade off the screen's own
  `#edeae2`, so the glass still reads as a lit panel set into the object rather than a hole in the
  page.

### Verified

Clicked the theme button in a real browser, both ways: the page fades between the two stages, the
screen, the info monitor and the firmware flip with it, and the chassis is the same object in both.
One frame caught the stage mid-fade, which is what confirms the registered properties interpolate
rather than switch. `pnpm typecheck`, `pnpm lint`, `pnpm build` and `prettier --check` clean.

### Known issues / open risks

- **A stored light theme flashes.** The stage is dark until `ConsoleStage` hydrates and sets
  `data-stage`, so a returning visitor who chose light sees one dark frame first. The usual fix is a
  blocking inline script in `<head>` that reads `localStorage` before first paint; it is worth doing
  when the theme's first paint is looked at properly in Phase 7, not before.

## Phase 6 — Mobile

Below 640px the open console kept the closed framing, so the flaps swung out of frame and the
screen stayed a ~230px rectangle nobody could read — and every control was on those off-screen
flaps, so once it was open on a phone there was no way to navigate it and no way to close it. SPEC
§6 calls this "the important divergence"; this phase builds it.

### The camera frames the screen, not the object

Orthographic zoom is pixels-per-world-unit, so SPEC §6's "the screen fills roughly 92% of the
viewport width" is one division: `width * 0.92 / dimensions.screen.width`. At 390px that is 99.7
against the closed framing's 65.4 — a 1.52× jump, which reads as the camera springing in. The glass
lands at 359 × 349, about 10px of bezel shows each side, the body's top and bottom edges stay in
frame and the flaps clip away.

- **`zoomScaleOpen` is deliberately not applied to it.** The DOM layer over the glass is sized from
  the same `SCREEN_FILL`, so a tuning multiplier on one and not the other would slide the panel off
  the screen. The two constants live in `components/console/mobile.ts` precisely so both sides of
  the canvas boundary read one definition.
- **No camera offset was needed.** `Body.tsx` puts the core, the aperture, the bezel and the glass
  all at `[0, 0, z]`, and only `z` differs — which does not move an orthographic projection. The
  camera at `[0,0,10]` already lands world (0,0) on the viewport centre, so a fixed DOM box centred
  with `translate(-50%,-50%)` sits on the glass. `Scene.tsx` needed no change at all.
- **Reduced motion was already right.** `Scene.tsx` renders `zoom` as a prop under reduced motion
  and drei's `<OrthographicCamera>` commits it in a layout effect, so the framing snaps.
- **Flap clipping is free.** WebGL clips at the frustum, drei sizes the frustum to the canvas, and
  R3F only raycasts coordinates that are on the canvas — so off-frame furniture is neither drawn
  nor touchable. Nothing was written for it.
- **Drag-to-rotate is off on a phone while open** (`Console.tsx`), reading `state.size.width` inside
  the canvas rather than a media query. Closed, it still rotates at every width.

### One firmware, two mounts

`<Html transform>` does not mount below 640px. `MobileConsole.tsx` puts the same `<Firmware />`
tree in a fixed box glued to the glass rect instead — the tree itself is unchanged, which is what
SPEC §7 means by one implementation and two mounts.

- **Glass-aligned, not fullscreen.** SPEC §6 says 92% of the viewport width and §7 says "fullscreen
  DOM layer"; those reconcile only if "fullscreen" means "on the page rather than in the scene".
  Yash chose the glass-aligned reading: the chassis and its bezel stay visible around the panel, so
  on a phone the console is still the object rather than a web page that replaced it.
- **The info monitor's `<Html>` comes off with it.** DOM in 3D has no frustum any more than it has a
  depth test, so with the flaps framed off the sides it was rendering over the screen, mirrored,
  with drei recomputing its matrix every frame. Between the two gates there is now no DOM-in-3D on
  mobile at all, which is the point of the second mount.
- **The panel is re-authored, not shrunk.** The desktop panel is 900px wide and lands on a ~560px
  glass; the mobile one lands on ~350px. A single factor puts 16px body text at 6px, and raising the
  factor clips a stack whose height follows the screen's aspect and does not grow with it. The
  ratios differ per value — type wants about a fifth off, whitespace four fifths — so `MOBILE` in
  `layout.ts` is a table of authored values. `deriveFirmwareLayout` has one caller, and every
  firmware component reads that hook, so the numbers reach all of them with no component changed.
  Marked `ponytail:`: a const dialled by hot reload at 390px, not a live `?tune` knob.
- **A 180ms fade, delayed 260ms**, so the opaque panel does not overhang the glass while the camera
  damps in. It reuses `firmware-fade`, already in `globals.css`, and is dropped under reduced motion.
- **No `touch-action: none` on the layer**, unlike the canvas and the overlay. The detail view is a
  real scrolling box and `touch-action` is intersected down the ancestor chain, so `none` here would
  have taken a descendant's `pan-y` with it. Nothing else on the page scrolls.
- `ENTER — DETAILS` and `ESC — BACK` name keys a phone does not have. There they read
  `TAP — DETAILS` and `BACK`; the taps behind both already worked.

### The control overlay

The flap furniture, unfolded around the glass. Each control is on the side its physical counterpart
is on: CV top-left and the D-pad bottom-left (the left flap's monitor and joystick), the theme
toggle top-right, ABXY bottom-right with the close cap beneath it (the right flap's stack).

- **Nothing is re-implemented.** The D-pad writes the same `held` direction the arrow keys and the
  3D stick write, so `useInput`'s 180ms repeat, `useRailInput`'s subscription and the one `move()`
  dispatcher all came along untouched — and the stick out of frame leans with the finger. ABXY
  resolves through `linkForSlot`, fires `openLink`, and lights from the same `pressedSlot` the
  meshes read. The CV is a plain anchor with the same `resumeHref` the monitor uses.
- **`onClick` for ABXY, not the pointer events the cap already handles.** iOS only lets
  `window.open` through inside a trusted gesture.
- **Colours come from `useSpec().materials`,** so one set of tuning values dials the object and its
  overlay together. SPEC §6 asks for a "red press state", but the chassis accent has been a tuning
  value since Phase 1 and is currently green; a control that flashed a colour the object never uses
  would read as a different product. Same reasoning `theme.ts` runs for the screen's selection
  colour.
- **A dark cap takes a light collar**, where the object's toggle is bezel-on-bezel. On the console
  it reads because it is lit and specular; a flat black disc on a near-black stage would be a hole.
- **U+FE0E on the sideways D-pad arms.** Without it Android and iOS render U+25C0/U+25B6 as blue
  emoji while the up and down triangles stay text, and a D-pad with two arms in a different colour
  is not a D-pad.
- **The glyph paths moved to `glyphPaths.ts`, which imports nothing.** `glyphs.ts` needs three to
  extrude the marks and the overlay is on the deliberately three-free DOM side, so importing it
  there would have pulled the 3D chunk into everyone's page bundle (SPEC §12). The platform-to-mark
  map went with it, so the cap and its DOM counterpart cannot disagree. `GLYPH_BOX` is new: every
  path is authored in a 24 box except LinkedIn's, which is a 16 and would render two thirds size in
  an `<svg>`.
- **SPEC §6 puts ABXY and close both "bottom-right".** The physical right flap stacks them —
  `closeButtonY` is near the flap's bottom edge, the diamond at its centre — so the overlay does too.
- `MobileConsole` is dynamically imported: it is ordinary DOM, but no desktop visitor should pay for
  it.

### Swipes

`useTouchRail` sits beside `useWheelRail` in `ConsoleStage` and goes through the same private
`move()` — a swipe is only another way of naming a direction (SPEC §8).

- **Carousel-natural**: the content follows the finger, so swiping left brings the next project in
  from the right and swiping up goes to the next section. A judgement call; the opposite convention
  is one sign flip.
- 44px threshold, dominant axis wins outright, mouse pointers ignored, and the whole effect is gated
  on mobile.
- A gesture that starts on `[data-console-overlay]` is dropped, so dragging off the D-pad cannot
  also move the rail.
- Nothing calls `preventDefault`, so the firmware's own taps still work — a tile to select, a tile
  again to drill in, `BACK` to come out. That closes the loop on touch: the detail view opens and
  closes without a keyboard.

### Accessibility

Everything in the overlay is `aria-hidden` with `tabIndex={-1}` **except the close button and the
theme toggle**, which are real buttons with labels, rendered outside the hidden containers.

The `.sr-only` landmark in `app/page.tsx` already carries the four social links and the CV as real
anchors — the same reasoning the firmware and the info monitor run on, and reading them twice is
worse than reading them once. But close and theme have no twin anywhere, and a touch screen-reader
user has no `Escape` key, so leaving them hidden would have meant no way out. A focusable element
inside an `aria-hidden` subtree is the trap `InfoMonitor` already names, hence outside rather than
inside.

### Two things deferred from earlier phases, folded in

- **The stored theme no longer flashes** (5c). A synchronous script in `<head>` reads the key the
  store persists to and stamps `data-stage` before the first paint. It has to be inside an explicit
  `<head>` element: React 19 refuses to order a sync inline script rendered anywhere else, and
  `next/script` with `beforeInteractive` as a child of `<html>` is invalid HTML — both were tried and
  both errored in the console. `<html>` carries `suppressHydrationWarning`, because the server
  cannot know what is in someone's `localStorage` and that difference is the point of the script.
  The stage only: the screen's palette lives inside the canvas, which does not exist that early.
- **The info monitor carries the About copy** (5a). Phase 5a deleted the About tile and left
  `aboutHeadline`/`aboutBody` rendering only in the hidden landmark. The monitor is the left flap's
  one lit surface, so they sit beside the name, each guarded on its own like every other string on
  that panel.

### Verified

In a real browser at 390×844 and 430×932, closed and open, plus 1440×900 to confirm nothing on
desktop moved:

- Closed at both widths is unchanged — the whole console centred, the same object Phase 1 built.
- Open, the camera springs onto the glass, the flaps clip away, and the firmware is crisp DOM on it.
  Menu, Library, Timeline and the detail view all fit and read; the detail view scrolls by finger.
- Every D-pad arm moves the rail, and holding one repeats at 180ms — a 700ms hold walked several
  projects.
- An ABXY cap lights its accent ring and calls `window.open` with the bound URL (stubbed in the
  harness to keep the popup from navigating away): `https://x.com/…` from the X cap.
- The theme cap flips `data-stage`, the screen, the stage and the info monitor together, and its
  label becomes "Switch to the dark theme". The close cap closes and the overlay unmounts with it.
- Swipes: left advances the rail, right goes back, up enters the Timeline, and a 20px drag does
  nothing. A swipe that starts on the D-pad is ignored.
- Under reduced motion the layer's `animation-name` is `none` and the open snaps.
- Desktop still mounts through `<Html transform>` with no overlay, and the info monitor now shows
  the name, title, status, About headline and body, and the resume link.
- `pnpm typecheck`, `pnpm lint`, `pnpm build` and `prettier --check` all clean; the browser console
  is clean.

### Known issues / open risks

- **Swipes were verified synthetically** — dispatched `PointerEvent`s with `pointerType: 'touch'`,
  not a finger. The thresholds and the direction convention want a real-device pass.
- **`env(safe-area-inset-*)` is unverified.** DevTools' viewport resize does not report insets, so
  only the `max(14px, …)` fallback was exercised. The notch and home-indicator case needs a device.
  `viewportFit: 'cover'` is set, without which the insets would report zero regardless.
- **The mobile layout table cannot be dialled from `?tune`.** It is a const; the workflow is editing
  it at 390px with the dev server hot reloading. Fine until it is not.
- **The theme cap crossfades its two marks** rather than turning over like the physical one. A CSS
  card-flip is a dozen lines for a fingertip-sized control; marked `ponytail:` and worth a look in
  Phase 7 with the rest of the polish.
- **The bottom cluster is tight.** At 390×844 there are 248px below the glass and the D-pad, the
  ABXY diamond and the close cap take most of it. Caps are 46–52px, above the 44px floor, but there
  is no room to grow them.
- Everything Phase 7 already owned is still open: the hard-coded chrome strings, the 0.5-opacity
  labels failing AA, organisation names clipping mid-word, and the detail panel scrolling with no
  visible affordance — which is more noticeable on a phone than it was on a desktop.
- `frameloop="always"` still renders the whole scene while open on a phone. SPEC §12 / Phase 8.

### Phase 6a — The phone is the handheld

Phase 6 zoomed the camera onto the glass and redrew the flap furniture as a DOM overlay, because
the flaps were off-frame. Yash asked for the opposite: keep the object whole, turn it sideways, and
let the visitor turn the phone to match. A handheld should be held.

So the overlay is gone — the D-pad, the ABXY cluster, the CV pill, the theme cap and the close cap
are all deleted, along with the fullscreen firmware layer they sat around. The controls people press
on a phone are now the same meshes they press on a desktop.

- **`MobileConsole.tsx` is deleted** (439 lines), and with it the second firmware mount. `Screen`
  and `InfoMonitor` mount their `<Html transform>` at every width again, so SPEC §7's "one
  implementation, two mounts" is back to one mount. The glass is part of the object, so the panel
  rides the object's matrix and the quarter turn comes free.
- **The glyph split is reverted.** `glyphPaths.ts` existed so the three-free DOM overlay could draw
  the same marks; with no overlay there is no second consumer, and a module that exists for a
  deleted reason is worse than the duplication it prevented. `glyphs.ts` and `FaceButtons` are back
  to what they were at 22170be.

**The quarter turn.** `Console` springs `rotation-z` to 90° when the console is open on an upright
phone, and back to 0 when it closes. Closed, the console still stands portrait and centred — the
first thing anyone sees is unchanged. The turn on open _is_ the instruction to turn the phone;
nothing tells the visitor to, because a thing rotating in your hand is a clearer instruction than a
sentence.

- **Clockwise, so the phone is turned anticlockwise to follow it** (flipped from the first cut in
  6b). Either direction lands the left flap — the info monitor and the joystick — under the left
  hand and ABXY under the right; the turn only decides which way the wrist goes to get there, and
  Yash preferred this one.
- **Auto-rotate needs no orientation API.** A phone that has already rotated to landscape has a
  viewport wider than it is tall, and `isPortraitPhone` is false there, so the console does not
  turn — the browser has done the turning. That is the whole of the handling: one comparison, no
  permissions, no `screen.orientation` listener. With auto-rotate locked off the viewport stays
  portrait and the roll does the work instead. Both paths end with the console upright in the
  visitor's hands.

**The framing follows.** `useConsoleZoom` no longer has a zoom-to-glass case. Turned, the console's
footprint is its own box with the sides swapped, so the fit is the same arithmetic transposed, at
0.92 × 0.94 of the viewport — an open console being held should take nearly all of it, and there is
nothing else on the page to leave room for. The glass lands at about 315px on a 390px phone, which
is why `MOBILE`'s `fwPanelWidth` came down from 360 to 320: the panel is then scaled by roughly one
on its way to the glass, and the sizes in that table are near enough the sizes that reach the eye.

**Two input mappings had to learn about the turn.** Both are the same rotation, and both must match
`Console`'s roll — if one sign flips, all three do.

- `useTouchRail` — a swipe's screen deltas are turned by a quarter before they are named, so a
  finger moving what the visitor sees as left still moves the rail left.
- `Joystick` — same correction, and for the same reason: the stick's own right points up the
  screen once the console has rolled, so without it pushing the stick right emitted `up`. The
  stick's _lean_ needed no correction — it is rendered in the console's own space, which the roll
  has already rotated.

Everything that was not about the overlay stayed: `TAP — DETAILS` and `BACK` still replace the key
names a phone does not have, the theme-flash script and the About copy in the info monitor are
untouched, and drag-to-rotate is still off on a phone while open — though now because the controls
are a fingertip wide and a drag would fight the taps aimed at them, not because the object is
off-frame.

#### Verified

At 390×844, 844×390 and 1440×900:

- Closed at 390×844 is unchanged. Opening rolls the console a quarter turn and settles with the
  whole object in frame — both flaps, the joystick, ABXY, the theme cap, the close cap, the info
  monitor and the screen, nothing clipped.
- The firmware reads at a good size on the turned glass through Menu, Library and Timeline.
- Swipes in the turned frame all four map correctly: what the visitor feels as left advances the
  rail, right goes back, up enters the Timeline and down returns to the Library.
- Tapping the meshes works in the turned layout: the theme cap flipped the stage dark→light→dark,
  and the X cap opened `https://github.com/Yash-Punia`.
- At 844×390 — a phone that auto-rotated — the console does not roll and stands upright with the
  joystick left and ABXY right.
- Desktop at 1440×900 is untouched: same framing, same `<Html transform>` mounts, info monitor and
  firmware both rendering.
- `pnpm typecheck`, `pnpm lint`, `pnpm build` and `prettier --check` all clean.

#### Known issues / open risks

- **The joystick's turned mapping is not verified by driving the stick.** The browser pane in this
  session throttles timers and frames whenever it is hidden, which kills any synthetic drag — a
  press-and-hold needs frames to advance. The correction is the same transform as the swipe's,
  which is verified end to end, and the stick's hit-testing is the same R3F path as the two caps
  that were tapped successfully. It still wants a real thumb on a real phone.
- **The close cap was not tapped either**, for the same reason. It is the same tap path as the
  theme and ABXY caps, both of which work.
- **The turn direction commits everyone to one wrist.** A visitor who turns the phone the other way
  gets the console upside down, and nothing catches that: with auto-rotate off there is no way to
  know which way the phone actually went, short of `DeviceOrientation` and its iOS permission
  prompt. Auto-rotate on is the case that always comes out right, because the browser reports the
  orientation and the console does not turn at all.
- **The turn is not announced.** A visitor with reduced motion set gets the console already turned,
  with no rotation to read as an instruction. The `.sr-only` landmark carries the whole portfolio
  regardless, so nothing is unreachable, but the hint is gone.
- **Controls are small.** Held sideways on a 390px phone the ABXY caps are around 30px across —
  under the 44px touch target the deleted overlay was built to hit. That is the trade for pressing
  the real object, and it wants a device test before it is called fine.
- `env(safe-area-inset-*)` is now unused. `viewportFit: 'cover'` is kept, because the canvas fills
  the viewport and the stage gradient should reach under the notch.

### Phase 6b — The turn goes the other way

Yash asked for the opposite rotation, so `Console`'s roll is `-Math.PI / 2` and the visitor turns
the phone anticlockwise to follow it. The grip is unchanged either way — the joystick still lands
under the left hand and ABXY under the right — because turning the console one way and the phone
the other cancel out. It is a preference about the wrist, not about the layout.

Three signs move together or not at all: the roll in `Console`, and the quarter-turn each of
`useTouchRail` and `Joystick` applies to a drag before naming a direction. Turned this way the
console's own right points **down** the screen rather than up, so the transform is `(dy, -dx)`
where it was `(-dy, dx)`.

#### Verified

At 390×844: the console rolls the other way and settles with the joystick flap at the top of the
portrait screen — which becomes the left hand once the phone is turned anticlockwise. All four
swipes still map correctly in the turned frame: what the visitor feels as left advances the rail,
right goes back, up enters the Timeline, down returns to the Library. `pnpm typecheck`, `pnpm lint`,
`pnpm build` and `prettier --check` clean.

The joystick's drag mapping is still unverified by driving the stick, for the reason recorded in 6a.

## Phase 7 — Themes and polish

SPEC §13 names this phase "both screen themes, contrast audit, persistence, scanlines, all
micro-interactions, sound design hooks". Half of it was already standing — both palettes, the
`readableAccent()` correction, `localStorage` persistence with Phase 6's no-flash head script, the
scanline and vignette overlays, the stage cross-fade. So this phase is the **polish ledger** the
earlier phases each deferred here, plus the two decisions that were parked.

### Versions installed

None. The sounds are Web Audio oscillators; everything else is CSS and React state that was already
in the tree.

### The two parked decisions, answered

1. **Sound (SPEC §16.2).** Built, **audible**, with a mute in the status bar. The SPEC's own default
   was "hooks, shipped muted, with a mute toggle", which is dead code for everyone who never finds
   the toggle. A handheld that makes no noise is a screenshot.
2. **Hard-coded chrome strings vs SPEC §15.** §15 is **amended in place** rather than worked around:
   content comes from Sanity, the firmware's diegetic chrome does not. The amendment names which
   strings it covers and why, so the question is closed rather than carried forward a fourth time.

### Decisions

- **The screen's emissive is a pair, not a number.** `screenEmissiveIntensity` was dialled against a
  near-black dark screen; on the light theme's warm paper-white the same 2.6 rendered flat.
  `screenEmissiveIntensityLight` joins it, `Materials` carries `screenEmissive: {dark, light}` beside
  the `screenOn` colours it already had, and `Body` — which already read `useTheme()` — picks one.
  Measured on the glass at 1440×900 in the light theme: **2.6 gives a mean of rgb(243,242,241)**
  against **1.0's rgb(219,218,215)**, and the 2.6 frame washes the accent-tinted menu highlight out
  to a pale sage. 1.0 is a look call, not a spec value — but it is a `?tune` knob now.
- **Opacity came off the text, not off the graphic.** Phase 5 dimmed a whole timeline `Dot` group to
  `fwUnselectedOpacity` (0.5), which took the date and the organisation name with it and put muted
  text under SPEC §9's 4.5:1. The dot itself still dims — it is a graphic. The same carve-out was
  needed in the Library: a tile's dimming moved from the tile onto its **face**, because SPEC §8's
  reduced opacity is right for a cover image and wrong for the title on a tile that has no cover. A
  coverless tile goes quiet by dropping its accent tint from 24% to 12% and leaves the title at full
  contrast.
- **`edges.ts` holds the two places content runs out of the panel.** A left/right `mask-image` on the
  timeline's axis, so an organisation name fades rather than being chopped mid-word ("ool" of "DAV
  Public School"), and a bottom gradient on the two scrolling boxes. The fade is **not** conditional
  on whether the box actually scrolls: with nothing to scroll it draws the background over the
  background and no pixel changes, which is cheaper than measuring `scrollHeight` on every resize,
  every theme change and every selection. It is a sibling of the scrolling box — inside it, it would
  scroll away with the content.
- **The selected tile scales again.** SPEC §8 asks for ~1.18×; `fwSelectedScale` had been dialled to
  **1**, so the rail had no scale change at all. It is 1.12 now, with the rail's bottom padding
  raised from 10 to 14 for the headroom. Verified not to clip in the mobile layout table either.
- **One hover idea, used everywhere.** What is under the pointer comes forward slightly and no
  further: a tile lifts 3px and un-dims, a timeline dot returns to full opacity, a section arrow's
  label goes from muted to foreground. The menu already had a hover — it moves the highlight — so it
  was left alone. This is a menu (SPEC §10); the screen stays quiet.
- **The theme cap borrows the face buttons' press.** It is the one cap on the object that is black
  where every other one is off-white, which was Phase 5b's open risk. Its collar now flashes accent
  for 140ms and the cap sinks by `abxy.travel` on the same fast spring. Local state rather than
  `input.ts`'s `pressedSlot`, which is keyed by ABXY slot — this control has no slot and no keyboard
  twin to stay in step with.
- **Every cue fires from inside a store action**, not from the control that caused it. The arrow
  keys, the joystick, the wheel, a swipe and a click on a tile already share `moveLibrary` and its
  siblings, so firing there is what makes all five sound the same — the argument `move()` in
  `ConsoleStage` already runs on. `moved()` also makes a clamped no-op **silent**: at the end of a
  rail there is no wrap and no bounce (SPEC §3.2), so there is nothing to hear.
- **The sounds are synthesised, not sampled.** Four short cues do not justify four audio files — a
  fetch, a decode and a licence question each — when an oscillator and a gain envelope are the whole
  of what they are. `audio.ts` imports nothing (SPEC §12). The envelope matters more than the
  waveform: a square wave cut off abruptly clicks, so every note ramps to a near-zero floor.
- **The `AudioContext` is created on the first cue, never at module load.** A browser refuses one
  before a gesture and logs a warning for the attempt, and every cue is downstream of a click, a key
  or a tap.
- **The mute glyph is a `<span>`; its accessible twin is a real button in the page.** The firmware
  tree is `aria-hidden` and a focusable element inside one is a trap — the arrangement the resume
  link has had since Phase 3 and Phase 6's close and theme buttons had. U+266A is a text-default
  character, so it does not arrive as a colour emoji the way a speaker glyph would.
- **`muted` persists beside `theme`.** Both are properties of the visitor; whether the console was
  open is a property of the visit.
- **`Download Resume` was content, not chrome.** `siteSettings.resumeLabel` already existed and the
  hidden landmark already read it; only the info monitor was hard-coding the words. `RESUME_LABEL`
  moved from `app/page.tsx` into `content.ts` and both surfaces read the one definition. Against the
  live dataset the monitor now reads **"Resume"**.

### Verified

Chrome DevTools MCP against `pnpm dev`, then again against `pnpm build && pnpm start` on a clean
port (SPEC §0 rule 2), with `console-tuning` and `console` cleared from `localStorage` first. Both
`list_console_messages` runs returned exactly one message — Phase 1's upstream `THREE.Clock`
deprecation. No errors.

**Contrast, measured in the page (SPEC §9's checkpoint):**

| Theme | Background | Foreground  | Muted      | Accent      | Scanline |
| ----- | ---------- | ----------- | ---------- | ----------- | -------- |
| Dark  | `#0a0f12`  | **16.7:1**  | **5.46:1** | **11.11:1** | 0.03     |
| Light | `#edeae2`  | **14.87:1** | **4.56:1** | **5.56:1**  | 0.015    |

Every body-text value clears AA's 4.5:1 on both themes — and the muted figure is now the figure the
timeline's unselected labels actually render at, which was the point of taking the opacity off them.
The accent is high because the tuned chassis accent is a green; `readableAccent()` still corrects it
per theme (`#4be12d` dark, `#236a15` light).

- **Light screen, not blown out** — screenshots at 1440×900 of the same frame at 1.0 and at 2.6, plus
  the glass means quoted above. The 1.0 frame has a defined vignette and black type; the 2.6 frame is
  a white bloom with pale-sage highlights.
- **Selected tile** — `scale(1.12) translateY(-6px)` with the accent outline; the unselected one at
  `scale(1) translateY(0px)` with its cover at 0.5 opacity and `saturate(0.35)`.
- **Hover** — over an unselected tile the transform becomes `translateY(-3px)` and its cover goes to
  opacity 1 and `filter: none`; leaving restores both.
- **Theme cap press, caught in the pixels.** The collar region read rgb(18,23,16) at rest,
  **rgb(48,75,34) 70ms into a press** — the accent flash — and rgb(16,20,15) once it released, with
  `data-stage` flipped to `light`. Frames read off the WebGL canvas inside a `requestAnimationFrame`,
  the technique Phase 2 established.
- **Timeline** — the axis fades at both ends rather than cutting a word, and the labels render at
  full `--screen-muted` while the dots keep the 0.5.
- **The detail view scrolls, and says so** — on "Aurora Game Engine" the box measured 815px against
  994px of content, with the bottom fade over it.
- **Sound, counted rather than heard.** With `OscillatorNode.prototype.start` instrumented: a rail
  move fires **1** note; a move clamped at the end of the rail fires **0**; a face-button press fires
  **1**; muting is itself silent and a move while muted fires **0**; unmuting fires **1**. Opening
  fires 1 and creates exactly **1** `AudioContext`; the boot handover fires **3** (the rising chime);
  closing fires 1. On a freshly loaded page, before any gesture: **0 contexts, 0 notes**.
- **The mute persists** — `localStorage.console` holds `{"theme":…,"muted":true}` while muted, and
  the `.sr-only` button reads "Mute the console" / "Unmute the console".
- **Reduced motion** (`matchMedia` overridden before load) — a tile's transition is
  `opacity 100ms linear` rather than the 280ms transform, hover and press still change state, and the
  sounds are unaffected: audio is not motion.
- **Mobile** — the turned handheld, Library and detail both reading, the selected tile at 1.12 with
  9.5px of headroom above it inside the `overflow: hidden` rail (nothing clipped in the mobile
  table), and the ♪ glyph toggling the mute by tap.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, `prettier --check .` — all clean. `/` still
  prerendered static.

### Known issues / open risks

- **`screenEmissiveIntensityLight: 1` is a look call**, dialled against the light stage on this
  monitor. It is a `?tune` knob, so it moves without a code change.
- **The timeline's entry-panel fade was not exercised by overflowing content** — no published entry
  has enough copy to scroll that panel. The detail view's was, on a real project, and both come from
  the same helper.
- **The window on this machine will not resize below ~501px wide**, so the mobile pass ran at
  501×845 rather than 390×844. That is still under the 640px breakpoint, so the MOBILE layout table
  and the quarter turn were both in force; the glass is simply larger than a real phone's. The same
  limitation Phase 3 recorded.
- **The sounds have not been heard on a real device.** Counting oscillator starts proves the wiring
  and the mute, not that the cues are pleasant. The frequencies and gains are one edit each in
  `CUES`.
- **The tick fires on every repeat while a direction is held**, 180ms apart. It is deliberately the
  quietest cue (gain 0.022) for that reason, but a long hold is a run of ticks.
- **The mute is only reachable while the console is open**, because the status bar is inside the
  firmware. The `.sr-only` button is always there; a sighted visitor with a closed console has
  nothing to mute yet, which is why this is recorded rather than fixed.
- **`readableAccent()` never has to darken the dark theme's accent.** With a bright green tuned in,
  the dark accent measures 11.11:1 — well past what it needs, and arguably louder than SPEC §9's red
  intended. A tuning-value question, not a code one.
- The `THREE.Clock` deprecation warning, the bundle budget, `frameloop="always"` while open, and
  Lighthouse: all still Phase 8.
- Everything still open from Phase 0 stays open: the logged-in Studio verification is Yash's to do.

### Phase 7a — A box that scrolls keeps its own gesture

Yash asked for swipe navigation on a phone and for the scrolling panels to scroll the way a finger
normally scrolls. The first half was already built (Phase 6's `useTouchRail`, verified again here);
the second half was the bug hiding behind it.

**A phone-sized panel overflows constantly.** Measured at 390×844 against the live dataset: **five of
the seven timeline entries** overflow their panel (209 against 167 CSS px, 210/167, 189/162,
168/157, 167/157), and every project's detail view does (503 against 283). Before this, a finger
dragged up inside one of those panels changed section instead of scrolling it — and inside the
detail view, which `useTouchRail` already refused to navigate from, it did nothing at all.

- **The gesture belongs to the innermost box that can use it.** A vertical drag that begins inside
  `[data-console-scroll]` scrolls that box and never navigates, which is what a nested scroller does
  everywhere else on the web. A drag that begins anywhere else still changes section, and a box with
  nothing hidden below its fold is not a scroller — so a swipe on a short timeline entry still moves
  between sections. No chaining at the end of the scroll: reaching the bottom of an entry and
  swiping once more does not jump to another screen, because overscroll is not a second gesture.
- **A sideways drag inside a scrolling box still moves the rail.** There is nothing to scroll along
  x, and it keeps the rail reachable from anywhere on the screen.
- **The scrolling is done here rather than left to the browser.** The panel is a rotated, scaled
  subtree of a `<Html transform>` — on a phone the console has rolled a quarter turn — and what a
  browser makes of a touch on a box turned through 90° is not something to find out on someone's
  phone. `scrollBox()` marks those boxes `touch-action: none` so there is exactly one thing moving
  them: the same handler, through the same quarter turn the swipe uses, so a scroll and a swipe can
  never disagree about which way is up.
- **Only on a phone.** `touch-action: none` is applied at the mobile breakpoint alone, because that
  is the only width `useTouchRail` runs at. A tablet is not turned and has no swipe gestures, so its
  finger scrolling is the ordinary axis-aligned case and stays the browser's. The wheel and the
  scrollbar are untouched everywhere — `touch-action` only speaks to touch.
- **The finger and the content move together.** The panel is authored at a fixed width and scaled
  onto the glass, so a screen delta is divided by that scale before it becomes a scroll delta
  (`panelScale()`); rolled a quarter turn, the box's local height runs along the screen's x, which is
  why the bounding rect's width is what gets measured there. On a phone the scale is near 1 by
  design — Phase 6a set `fwPanelWidth` to 320 for the ~315px glass — so this mostly reads as 1:1,
  and stays 1:1 if the panel is ever retuned.
- **`inConsoleFrame()` is now one function.** The quarter turn was inline in the swipe handler; the
  scroll needs the same rotation, and two copies of it would be two chances for one sign to flip.
  It still has to match `Console`'s roll.
- ponytail: **no fling.** The content tracks the finger and stops when it lifts. Momentum is a
  spring and a rAF loop away if it is missed on a real device.

#### Verified

Chrome DevTools MCP with a real device viewport (`390x844x3,mobile,touch`), against `pnpm dev` and
then against `pnpm build && pnpm start`. Console clean apart from the known `THREE.Clock` warning.

- **Section swipes still work**: Library → Timeline and back, which is what was asked for and what
  was already there.
- **An overflowing timeline entry scrolls instead of navigating** — `scrollTop` 0 → 42, which is
  exactly its overflow (209 − 167), with the section unchanged; the reverse drag returns it to 0.
- **The detail view scrolls** — one 160px drag moved it 0 → 158.7 of the 220 available, so the
  content tracked the finger at very nearly 1:1, with the section unchanged.
- **A sideways drag inside the same box still moves the rail** — "Summer Analyst" →
  "Unity Developer Intern", `scrollTop` unchanged.
- **A vertical drag that starts on the dots row still changes section** — Timeline → Library.
- **A panel with nothing to scroll still passes the swipe through** — on the entry that does not
  overflow, Timeline → Library.
- **Tablet (834×1112, touch)**: the same box reports `touch-action: auto`, so the browser still owns
  finger scrolling where the handler does not run.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, `prettier --check .` — all clean.

#### Known issues / open risks

- **Still synthetic.** The gestures are dispatched `PointerEvent`s with `pointerType: 'touch'` under
  device emulation, not a finger. The thresholds, the 1:1 feel and the absence of fling all want a
  real device — the same caveat Phase 6 recorded for the swipes themselves.
- **A long entry cannot be swiped out of.** With the panel filling the screen and scrolling, the way
  off it is the joystick, the arrow keys, the on-screen section arrow, or a swipe that starts on the
  axis above. That is the cost of giving the scroller the gesture, and it is what every nested
  scroller does.

---

## Phase 8 — Accessibility and fallbacks

SPEC §13 names Phase 8 "everything in §11 and §12. Lighthouse run. Bundle analysis". That is two
different jobs — one is making the site usable and findable, the other is measuring it — so it is
split: this section is §11.1–§11.6, **8a** is the SEO half of §11 (metadata, OG, JSON-LD, sitemap,
robots) and **8b** is §12 with the Lighthouse and bundle numbers.

Half of §11 was already standing: the `.sr-only` landmark, the ABXY focus rings, the live region,
the sr-only mute button, and full `prefers-reduced-motion` coverage. What was missing was a
`<noscript>`, any WebGL fallback, `role="application"`, a keyboard path to the theme toggle, focus
indicators for anything but the four face buttons, and half the content in the landmark.

### Versions installed

None. Every part of this is React, CSS and one class component.

### Decisions

- **The landmark and the detail view now read from one definition.** The crawlable copy had fallen
  behind the visible one — the screen showed role, year, engine, team, platforms, tech and the
  Portable Text description; the landmark showed a title, a blurb and some links. `projectMeta()`
  and `descriptionParagraphs()` moved into `content.ts` and both surfaces read them, so a field
  added to one appears in the other. That is the fix for the drift, not just for the gap.
- **Project tiles are buttons in the page, not in the firmware (SPEC §11.6).** The rail is
  `aria-hidden` DOM in 3D and nothing inside it may be focusable, so the button that names a project
  is the one in the landmark. Focusing it selects that tile on the rail; activating it opens the
  tile's detail view. The wiring is delegated from `document` — the same `focusin` listener the ABXY
  rings already used — so `app/page.tsx` stays a Server Component with no handlers of its own.
- **`data-social-slot` became `data-console-focus`**, because the close button and the theme cap now
  use it too. `focusedSlot` widened from `ButtonSlot` to `FocusTarget = ButtonSlot | 'close' |
'theme'`, and both caps render the torus `FaceButtons` already rendered. The close button names
  itself unconditionally rather than only while the console is open: focus is read at the moment it
  happens, and the visitor who opens the console _from that button_ would otherwise light nothing.
- **The theme toggle had no keyboard path at all.** It was `onClick` on a 3D group with no twin
  anywhere — the comment beside the mute button claimed close and theme buttons had existed since
  Phase 6, which was stale. They exist now: open/close, theme and mute, in one `ConsoleControls`
  block.
- **A hidden control is visible while it has focus.** `.sr-only:focus-visible` un-clips it as a chip
  at the top of the page, the skip-link pattern. The landmark's own contents needed one more rule:
  `.sr-only`'s `clip-path: inset(50%)` clips a `position: fixed` descendant where `overflow: hidden`
  does not — so `.sr-only:has(:focus-visible)` drops the clip path, while the 1px box and its
  overflow keep everything that is not focused hidden.
- **A notice is stamped with the selection it was raised against.** The theme and the mute change
  something a screen reader cannot see, so they announce themselves; storing `{text, at}` and
  rendering it only while `at` still matches means the next thing the rail says replaces it — no
  timer, and nothing stale left in the region. `useAnnouncement` also speaks the console opening,
  booting and closing now, which are state changes with nothing on screen to read.
- **`<noscript>` un-hides what is already there.** The landmark is the whole portfolio in real
  markup, so the fallback is one `<style>` that makes it visible, lets `body` scroll (it is
  `overflow: hidden` for the console's sake) and hides the stage. No second copy of the site to keep
  in step.
- **WebGL is an external store, not component state.** Whether 3D can run is a property of the
  machine: `webgl.tsx` probes once with a throwaway canvas — releasing the context again immediately
  — caches the answer, and serves it through `useSyncExternalStore`, which is also what keeps the
  server's markup and the first client render agreeing, since the server cannot probe. Three
  failures land on one path: the probe, a `webglcontextlost` caught in the capture phase (it does not
  bubble), and an error boundary around the scene, because R3F throws during render when it cannot
  make a renderer and no listener sees that.
- **The fallback is the same firmware, mounted as DOM.** `<Firmware>` has never known whether it is
  in 3D, so `FallbackFirmware` is a scale-to-fit wrapper and an `open()` on mount — every tile, dot,
  arrow and link inside it is already clickable, and the keyboard handlers were always on the DOM
  side. Phase 6a had removed the mobile DOM mount, so this is new code, but it is eleven lines of
  mounting rather than a second interface. It ships in its own chunk: a visitor whose browser runs
  WebGL never downloads it.
- **No close button in the fallback.** There is no object to close to, and closing would leave an
  empty page. The theme and mute buttons are simply on screen there instead of visually hidden.
- ponytail: **the fallback's scale is measured on resize, not per frame.** Both axes are measured and
  the smaller wins, capped at 1.5 — on a desktop the height binds at about 0.98, so the cap only ever
  applies on a phone, where the panel is authored at 320px and filling the width is what the mobile
  layout table was written for.

### Verified

Chrome DevTools MCP and the in-app browser against `pnpm dev`, then against `pnpm build && pnpm
start` on port 3100 with `localStorage.console` cleared first. The production run's
`list_console_messages` returned **exactly one message** — Phase 1's upstream `THREE.Clock`
deprecation. No errors.

- **The landmark carries the whole portfolio**: `h1` name, title, status line, About, the resume
  link, `Games / Projects` with both projects (title button, blurb, all spec rows, description,
  links), `Work` and `Education` with all seven entries (dates, location, summary, highlights,
  result, related projects), and `Links` with the four socials.
- **Focus drives the rail**: tabbing to `Aurora Game Engine` announced "Library, Aurora Game Engine"
  and switched the screen to the Library; tabbing on to `RayTracer` moved the rail to it. Activating
  one opens its detail view ("RayTracer, details").
- **Focus indicators, in the pixels**: the focused control computes to `position: fixed` with
  `outline-color: rgb(255, 77, 61)` and renders as a chip at the top of the page — screenshotted for
  the open/close button, the theme button and a project button. The theme cap and the close cap each
  light a ring while their button has focus, and the ABXY rings still light after the attribute
  rename (checked on `GitHub (B)`).
- **Keyboard open**: `Tab` then `Enter` from a cold load opens the console and boots it —
  "Menu, Games / Projects" — with real key events through the DevTools MCP.
- **`<noscript>`**: the block is in the served HTML, and applying its own CSS to the live page
  renders the portfolio as a plain scrolling document — name, title, section headings, projects with
  their spec rows and links, both timeline groups — on a dark ground.
- **The WebGL fallback, both ways in.** In a Chrome without a GPU the page rendered the DOM firmware
  and its control bar with no canvas at all. On this machine, dispatching `webglcontextlost` on the
  canvas removed the canvas and mounted the same firmware in its place with the rail's selection
  intact. Checked at 1440×900 and at 375×812.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, `prettier --check .` — all clean. `/` still
  prerendered static.

### Known issues / open risks

- **Two timeline entries are tagged `kind: "work"` in Sanity but are education** — `BTech` and
  `Class 12th`. The landmark groups them under **Work** and the axis draws them as filled work dots,
  because that is what the documents say. Content, not code (SPEC §0 rule 3): one field on each entry
  in the Studio.
- **The focus ring renders green, not red.** It uses `materials.accent`, the tuned chassis accent —
  the same ring the face buttons have had since Phase 3. SPEC §11.4 says red; the tuning value says
  green. A `?tune` question, not a code one.
- **`ConsoleControls` puts three buttons at the top of the tab order.** A visitor tabs through open,
  theme and mute before reaching the content. Deliberate — they are the console's controls and the
  console is the site — but it is the kind of thing a screen-reader user might disagree with.
- **The fallback has no close and no drag.** It is the firmware and nothing else: no chassis, no
  joystick, no ABXY caps. The social links are still in the landmark, so nothing is unreachable.
- **A shader-compile warning (`X4122`) appeared once in a dev run on this machine** — ANGLE reporting
  float precision inside three's own shader. It did not appear in the production run and is not ours
  to fix; recorded in case it returns during Phase 8b's Lighthouse pass.
- **Not verified with a real screen reader.** Every check here is of the markup, the roles and the
  live region's text, not of what NVDA or VoiceOver actually say. SPEC §15 wants the latter.
- The `THREE.Clock` deprecation, the bundle budget, `frameloop="always"` while open, and Lighthouse:
  all Phase 8b.

### Phase 8a — Search and sharing

SPEC §11.7 and §11.8. The page had a title and a description and nothing else: no canonical, no Open
Graph, no card, no structured data, no sitemap, no `robots.txt`. A portfolio nobody can find is a
portfolio nobody reads.

#### Decisions

- **The site's own origin is configuration, not content.** `app/site.ts` reads
  `NEXT_PUBLIC_SITE_URL`, falls back to Vercel's `VERCEL_PROJECT_PRODUCTION_URL`, then to
  `http://localhost:3000`. Yash owns what the site says; he does not own what it is deployed at, so
  this is the one string that lives in the environment (SPEC §14) and Phase 9 sets it in Vercel with
  no code change. It is deliberately not `required()` like the Sanity variables: a missing domain is
  a wrong `<link rel="canonical">`, not a broken page.
- **The sharing image is Sanity's if it exists, and generated if it does not.**
  `siteSettings.seo.ogImage` had been in the schema since Phase 0 and was never queried; it is now,
  with its dimensions. When it is empty `generateMetadata` leaves `openGraph.images` undefined, which
  is what lets Next fall through to `app/opengraph-image.tsx` — so the site always has a card, and a
  real screenshot replaces the drawn one the moment Yash publishes one. Twitter inherits the same
  image rather than naming a second.
- **The generated card draws the screen, not the console.** SPEC §11.7 asks for an OG image "showing
  the open console", and `ImageResponse` cannot render one: Satori lays out flat elements with no
  canvas and no three.js. So the card is the firmware's own screen — the status bar, `YP-OS 1.0`, the
  accent ▶ and the dark palette — with the name and title on it. Refusing to draw anything would have
  been worse than drawing the half that is drawable.
- ponytail: **no font in the card.** Loading Archivo would mean fetching a woff at request time for a
  picture that never appears on the site itself. The card leans on the palette and the layout
  instead.
- **`alt` describes the picture rather than naming anyone.** It is a module export Next reads without
  running the component, so it cannot read Sanity — and a hard-coded "Yash Punia — Gameplay
  Programmer" would be content in code (SPEC §15). The name is in the card, the title and the
  description beside it.
- **`knowsAbout` is derived, not authored.** It is the union of every engine and every technology
  across the published projects, so a project added in the Studio widens it and nothing goes stale —
  no ninth field for a non-technical editor to maintain. `Custom` and `Other` are filtered out: they
  are the engine list's escape hatches, and "knows about Custom" says nothing to a search engine.
  `sameAs` is the four social URLs, sorted so the markup does not churn when the Studio reorders
  them.
- **The sitemap has one entry, because the site has one page.** Every project and every timeline
  entry lives inside the console with no URL of its own. Listing routes that do not exist is how a
  sitemap starts costing crawl budget instead of saving it.
- **The Studio says `noindex` twice.** `robots.ts` disallows `/studio`, and the route's own metadata
  sets `robots: {index: false, follow: false}` — a `Disallow` is a request, and the meta tag is what a
  crawler that ignores one still has to honour.

#### Verified

Against `pnpm build && pnpm start` on port 3100.

- **`<head>`**: `<link rel="canonical">`, `og:title`, `og:description`, `og:url`, `og:site_name`,
  `og:locale`, `og:type=profile`, `og:image` with `type`, `width=1200`, `height=630` and `alt`, and
  `twitter:card=summary_large_image` with the same title, description and image.
- **JSON-LD**, as served:
  `{"@context":"https://schema.org","@type":"Person","name":"Yash Punia","jobTitle":"Game Programmer","description":"Developing games and learning novel methods to improve my skills.","url":"…","sameAs":["https://github.com/Yash-Punia","https://www.linkedin.com/in/yash-punia/","https://x.com/zeldariomon","https://yashpunia.itch.io/"],"knowsAbout":["C++","OpenGL","SDL","Raylib"]}`
- **The card renders**: `/opengraph-image` returns `200 image/png`, 33.9KB, 1200×630 — status bar,
  the name at 92px behind the accent ▶, the job title under it, the accent strip along the bottom.
  With no `statusLine` published that line collapses, which is the empty-state behaviour SPEC §3.2
  asks for.
- **`robots.txt`**: `Allow: /`, `Disallow: /studio`, and the sitemap URL. **`sitemap.xml`**: one
  `<loc>`, monthly, priority 1. **`/studio`** serves `<meta name="robots" content="noindex, nofollow">`.
- **`NEXT_PUBLIC_SITE_URL` propagates**: a build with it set to `https://yashpunia.example` moved the
  canonical, `og:url`, `og:image`, the `Sitemap:` line and the sitemap's `<loc>` to that origin. The
  committed build has it unset and falls back to localhost, as designed.
- **Lighthouse, mobile, against the production build: Accessibility 100, Best Practices 100, SEO
  100** — 52 audits passed, 0 failed. That run rendered the WebGL fallback, because the Chrome the
  DevTools MCP drives has no GPU; that is the harder surface to audit, since the canvas path has no
  DOM for Lighthouse to look at at all.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, `prettier --check .` — all clean. `/`,
  `/opengraph-image`, `/robots.txt` and `/sitemap.xml` all prerendered static.

#### Known issues / open risks

- **The desktop Lighthouse run fails with `NO_FCP`** — "the page did not paint any content… keep the
  browser window in the foreground". The mobile run of the same URL scores 100 across the board, and
  the message names the backgrounded window, so this reads as the automation rather than the site.
  Phase 8b needs a good desktop trace anyway and will settle it.
- **The Sanity sharing image path has never run against a real asset**, because no `ogImage` is
  published. The query, the dimensions and the fallthrough are verified; the picture is not.
- **`en_GB` is hard-coded** as the OG locale, as is `@type: Person`. Both are structural, not
  content — but they are assumptions, written down here so they can be argued with.
- **Nothing is submitted anywhere.** Search Console, the sitemap ping and the social cards' own
  validators are Phase 9, after there is a domain to give them.

### Phase 8b — Performance

SPEC §12. Most of the budget was already met by earlier phases — the scene is dynamically imported
behind a skeleton, `dpr` is capped at 2, three is imported by name and never as a namespace,
geometries are disposed, the environment is built in-scene rather than fetched from a CDN. What was
missing was the covers' placeholders, a bundle report, and any measurement at all.

#### Decisions

- **The covers keep their raw `<img>`, and gain what `next/image` was there for.** The Phase 4
  reasoning stands: these elements live inside a drei `<Html>` subtree and Sanity's CDN already
  handles resizing and format negotiation, so a second optimiser in front of the first buys an
  `images.remotePatterns` entry and a redeploy-scoped cache. What §12 actually asks for beyond that
  is the LQIP placeholder, an explicit intrinsic size and deferred loading below the fold, and all
  three are now there without the optimiser.
- **`cover.ts` is one definition for two views.** The rail and the detail view had grown separate
  copies of the same three `urlFor()` calls that differed only in their dimensions. `cover(project,
w, h)` returns the URL, the LQIP and the size; `placeholder(lqip)` returns the style that paints
  it.
- **The placeholder goes on the `<img>`, not on a wrapper.** An image's own background shows through
  exactly until its pixels arrive, which is the whole of what a blur-up is. No extra element, no
  state, nothing to unmount.
- **The first two tiles load eagerly and the rest are lazy.** SPEC §12 says `priority` on the first
  two; a plain `<img>` spells that `loading="eager"`. Only the first two are on the glass when the
  Library opens — the rest sit off the right-hand edge waiting for a move that may never come. The
  detail view's cover is never deferred: it exists only because someone asked for it.
- **`@next/bundle-analyzer` was installed and then removed.** It prints "not compatible with
  Turbopack builds, no report will be generated" — Next 16 builds with Turbopack, so the package is
  dead weight here. `pnpm analyze` runs Next's own `next experimental-analyze -o` instead: no
  dependency, no `next.config.ts` wrapper, no `cross-env`.
- **`frameloop` is left as it is, and the reason is recorded rather than guessed.** SPEC §12 asks for
  `"demand"` when the console is closed and the idle animation is off, which is exactly what
  `Scene.tsx` does — the drift runs the whole time the console is closed, so reduced motion is the
  only state with nothing to animate. The open-and-settled case still renders every frame, and
  whether that costs anything on a phone could not be measured here (below). Changing it would mean
  threading `invalidate()` through four springs and a damp on the strength of a guess.

#### Measured

Bundle, from the chunks the page actually requests on load, gzipped at level 9:

| Chunk          | gzip    | raw      | Contents                               |
| -------------- | ------- | -------- | -------------------------------------- |
| 15htmib1fr-z4  | 284.4KB | 1026.0KB | three, drei, react-three-fiber, spring |
| 11uaf2x43ai-q  | 63.0KB  | 199.8KB  | react-dom                              |
| 3if0scefvkq1u  | 46.1KB  | 174.4KB  | Next client runtime                    |
| 2kr-d6kuquula  | 9.6KB   | 30.0KB   | @sanity/image-url and app code         |
| 091awwb1-\_o1g | 8.8KB   | 23.5KB   | zustand and `ConsoleStage`             |

- **Initial JS excluding the three.js chunk: 149.9KB gzipped, against SPEC §12's 200KB budget.**
  Total with three: 434.3KB. The five above plus five smaller chunks are the whole of it.
- **CLS: 0.00**, twice — once at 1440×900 unthrottled, once at 390×844 under Slow 4G and 4× CPU.
  Against a budget of 0.05.
- **Lighthouse (mobile, production build): Accessibility 100, Best Practices 100, SEO 100**, 52
  audits passed and 0 failed (the run recorded in Phase 8a).
- **The covers, in the DOM**: rail tiles at `width=720 height=405` with `loading="eager"` on the
  first two, `decoding="async"` and a base64 LQIP painted underneath; the detail view's at
  `width=1100 height=440` with its own placeholder and no `loading` attribute. The LQIP costs about
  1.1KB of base64 per project in the document, before gzip.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, `prettier --check .` — all clean.

#### Known issues / open risks

- **LCP was not measured, and no Performance score was taken.** Neither browser available on this
  machine could produce one: the automation's browser pane never paints while it is hidden — no
  paint entries, no `requestAnimationFrame`, so the canvas never even mounts its `<Html>` — and in
  the other Chrome the performance trace reports CLS but no LCP, while a desktop Lighthouse run
  fails outright with `NO_FCP` ("keep the browser window in the foreground"). Both are the harness,
  not the site: the same URL scores 100 on three categories in a mobile Lighthouse run. **SPEC §12's
  LCP < 2.0s and §15's Performance ≥ 90 are therefore still unverified** and should be taken against
  the Vercel preview in Phase 9, where a real browser loads a real URL.
- **`frameloop="always"` while the console is open** still renders every frame with nothing moving.
  Unmeasured for the reason above; it is the one budget line where the code knowingly does more than
  it might need to.
- **`THREE.Clock` is closed as upstream.** three 0.185.1 deprecated `Clock` in r183 and
  `@react-three/fiber` 9.7.0 — the latest published version, checked against the registry — still
  constructs one. It cannot be fixed without patching a dependency, and it is a `console.warn`, so
  Lighthouse's Best Practices score is unaffected (it scores 100 with the warning present). SPEC §15
  wants zero console warnings; this is the one, and it is not ours. Revisit when R3F moves to
  `Timer`.
- **The bundle numbers are from this build, not a budget check in CI.** Nothing fails if the next
  dependency pushes 149.9KB past 200KB. `pnpm analyze` is the way to look, and looking is manual.
