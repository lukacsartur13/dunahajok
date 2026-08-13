"use client";

/**
 * The sky behind everything, and the horizon the water resolves into.
 *
 * One inverted sphere, depth test off, drawn first. It never occludes anything
 * and nothing occludes it, so it costs exactly one fill of the slot rectangle.
 *
 * It is not decoration: the water's Fresnel reflection, the hull's atmospheric
 * haze and this backdrop all call the same `dunaSky`, from the same uniforms.
 * That is what makes the reflection in the river provably the sky above it.
 */

import { useEffect, useMemo } from "react";
import { BackSide, ShaderMaterial, SphereGeometry } from "three";
import { ATMOSPHERE_GLSL, BACKDROP_FRAGMENT, BACKDROP_VERTEX } from "@/webgl/glsl/atmosphere";
import { RAKE_GLSL } from "@/webgl/glsl/rake";
import { pick, type HeroUniforms } from "./heroUniforms";

/** Well inside the camera's far plane, well outside the water disc. */
const RADIUS = 3000;

const KEYS = [
  "uZenith",
  "uHorizon",
  "uKeyColor",
  "uKeyDir",
  "uBankColor",
  "uDeepColor",
  "uScatterColor",
  "uRake",
] as const;

export function Backdrop({ uniforms }: { uniforms: HeroUniforms }) {
  const geometry = useMemo(() => new SphereGeometry(RADIUS, 24, 16), []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: ATMOSPHERE_GLSL + BACKDROP_VERTEX,
        fragmentShader: ATMOSPHERE_GLSL + RAKE_GLSL + BACKDROP_FRAGMENT,
        uniforms: { ...pick(uniforms, KEYS), uOpacity: uniforms.uFade },
        side: BackSide,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        fog: false,
      }),
    [uniforms],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return (
    <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={-10} />
  );
}
