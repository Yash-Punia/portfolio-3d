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
