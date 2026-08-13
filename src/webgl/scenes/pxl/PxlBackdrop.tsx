"use client";

/**
 * The studio the PXL stands in.
 *
 * Two objects, and both of them exist to stop the product floating:
 *
 *   • an inverted sphere carrying the same field the environment map was baked
 *     from, so what the hull reflects and what is behind the hull are provably
 *     the same room — the thing that makes a configurator look composited
 *     rather than rendered is a background that disagrees with the reflections;
 *   • a soft contact shadow on the ground plane, which is the only cue that
 *     places a 5 m object in space at all once you take the water away.
 *
 * The shadow is a shader on a quad, not a shadow map. A real shadow pass would
 * mean a depth render of the whole vessel every frame for a soft ellipse under
 * a hull whose underside is never visible; the analytic version costs one
 * transparent quad, never aliases, and is stable when the camera moves.
 */

import { useEffect, useMemo } from "react";
import { BackSide, Color, DoubleSide, PlaneGeometry, ShaderMaterial, SphereGeometry } from "three";
import type { QualityProfile } from "@/webgl/stage/quality";
import { PXL_MODEL } from "./pxlModel";
import { PXL_STUDIO } from "./pxlLighting";

const BACKDROP_RADIUS = 60;

const BACKDROP_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Deliberately *not* the full lighting shader.
 *
 * The environment map carries the key and rim lobes because the hull has to
 * reflect them. The visible backdrop carries only the gradient, because a
 * viewer should see a room, not the lights in it — a studio photograph shows
 * the sweep, never the softboxes.
 */
const BACKDROP_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform vec3 uSky;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform float uLift;

void main() {
  vec3 d = normalize(vDir);
  vec3 colour = mix(uGround, uHorizon, smoothstep(-1.0, -0.04, d.y));
  colour = mix(colour, uSky, smoothstep(-0.20, 0.30, d.y));
  // A very slight vignette toward the zenith keeps the top of the frame from
  // reading as a flat fill behind a boat that is itself full of gradient.
  colour *= 1.0 - 0.16 * smoothstep(0.25, 1.0, d.y);
  // §17/§55: the ROOM answers the hull, and only the room. See the note on
  // uLift in PxlProductScene — this is a bounded gain on the backdrop, applied
  // after the gradient so the sweep keeps its shape, and it is deliberately not
  // applied to the environment map: what lights the boat is identical for all
  // six finishes, so a comparison between two of them stays honest.
  colour *= 1.0 + uLift;
  gl_FragColor = vec4(colour, 1.0);
  // The uniforms above are THREE.Colors, which colour management has already
  // converted from sRGB into the renderer's linear working space. A raw
  // ShaderMaterial does not get the output transform for free the way a
  // built-in material does, so without this the linear value is written
  // straight into an sRGB framebuffer and every studio colour renders about
  // two stops too dark.
  #include <colorspace_fragment>
}
`;

const SHADOW_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * An elliptical falloff sized to the hull's own footprint, darkest under the
 * keel and opening outboard — the shape a hull's occlusion actually has,
 * rather than the round blob a generic contact shadow gives every object.
 */
const SHADOW_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uColor;
uniform float uOpacity;

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  // Squeeze across the beam so the shadow is a hull, not a circle.
  float r = length(vec2(p.x, p.y * 1.55));
  float core = 1.0 - smoothstep(0.0, 0.62, r);
  float spread = 1.0 - smoothstep(0.0, 1.0, r);
  float a = (core * 0.72 + spread * 0.28) * uOpacity;
  if (a < 0.002) discard;
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}
`;

interface PxlBackdropProps {
  quality: QualityProfile;
  /**
   * Bounded gain on the backdrop, driven by the selected hull's luminance.
   *
   * Owned by the scene rather than by this component because the scene is what
   * watches the configuration; passing the uniform object in means the value
   * can be eased inside the frame callback without this component re-rendering
   * or re-creating a material. Omitted by callers that do not adapt — the
   * development bench, and anything mounting the backdrop on its own.
   */
  lift?: { value: number };
}

export function PxlBackdrop({ quality, lift }: PxlBackdropProps) {
  const backdrop = useMemo(() => {
    const geometry = new SphereGeometry(
      BACKDROP_RADIUS,
      quality.tier === "low" ? 24 : 40,
      quality.tier === "low" ? 16 : 26,
    );
    const material = new ShaderMaterial({
      vertexShader: BACKDROP_VERTEX,
      fragmentShader: BACKDROP_FRAGMENT,
      side: BackSide,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uSky: { value: PXL_STUDIO.sky.clone() },
        uHorizon: { value: PXL_STUDIO.horizon.clone() },
        uGround: { value: PXL_STUDIO.ground.clone() },
        uLift: lift ?? { value: 0 },
      },
    });
    return { geometry, material };
    // `lift` is a stable uniform object owned by the scene, not a value: it is
    // read here once to be shared, and re-creating the material when the number
    // inside it changes is precisely what must not happen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality.tier]);

  const shadow = useMemo(() => {
    // Generous relative to the hull so the falloff has room to resolve; the
    // shader, not the quad, decides where the shadow ends.
    const geometry = new PlaneGeometry(PXL_MODEL.loa * 1.55, PXL_MODEL.beam * 2.4);
    const material = new ShaderMaterial({
      vertexShader: SHADOW_VERTEX,
      fragmentShader: SHADOW_FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      uniforms: {
        uColor: { value: new Color("#05070a") },
        uOpacity: { value: 0.82 },
      },
    });
    return { geometry, material };
  }, []);

  useEffect(
    () => () => {
      backdrop.geometry.dispose();
      backdrop.material.dispose();
      shadow.geometry.dispose();
      shadow.material.dispose();
    },
    [backdrop, shadow],
  );

  return (
    <>
      <mesh
        geometry={backdrop.geometry}
        material={backdrop.material}
        frustumCulled={false}
        renderOrder={-10}
      />
      <mesh
        geometry={shadow.geometry}
        material={shadow.material}
        // Just under the model's own waterline plane, so the hull sits *on*
        // the shadow rather than intersecting it.
        position={[0, -PXL_MODEL.draft - 0.002, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={-5}
      />
    </>
  );
}
