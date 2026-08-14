"use client";

/**
 * PXL — product lighting.
 *
 * §30: premium automotive configurator, not a boat floating in a black void.
 *
 * The hero scene lights its vessel with the river's own sky, and that is right
 * there — the whole conceit is a boat on the Danube at dusk. A configurator is
 * a different job. Its light has to make *paint* legible across six colours
 * that span from near-white to near-black, and an atmospheric dusk sky cannot:
 * it flatters the sage and the navy, loses the black entirely and blows the
 * highlight off the white.
 *
 * So this builds a studio, procedurally, into an environment map:
 *
 *   • a bright *ring* at about 37° elevation, running the whole way round.
 *     This is the source that does the work, and its shape is not arbitrary: a
 *     hull's topsides are near-vertical surfaces with outboard normals, so
 *     their reflection vector points outward and slightly up — an overhead
 *     softbox reflects into the deck and misses the topsides entirely, which
 *     is the difference between a hull that has a highlight travelling along
 *     its sheer and a hull that is a flat colour fill. Making it a ring rather
 *     than a lamp is what lets the boat be turned through 360° and keep that
 *     highlight the whole way round;
 *   • a broad overhead wash, which is what the deck, the sole and the
 *     horizontal mouldings actually see;
 *   • two low, cool sources fore and aft, so the bow volume and the transom
 *     each keep a soft edge against the background rather than dissolving into
 *     it — this is what keeps the black hull from becoming a silhouette;
 *   • a warm floor bounce, which is what stops the underside of the topsides
 *     and the inside of the cockpit going dead.
 *
 * It is generated rather than loaded because an HDRI is a megabyte or two of
 * download for a lighting rig with three shapes in it, and because generating
 * it means the rig can respond to the configuration later — §31 asks for the
 * background and lighting to be capable of adapting to the hull colour, and
 * a procedural source is the only kind that can.
 */

import {
  BackSide,
  Color,
  Mesh,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  type Texture,
  type WebGLRenderer,
} from "three";

/**
 * Studio ground, sky and sources, sRGB. Neutral, so no hull colour is tinted.
 *
 * The backdrop values are dark and the source values are not, and the gap
 * between them is the whole rig: a low, even field to sit the boat against,
 * and bright lobes for it to reflect. Lifting the backdrop to match the
 * sources would flatten every hull colour toward the same mid grey; dropping
 * the sources to match the backdrop is the "black void" §30 rules out.
 */
export const PXL_STUDIO = {
  /** Behind and above: a cool, even field. */
  sky: new Color("#333c42"),
  /** At the horizon, where the backdrop meets the ground. */
  horizon: new Color("#20272a"),
  /** The floor. Warm, and darker than the sky so the vessel sits on something. */
  ground: new Color("#101314"),
  /** The overhead source. Well above 1.0 once the lobe multiplier is applied. */
  key: new Color("#ffffff"),
  /** Fore and aft rims. */
  rim: new Color("#a9c0d2"),
  /** The bounce. */
  bounce: new Color("#5a4c3a"),
} as const;

const ENV_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * The studio, as a function of direction.
 *
 * Every source is a smooth lobe rather than a hard disc. A hard-edged light in
 * an environment map produces a hard-edged reflection, and a hard-edged
 * reflection on a 5 m hull reads as a sticker; the lobes are what make the
 * highlight travel *along* the sheer as the boat turns, which is the single
 * cue that says "this is a curved, glossy, physical object".
 */
const ENV_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vDir;

uniform vec3 uSky;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uKey;
uniform vec3 uRim;
uniform vec3 uBounce;

float lobe(vec3 d, vec3 axis, float tightness) {
  return pow(max(dot(d, normalize(axis)), 0.0), tightness);
}

/** A softbox ring at a fixed elevation, uniform all the way round. */
float ring(vec3 d, float height, float width) {
  float t = (d.y - height) / width;
  return exp(-t * t);
}

