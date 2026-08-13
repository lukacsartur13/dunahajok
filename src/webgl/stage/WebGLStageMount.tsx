"use client";

/**
 * Where the 3D layer enters the application — and, more importantly, when.
 *
 * The site is DOM-first, and that has to be true of the bytes as well as the
 * markup. three plus react-three-fiber are around 175 kB gzipped; putting them
 * in the critical path would mean the hero's typography, its photograph and
 * its fonts all competing with a renderer for bandwidth, on a page whose first
 * screen is already complete without one.
 *
 * So two deferrals, both deliberate:
 *
 *   • CODE. `next/dynamic` with `ssr: false` splits the entire stage — the
 *     renderer, the scenes, the shaders — into its own chunk. A visitor whose
 *     browser has no WebGL2, or who never reaches a section with a scene in
 *     it, downloads none of it.
 *   • TIME. The chunk is not even requested until the preloader has released
 *     the page. Phase One's loader waits on exactly the assets the first
 *     screen needs; adding a renderer to that queue would make an honest
 *     progress bar dishonest, and would delay the photograph in order to
 *     arrive sooner at the thing that replaces the photograph.
 *
 * This is the arrangement the SceneSlot architecture was designed around: the
 * static art direction is the design, the live scene is an upgrade, and the
 * upgrade crossfades in when it is genuinely ready.
 */

import dynamic from "next/dynamic";
import { useIntroReady } from "@/lib/intro";

const WebGLStage = dynamic(
  () => import("./WebGLStage").then((m) => m.WebGLStage),
  { ssr: false },
);

export function WebGLStageMount() {
  const ready = useIntroReady();
  if (!ready) return null;
  return <WebGLStage />;
}
