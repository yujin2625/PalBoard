// GitHub Pages serves the app under /<repo>/, so raw /public asset URLs need
// the base path prepended. Next's basePath auto-prefixes routes and <Link>,
// but NOT next/image src when images are `unoptimized` (our static export) —
// so any hardcoded /public path passed as an image src must go through here.
// Empty base path (Electron/dev/root deploys) leaves paths untouched.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix a root-absolute /public asset path with the build's base path. */
export function assetPath(path: string): string {
  return `${BASE}${path}`;
}
