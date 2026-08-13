/**
 * The river surface.
 *
 * Not an ocean. The Danube at Győr on a still evening is a *large, slow,
 * architectural* body of water: long, very low swell with almost no steepness,
 * a fine chop riding on it that exists mainly to catch light, and a slow
 * downstream drift that moves the whole field sideways. Six sine trains carry
 * all of that, at real dispersion speeds — c = √(gλ/2π) — so the long swell
 * genuinely outruns the chop and the surface never beats in a visible cycle.
 *
 * Every wavelength is chosen against the vessel: the longest train is 9.5 m,
 * a little longer than the 6.1 m hull, and the largest amplitude is 4.5 cm.
 * Get this wrong and a perfectly good boat instantly reads as a bath toy.
 *
 * Normals are analytic (`slope` accumulates ∂h/∂x, ∂h/∂z alongside the height)
 * because the surface has to be shaded per fragment while being displaced per
 * vertex, and the two must agree. The high-frequency trains are attenuated by
 * distance — an unattenuated 0.4 m ripple a hundred metres out is pure aliasing
 * and it is what makes cheap water look like tinfoil.
 */

export const WATER_GLSL = /* glsl */ `
uniform float uWaveAmp;    // master amplitude, 0 = glass
uniform float uDrift;      // downstream advection, metres

struct SwellTrain {
  vec2  dir;
  float wavelength;
  float amp;
  float speed;   // √(gλ/2π)
};

/**
 * "att" is the distance attenuation applied to the three detail trains only:
 * the swell keeps its full amplitude to the horizon, the ripple does not.
 * Returns height; accumulates slope.
 */
float dunaSwell(vec2 p, float t, float att, inout vec2 slope) {
  p += vec2(uDrift, uDrift * 0.22);

  SwellTrain trains[6];
  trains[0] = SwellTrain(vec2( 0.998,  0.060), 9.50, 0.0450, 3.85);
  trains[1] = SwellTrain(vec2( 0.860, -0.510), 5.20, 0.0290, 2.85);
  trains[2] = SwellTrain(vec2( 0.620,  0.784), 2.90, 0.0165, 2.13);
  trains[3] = SwellTrain(vec2( 0.940, -0.341), 1.35, 0.0082, 1.45);
  trains[4] = SwellTrain(vec2( 0.350,  0.937), 0.72, 0.0040, 1.06);
  trains[5] = SwellTrain(vec2(-0.707,  0.707), 0.41, 0.0021, 0.80);

  float h = 0.0;
  for (int i = 0; i < 6; i++) {
    float fade = i < 3 ? 1.0 : att;
    if (fade < 0.004) continue;

    float k = 6.2831853 / trains[i].wavelength;
    float phase = dot(trains[i].dir, p) * k - t * trains[i].speed * k;
    float a = trains[i].amp * uWaveAmp * fade;

    h += a * sin(phase);
    slope += trains[i].dir * (a * k * cos(phase));
  }
  return h;
}
`;

export const WATER_VERTEX = /* glsl */ `
uniform vec2  uCenter;
uniform float uTime;
uniform float uDetail;

varying vec3 vWorld;

void main() {
  vec2 world = position.xz + uCenter;
  float h = 0.0;

#ifdef VERTEX_WAVES
  vec2 slope = vec2(0.0);
  // The vertex pass only carries the silhouette, so the detail trains are
  // switched off here (att = 0) — the disc's rings are metres apart at the
  // distances that matter and would alias them into noise. The fragment pass
  // puts them back into the normal, where they belong.
  h = dunaSwell(world, uTime, 0.0, slope);
  WakeSample wk = dunaWake(world, uTime, 0.0);
  h += wk.height;
#endif

  vWorld = vec3(world.x, h, world.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}
`;

export const WATER_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uDetail;
uniform float uOpacity;

