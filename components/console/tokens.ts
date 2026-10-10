/**
 * The design's type stacks. Every colour, size and timing moved into the tune
 * (`components/console/tune.ts`), which `?tune` edits live.
 *
 * No three.js here — the screen's DOM reads these too.
 */
export const FONT = {
  ui: 'var(--font-schibsted), system-ui, sans-serif',
  display: 'var(--font-archivo), system-ui, sans-serif',
  mono: 'var(--font-jetbrains), ui-monospace, monospace',
} as const
