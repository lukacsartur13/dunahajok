/**
 * THE VESSEL PLATE — a photograph, composited rather than pasted.
 *
 * Until a production GLB of the Duna 6.1 exists, the vessel in the hero is the
 * approved studio profile, alpha-matted at the waterline by
 * `scripts/build-vessel-plate.mjs` and stood up in the scene at its true size:
 * 6.72 m long, 2.43 m above the water. It is a plate in the film sense — a
 * two-dimensional element living inside a three-dimensional environment — and
 * the whole job of these two shaders is to make it obey that environment.
 *
 * What separates a composite from a sticker is almost never the cut-out. It is
 * that the element shares the scene's *air* and the scene's *water*:
 *
 *   • ATMOSPHERE. The plate is mixed toward `dunaSky` along its own view ray,
 *     by the same exponential haze the water uses. At 20 m on an overcast
 *     river that is only a few percent — but it is the few percent that stops
 *     the hull reading as a cut-out floating in front of the frame.
 *   • WATERLINE. The bottom centimetres of the matte darken and dissolve into
 *     the surface, so the hull enters the water instead of resting on it.
 *   • REFLECTION. Mirrored below the waterline, torn horizontally by the same
 *     wave field the surface is displaced by, decaying fast with depth. This
 *     is the single element that makes the vessel read as *in* the river.
 *
 * The reflection deliberately does not depth-test. Geometrically it lies under
 * the water surface, so the surface would occlude it entirely; a real
 * reflection is not an object below the water but light arriving off the top
 * of it. Drawing it after the water, unoccluded, is the correct model as well
 * as the cheap one.
 */

export const PLATE_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const PLATE_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform float uFade;
uniform float uHaze;       // per-metre haze density
uniform float uExposure;
uniform float uWaterline;  // metres of hull that dissolve into the surface

varying vec2 vUv;
varying vec3 vWorld;

void main() {
  vec4 texel = texture2D(uMap, vUv);
  if (texel.a < 0.004) discard;

  vec3 col = dunaSrgbToLinear(texel.rgb) * uExposure;

  // Shared air. The same sky the water is reflecting sits between the hull
  // and the camera, in the same quantity, by the same law.
  vec3 toCam = cameraPosition - vWorld;
  float dist = length(toCam);
  float haze = 1.0 - exp(-dist * uHaze);
  col = mix(col, dunaSky(normalize(-toCam)), haze);

  // The hull enters the water rather than standing on it: the last few
  // centimetres darken toward the river and give up their alpha.
  float sink = smoothstep(uWaterline, 0.0, vWorld.y);
  col = mix(col, uDeepColor, sink * 0.55);
  float alpha = texel.a * mix(1.0, 0.0, smoothstep(uWaterline * 0.35, -0.02, vWorld.y));

  gl_FragColor = vec4(col, alpha * uFade * dunaRakeMask());
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * The mirrored plate.
 *
 * Geometry is the same quad with `scale.y = -1`, so `vUv.y` runs from 0 at the
 * waterline to 1 at the deepest point of the reflection — which is why every
 * falloff below is written against `vUv.y` directly.
 *
 * The tearing is two sine trains in `vUv.y`, offsetting the horizontal sample.
 * Their amplitude grows with depth (a reflection is steadier close to the
 * object that casts it) and with the vessel's speed, so the reflection breaks
 * up exactly as the wake starts to form. That coupling is free, and it is what
 * makes the still opening frame feel genuinely still.
 */
export const REFLECTION_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform float uFade;
uniform float uTime;
uniform float uStrength;
uniform float uBreakup;   // 0 glassy, 1 fully disturbed

varying vec2 vUv;
varying vec3 vWorld;

void main() {
  float depth = clamp(vUv.y, 0.0, 1.0);

  // Two incommensurate trains, so the tearing never shows a beat.
  float tear =
    sin(depth * 23.0 - uTime * 1.15) * 0.6 +
    sin(depth * 57.0 + uTime * 0.83) * 0.4;

  float amp = (0.004 + depth * 0.020) * (0.25 + 0.75 * uBreakup);
  vec2 uv = vec2(vUv.x + tear * amp, vUv.y + tear * amp * 0.35);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;

  vec4 texel = texture2D(uMap, uv);
  if (texel.a < 0.01) discard;

  vec3 col = dunaSrgbToLinear(texel.rgb);

  // A reflection off a dark river is not a copy: it is the object's luminance
  // carried by the water's own colour, at a fraction of the contrast.
  col = mix(uDeepColor, col, 0.58);

  // Decay. Fast, because a metre of chop destroys a reflection quickly, and
  // the hard cut at the waterline is softened so the two halves meet.
  float decay = exp(-depth * 3.1) * smoothstep(0.0, 0.05, depth);

  gl_FragColor = vec4(col, texel.a * decay * uStrength * uFade * dunaRakeMask());
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
