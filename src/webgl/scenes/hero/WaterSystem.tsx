"use client";

/**
 * WATER SYSTEM — geometry and material assembly.
 *
 * The physics is in `glsl/water.ts` and `glsl/wake.ts`; this file decides what
 * mesh they run on and which chunks are compiled together.
 *
 * THE DISC. A radial grid, not a plane. Rings are placed by `t^falloff`, so
 * ring spacing is centimetres where the vessel is and hundreds of metres at
 * the horizon — which is what the perspective is doing anyway. A uniform grid
 * dense enough for the foreground would spend most of its vertices a kilometre
 * away, and one coarse enough to afford that has a visibly polygonal near edge.
 *
 * The disc is also open-centred and closed-edged: the innermost ring is 30 cm
 * across (the camera never gets closer to the water than a metre) and the
 * outermost is 1.5 km, at which distance the shader has already resolved the
 * surface into the sky it is reflecting, so there is no rim.
 *
 * GEOMETRY BARELY MATTERS HERE, and that is deliberate. Normals are analytic —
 * computed per fragment from the same closed form that displaces the vertices —
 * so the mesh only ever carries the *silhouette* of a 4.5 cm swell. That is why
 * the low tier can switch vertex displacement off entirely and lose almost
 * nothing: the shading is identical, only the horizon line stops undulating.
 */

import { useEffect, useMemo } from "react";
import { BufferAttribute, BufferGeometry, DoubleSide, ShaderMaterial } from "three";
import { ATMOSPHERE_GLSL, NOISE_GLSL } from "@/webgl/glsl/atmosphere";
import { RAKE_GLSL } from "@/webgl/glsl/rake";
import { WAKE_GLSL } from "@/webgl/glsl/wake";
import { WATER_FRAGMENT, WATER_GLSL, WATER_VERTEX } from "@/webgl/glsl/water";
import type { QualityProfile } from "@/webgl/stage/quality";
import { WATER } from "./heroConfig";
import { pick, type HeroUniforms } from "./heroUniforms";

/**
 * A radial disc in the XZ plane, centred on the origin.
 *
 * Positions are stored as local offsets; the vertex shader adds `uCenter`, so
 * the whole field can be re-centred without touching a buffer. Wave phase is
 * computed from the resulting world position, so re-centring never makes the
 * water swim.
 */
function radialDisc(rings: number, segments: number, radius: number, falloff: number) {
  const geometry = new BufferGeometry();
  const vertexCount = (rings + 1) * (segments + 1);
  const positions = new Float32Array(vertexCount * 3);

  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    const dist = 0.3 + (radius - 0.3) * Math.pow(t, falloff);
    for (let s = 0; s <= segments; s++) {
      const angle = (s / segments) * Math.PI * 2;
      const i = (r * (segments + 1) + s) * 3;
      positions[i] = Math.cos(angle) * dist;
      positions[i + 1] = 0;
      positions[i + 2] = Math.sin(angle) * dist;
    }
  }

  const indices = new Uint32Array(rings * segments * 6);
  let n = 0;
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * (segments + 1) + s;
      const b = a + segments + 1;
      indices[n++] = a;
      indices[n++] = b;
      indices[n++] = a + 1;
      indices[n++] = b;
      indices[n++] = b + 1;
      indices[n++] = a + 1;
    }
  }

  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  return geometry;
}

/** Chunks the vertex stage needs. The wake displaces vertices, so it is here. */
const VERTEX_CHUNKS = [NOISE_GLSL, ATMOSPHERE_GLSL, WAKE_GLSL, WATER_GLSL];
/** The fragment stage additionally owns the rake mask and the shading. */
const FRAGMENT_CHUNKS = [NOISE_GLSL, ATMOSPHERE_GLSL, RAKE_GLSL, WAKE_GLSL, WATER_GLSL];

const WATER_UNIFORM_KEYS = [
  "uTime",
  "uZenith",
  "uHorizon",
  "uKeyColor",
  "uKeyDir",
  "uBankColor",
  "uDeepColor",
  "uScatterColor",
  "uRake",
  "uCenter",
  "uWaveAmp",
  "uDrift",
  "uDetail",
  "uWakeOrigin",
  "uWakeAxis",
  "uWakeLength",
  "uWakeSpeed",
  "uWakeLift",
  "uLineify",
  "uLinePixelScale",
  "uFoamColor",
  "uLineColor",
  "uHullCentre",
  "uHullHalf",
  "uHullShade",
] as const;

interface WaterSystemProps {
  uniforms: HeroUniforms;
  quality: QualityProfile;
}

export function WaterSystem({ uniforms, quality }: WaterSystemProps) {
  const geometry = useMemo(
    () => radialDisc(quality.rings, quality.segments, WATER.radius, WATER.falloff),
    [quality.rings, quality.segments],
  );

  const material = useMemo(() => {
    const mat = new ShaderMaterial({
      vertexShader: VERTEX_CHUNKS.join("\n") + WATER_VERTEX,
      fragmentShader: FRAGMENT_CHUNKS.join("\n") + WATER_FRAGMENT,
      uniforms: {
        ...pick(uniforms, WATER_UNIFORM_KEYS),
        // The water's own alpha is the scene fade: there is nothing behind it
        // but the backdrop, which fades with the same number.
        uOpacity: uniforms.uFade,
      },
      transparent: true,
      depthWrite: true,
      // The camera is barely above the surface, so back faces are visible
      // wherever a crest rises past the eye line.
      side: DoubleSide,
    });
    if (quality.vertexWaves) mat.defines = { VERTEX_WAVES: "" };
    return mat;
  }, [uniforms, quality.vertexWaves]);

  // Disposal is explicit rather than left to react-three-fiber's automatic
  // pass, because both objects are memoised on the quality tier — which
  // changes when a resize crosses a breakpoint, not only on unmount. Without
  // this, every rotation of a tablet would leak a 1.5 km disc.
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  // Frustum culling is off because the disc is centred on the origin with a
  // 1.5 km radius while the camera sits inside it: the bounding sphere test
  // can only ever return "visible", so it is pure overhead.
  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={0} />;
}