void main() {
  vec3 d = normalize(vDir);

  // Backdrop: sky above, ground below, with a soft seam rather than a line.
  float h = smoothstep(-0.22, 0.24, d.y);
  vec3 colour = mix(uGround, uHorizon, smoothstep(-1.0, -0.05, d.y));
  colour = mix(colour, uSky, h);

  // A broad, soft overhead wash. This is the diffuse level the whole boat
  // sits at; without it the shadowed side of a dark hull has nothing at all.
  //
  // PULLED BACK IN PHASE 4.3, §22. A wide, near-uniform lobe is the one source
  // that adds no information: it lifts every surface by the same amount
  // whatever way it faces, which is exactly the "flatter and more pastel than
  // the references" the brief reports. What it was doing usefully — keeping the
  // dark bottom off zero — is done better below, by a source with a direction.
  colour += uKey * lobe(d, vec3(0.0, 1.0, 0.0), 1.2) * 1.40;

  // The ring. Centred at sin(37°) and about 15° wide — narrow enough to read
  // as a source rather than a haze, broad enough that the highlight it leaves
  // on the topsides is a band with soft ends rather than a hard line.
  colour += uKey * ring(d, 0.60, 0.13) * 5.4;
  // A second ring lower down catches the flare below the chine and keeps the
  // black bottom from going to a single value.
  //
  // RAISED AND WIDENED IN PHASE 4.3, §22 — "dark values that remain
  // dimensional".
  //
  // AND CAPPED, AFTER MEASURING WHAT IT COST. The first attempt took it to 2.7
  // and the bottom barely moved while the topsides went from #5f796e to
  // #728e82 and the capping from #161c25 to #404347 — a ring at this elevation
  // is nearly horizontal, so it reflects into NEAR-VERTICAL surfaces, which is
  // the topsides and the capping and not the bottom at all. The bottom faces
  // down and outward; what it sees is the floor, and that is the bounce below.
  //
  // The honest limit is worth recording. The plate draws its bottom at #414141
  // where it faces the light, and no studio rig produces that from a black
  // painted surface: an albedo of 0.011 would need an irradiance of about 5.6
  // to get there. The plate is an illustration and its bottom is drawn, not
  // lit. What §22 asks for is that the dark stay DIMENSIONAL, and the test for
  // that is range rather than level — this hull's bottom now runs from its own
  // shadow to a chine highlight instead of sitting at one value.
  colour += uKey * ring(d, 0.13, 0.15) * 1.9;

  // Overhead key, wide and slightly forward of vertical so the deck and the
  // horizontal mouldings get a direction rather than a flat fill.
  //
  // LEFT AT 4.2, AND THE ATTEMPT TO CHANGE IT IS WORTH RECORDING. The sage
  // foredeck renders at #e3f5ec — near-white — while the same paint on the
  // vertical topsides reads #5f7469, and this lobe looked like the culprit
  // because it points at horizontal surfaces. It is not: taking it to 3.1
  // moved the deck by one level, from #e3f5ec to #e3f4ec.
  //
  // The real source is the RING. An up-facing normal has cos ≈ 0.6 with a ring
  // at 37° elevation, so for DIFFUSE response the ring at 5.4 dominates
  // everything else in the rig — and the ring is what gives the topsides their
  // travelling highlight, which is the one thing §22 and §23 most care about.
  // Trading the hull's key for a darker deck is the wrong trade. It stays in
  // PHASE_4_3_REPORT §R instead.
  colour += uKey * lobe(d, vec3(0.18, 1.0, 0.34), 5.0) * 4.2;

  // Fore and aft rims, low, cool, and never in the same place as the key.
  colour += uRim * lobe(d, vec3(0.94, 0.16, -0.30), 8.0) * 3.4;
  colour += uRim * lobe(d, vec3(-0.88, 0.20, 0.42), 8.0) * 2.4;

  // Floor bounce, and the other half of the same fix: the underside of the
  // topsides and the inside of the cockpit both face this and nothing else.
  colour += uBounce * lobe(d, vec3(0.0, -1.0, 0.0), 2.0) * 1.9;

  gl_FragColor = vec4(colour, 1.0);
}
`;

/**
 * Bake the studio into a prefiltered environment map, once.
 *
 * Through PMREM rather than a plain cube render, because a raw cube map only
 * answers "what is in this direction" and a material also needs "what is in
 * this *cone*" — that is what roughness means. Without prefiltering the
 * clear-coated hull would take a sharp reflection of the key lobe and the matt
 * cockpit liner would take the same sharp reflection at lower intensity, which
 * is the exact look of a model lit by a cube map: everything glossy, nothing
 * soft. PMREM's mip chain is what lets one rig light a mirror finish and a
 * moulding correctly at the same time.
 *
 * The cost is one render at mount and nothing per frame; the result is a
 * texture on the scene's `environment`, which every physical material in the
 * model reads through `envMapIntensity`.
 */
export function createStudioEnvironment(renderer: WebGLRenderer): {
  texture: Texture;
  dispose: () => void;
} {
  const scene = new Scene();
  const geometry = new SphereGeometry(10, 48, 32);
  const material = new ShaderMaterial({
    vertexShader: ENV_VERTEX,
    fragmentShader: ENV_FRAGMENT,
    side: BackSide,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uSky: { value: PXL_STUDIO.sky.clone() },
      uHorizon: { value: PXL_STUDIO.horizon.clone() },
      uGround: { value: PXL_STUDIO.ground.clone() },
      uKey: { value: PXL_STUDIO.key.clone() },
      uRim: { value: PXL_STUDIO.rim.clone() },
      uBounce: { value: PXL_STUDIO.bounce.clone() },
    },
  });
  scene.add(new Mesh(geometry, material));

  const pmrem = new PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const target = pmrem.fromScene(scene);

  geometry.dispose();
  material.dispose();
  pmrem.dispose();

  return {
    texture: target.texture,
    dispose: () => target.dispose(),
  };
}