// The hull's footprint on the water: centre in world XZ, and half-extents
// along and across the vessel axis. A boat this dark sitting on water this
// dark still occludes the sky it would otherwise be reflecting, and without
// that patch of shadow underneath it the vessel never quite lands.
uniform vec2  uHullCentre;
uniform vec2  uHullHalf;
uniform float uHullShade;

varying vec3 vWorld;

void main() {
  vec3 toCam = cameraPosition - vWorld;
  float dist = length(toCam);
  vec3 V = toCam / dist;

  // Two falloffs. "att" kills the ripple trains before they alias; "flatten"
  // eases the whole normal towards vertical much further out, so the far field
  // resolves into a calm sheet rather than a field of sparkle.
  //
  // The attenuation is deliberately gentler than the aliasing limit alone
  // would ask for. From a metre above the surface almost the entire frame is
  // *far* water, so an aggressive cutoff leaves a smooth Fresnel ramp with no
  // surface in it at all — which is how calm water ends up looking like a
  // gradient with a boat on it. Texture is kept out to a hundred metres and
  // "flatten" is left to take the normal down from there.
  float att = 1.0 / (1.0 + dist * dist * 0.00055);
  float flatten = 1.0 / (1.0 + dist * 0.0075);

  vec2 slope = vec2(0.0);
  float h = dunaSwell(vWorld.xz, uTime, att, slope);

  WakeSample wk = dunaWake(vWorld.xz, uTime, uDetail);
  slope += wk.slope;
  h += wk.height;

  vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));
  N = normalize(mix(vec3(0.0, 1.0, 0.0), N, flatten));

  // Fresnel, from water's real 0.02 reflectance at normal incidence up to a
  // full mirror at grazing. At a 1.2 m eye height almost the whole surface is
  // grazing, which is exactly why calm river water reads as dark sky.
  float f = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 5.0);
  float fresnel = mix(0.021, 1.0, f);

  vec3 R = reflect(-V, N);
  vec3 reflected = dunaSky(R);

  // What comes back up out of the river: near-black, lifted slightly on the
  // wave faces that are turned towards the light.
  float upwell = clamp(dot(N, V), 0.0, 1.0);
  vec3 body = mix(uDeepColor, uScatterColor, upwell * 0.55 + clamp(h * 3.4, 0.0, 0.35));

  vec3 col = mix(body, reflected, fresnel);

  // One tight specular lobe. Broad enough to survive the flattening far out,
  // tight enough that it never becomes a highlight field.
  float spec = pow(max(dot(R, uKeyDir), 0.0), 340.0);
  col += uKeyColor * spec * 0.75 * flatten;

  // The hull's own shadow, in the vessel's frame rather than the world's, so
  // it stays under the boat as the boat travels. Elliptical and soft-edged:
  // this is ambient occlusion of the sky, not a hard cast shadow.
  vec2  hrel  = vWorld.xz - uHullCentre;
  vec2  hside = vec2(-uWakeAxis.y, uWakeAxis.x);
  float hu    = dot(hrel, uWakeAxis) / max(uHullHalf.x, 0.01);
  float hv    = dot(hrel, hside)     / max(uHullHalf.y, 0.01);
  col *= 1.0 - exp(-(hu * hu + hv * hv) * 1.35) * uHullShade;

  // Foam sits on top of everything, and fades with distance rather than
  // dissolving into single bright pixels.
  float foam = clamp(wk.foam, 0.0, 1.0) * (0.35 + 0.65 * flatten);
  col = mix(col, uFoamColor, foam * 0.82);

  // The horizon. The surface resolves into the sky it is reflecting, so there
  // is no seam where the disc ends.
  float far = smoothstep(260.0, 1500.0, dist);
  col = mix(col, dunaSky(normalize(vec3(-V.x, 0.012, -V.z))), far);

  // The handoff: the wake becomes the site's graphic line.
  col = mix(col, uLineColor, wk.line * uLineify * 0.9 * (1.0 - far));

  gl_FragColor = vec4(col, uOpacity * dunaRakeMask());
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
