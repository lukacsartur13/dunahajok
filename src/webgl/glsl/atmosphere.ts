/**
 * The atmosphere the whole scene shares.
 *
 * One function returns the colour of the sky in any direction, and everything
 * else asks it: the backdrop asks along the view ray, the water asks along the
 * reflected ray, the vessel asks along its own view ray to work out how much
 * haze sits between it and the camera. That is what stops a WebGL layer from
 * looking like a separate render pasted over a photograph — the reflection in
 * the water and the light on the hull are provably the same sky.
 *
 * The look is an overcast, late-day river: a very dark zenith that resolves to
 * exactly the site's `--depth` so the canvas and the DOM ground are
 * indistinguishable, a slightly lifted, faintly green band at the horizon, and
 * one broad soft key low in the west. No sun disc, no sci-fi gradient.
 */

export const ATMOSPHERE_GLSL = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uKeyColor;
uniform vec3 uKeyDir;

// The body of the river. Declared with the sky rather than with the water,
// because the vessel plate needs them too: a hull sinking into the surface and
// its own reflection are both tinted by the water they are sitting in, and all
// three materials must be reading the same two colours to agree.
uniform vec3 uDeepColor;
uniform vec3 uScatterColor;

// The far shore. See dunaSky.
uniform vec3 uBankColor;

vec3 dunaSky(vec3 dir) {
  float h = dir.y;

  // Overcast closes into the zenith almost immediately: two degrees above the
  // horizon the sky is already the site's --depth.
  //
  // That number is set by the composition, not by meteorology. The band is a
  // letterbox and the camera is a metre above the water, so the sky inside the
  // frame is barely six degrees tall — the whole of it. Let the lift spread
  // across that and the band's upper half is a wash several stops brighter
  // than the hero section it sits inside, and the join between canvas and DOM
  // becomes a visible shelf. Closed up this tightly, the sky in frame *is* the
  // page's background, and all that remains of the lift is a luminous slit
  // standing on the far bank — which is what a river at dusk actually looks
  // like, and which reads as one horizon rather than two.
  float t = clamp(h * 26.0, 0.0, 1.0);
  vec3 sky = mix(uHorizon, uZenith, pow(t, 0.55));

  // THE FAR BANK.
  //
  // The Danube at Győr is a river, not an ocean: something always stands on
  // the other side of it. A dark strip a degree and a half high is the whole
  // difference between water with a shore and a gradient that happens to be
  // green. It also does most of the work in the surface itself — at one metre
  // of eye height almost every reflected ray leaves at a grazing angle, and a
  // grazing ray lands here rather than in the sky.
  float bank = 1.0 - smoothstep(0.0, 0.013, h);
  sky = mix(sky, uBankColor, bank * 0.92);

  // Rays that dip below the horizon — a steep reflection off a wave face —
  // see the near shore instead. Darker still, and with no lift at all.
  float below = clamp(-h * 9.0, 0.0, 1.0);
  sky = mix(sky, uBankColor * 0.5, below);

  // One break in the cloud. Two lobes: a tight core the water can throw a
  // specular path off, and a wider one that lifts the quadrant around it.
  // Held above the bank, because a gap in cloud is in the sky and not in the
  // treeline, and kept narrow — a soft patch of light this large in a six
  // degree frame stops being weather and becomes a vignette.
  float g = max(dot(dir, uKeyDir), 0.0);
  sky += uKeyColor * (pow(g, 34.0) * 0.5 + pow(g, 11.0) * 0.045) * smoothstep(0.0, 0.03, h);

  return sky;
}
`;

/**
 * Cheap value noise. Used only to break up foam and to keep the water from
 * showing the regular beat of its own sine trains — never as the primary
 * surface, which is why two octaves are enough.
 */
export const NOISE_GLSL = /* glsl */ `
float dunaHash(vec2 p) {
  p = fract(p * vec2(233.34, 851.73));
  p += dot(p, p + 23.45);
  return fract(p.x * p.y);
}

float dunaNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dunaHash(i), dunaHash(i + vec2(1.0, 0.0)), u.x),
    mix(dunaHash(i + vec2(0.0, 1.0)), dunaHash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float dunaFbm2(vec2 p) {
  return dunaNoise(p) * 0.62 + dunaNoise(p * 2.17 + 11.3) * 0.38;
}
`;

/**
 * The backdrop: the sky, drawn once, behind everything.
 *
 * An inverted sphere rather than a screen-space quad, because the water is
 * already asking `dunaSky` for a *direction* and this way both are reading the
 * same function through the same interpolation. It is drawn first with depth
 * testing off, so it costs one untextured fill of the slot's rectangle and
 * nothing else.
 *
 * The zenith resolves to the site's `--depth`, which is also the hero
 * section's own background colour. Above the horizon the WebGL band and the
 * DOM around it are therefore the same colour by construction, and the seam
 * between them cannot be found.
 */
export const BACKDROP_VERTEX = /* glsl */ `
varying vec3 vDir;

void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const BACKDROP_FRAGMENT = /* glsl */ `
uniform float uOpacity;

varying vec3 vDir;

void main() {
  gl_FragColor = vec4(dunaSky(normalize(vDir)), uOpacity * dunaRakeMask());
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
