/**
 * The Studio manages its own full-screen chrome, so this layout deliberately
 * renders children raw — no site fonts, no page shell.
 */
export default function StudioLayout({children}: {children: React.ReactNode}) {
  return children
}
