/**
 * Where this build is mounted, and the assets Next will not prefix for you.
 *
 * On its own domain the site sits at `/` and this whole file is a no-op. On
 * GitHub Pages it sits at `/dunahajok/`, and that difference is not cosmetic:
 * every absolute path in the app has to gain the prefix or 404.
 *
 * NEXT DOES MOST OF IT. `next/link` and the framework's own script and CSS URLs
 * are rewritten from `basePath` automatically. What it does not rewrite is a
 * string handed to something that is not Next:
 *
 *   • `useGLTF("/models/PXL.glb")` — three's loader calls `fetch` directly;
 *   • `new Image().src = "/media/hero-danube.webp"` — the preloader's own
 *     warm-up, which is a raw DOM image rather than a component;
 *   • **`next/image` under `images.unoptimized`** — see below.
 *
 * ── NEXT/IMAGE IS NOT ON THE SAFE LIST, AND THAT COST A DEPLOY ─────────────
 *
 * This block used to name `next/image` among the things Next prefixes for you.
 * That is true only while the image optimiser is in play: normally the emitted
 * src is `/_next/image?url=…`, and it is the `/_next/…` part that carries the
 * prefix — not the `url` payload. A static export has no optimiser, so
 * `next.config.ts` sets `images.unoptimized` for the Pages build, and an
 * unoptimised `<Image>` emits the src **verbatim**.
 *
 * The result was that every photograph on the deployed site requested
 * `/media/…` instead of `/dunahajok/media/…` and 404'd — the whole site, all
 * twenty-nine images, while the HTML, the CSS, the fonts and the 300 kB GLB all
 * loaded correctly, because every one of those goes through a path Next does
 * prefix or through `asset()` here. It looked like a broken asset pipeline and
 * was a one-line-per-callsite URL bug.
 *
 * So: **every `<Image src>` in this app goes through `asset()`.** It is
 * idempotent-safe for the domain-root build, where `BASE_PATH` is empty and
 * this function is the identity.
 *
 * Both are silent failures under a sub-path: the model never resolves and the
 * scene sits on its fallback render forever, which looks exactly like a slow
 * network. Hence one helper, used at every such site, rather than a comment
 * asking people to remember.
 *
 * IMPORTS NOTHING. `pxlModel.ts` is one of its callers and is part of the pure
 * module set that `npm test` compiles and runs on plain node — see
 * `scripts/pxl/test-configurator.mjs`. There, `process.env` exists and the
 * variable does not, so the prefix is empty and the paths are the ones the
 * development server serves.
 */

/**
 * The prefix, inlined at build time by Next from `env` in `next.config.ts`.
 *
 * Read through a full `process.env.NEXT_PUBLIC_…` expression rather than
 * destructured, because Next's inlining is a literal text substitution on
 * exactly that form — pulling it into a variable first would leave a runtime
 * lookup that resolves to undefined in the browser.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Prefix an absolute, app-root-relative path.
 *
 * `asset("/models/PXL.glb")` → `/models/PXL.glb` on a domain root,
 * `/dunahajok/models/PXL.glb` under a sub-path.
 *
 * Anything already absolute (`http…`, `data:`, `blob:`) is returned untouched,
 * so a caller does not have to know which kind of URL it is holding.
 */
export function asset(path: string): string {
  if (!BASE_PATH) return path;
  if (/^[a-z]+:/i.test(path) || path.startsWith("//")) return path;
  return `${BASE_PATH}${path.startsWith("/") ? "" : "/"}${path}`;
}
