/**
 * THE FINISH SWEEP — §66's signature moment, as GLSL.
 *
 * When the exterior finish changes, the new paint does not cross-fade over the
 * whole boat at once. It arrives at the bow and travels aft along a line raked
 * to the Duna Line's own 6.5°, and the hull becomes the new colour as the line
 * passes. §67 asks for a soft boundary, no glow, and 400–700 ms.
 *
 * IT IS A REAL MATERIAL TRANSITION, AND THE DISTINCTION IS THE WHOLE POINT.
 * §66 rules out faking this with a screenshot wipe, and the difference is
 * visible: what moves across the hull here is the *albedo the lighting model is
 * evaluated with*, not two pre-rendered images blended together. Both sides of
 * the boundary are lit by the same environment, take the same clear-coat
 * highlight along the same sheer, and respond to the same camera — because both
 * sides are the same MeshPhysicalMaterial, running once, with a spatially
 * varying base colour.
 *
 * WHAT IT COSTS. One `onBeforeCompile` per swept material, at load, before the
 * first frame — so the program is compiled once and never again. During a
 * change the scene writes four uniforms a frame. No new material object, no new
 * geometry, no second draw call, no render target, no shader recompile. §11's
 * constraints are not worked around here; they are the reason this is a mask on
 * one material rather than two materials dissolved together.
 *
 * WHY ONLY THE HULL. The sweep is bound to the EXTERIOR_HULL role, which is the
 * only role an exterior change repaints. Sweeping a surface whose colour is not
 * changing would be an animation with no subject, and sweeping the outboard —
 * which never follows the hull — would state something about the product that
 * is not true.
 */

/**
 * Declarations, injected into `#include <common>` in both stages.
 *
 * `pxlSweepEdge` is a fragment-stage global rather than a local because it is
 * computed once in the colour chunk and read again, further down the shader, by
 * the roughness and metalness chunks. Those are three separate `#include`s with
 * no scope between them, so a local would not survive the trip.
 */
export const PXL_SWEEP_VERTEX_COMMON = /* glsl */ `
#include <common>
varying float vPxlSweep;
uniform vec3 uPxlSweepBasis;
`;

export const PXL_SWEEP_FRAGMENT_COMMON = /* glsl */ `
#include <common>
varying float vPxlSweep;
uniform vec2 uPxlSweepEdge;
uniform vec3 uPxlSweepFrom;
uniform vec2 uPxlSweepFromSurface;
float pxlSweepEdge;
`;

/**
 * The sweep coordinate, in the model's own frame.
 *
 * `uPxlSweepBasis` is (kx, ky, offset), so the coordinate is a plane equation:
 * kx runs it along the hull from stern to bow, ky rakes the plane over by the
 * Duna Line's angle, and offset puts zero at the transom. Computing it from
 * `position` rather than from a UV is deliberate — the model has no UVs at all
 * (see the model map), and a coordinate derived from geometry cannot go out of
 * step with a re-export the way a texture atlas can.
 */
export const PXL_SWEEP_VERTEX = /* glsl */ `
#include <begin_vertex>
vPxlSweep = position.x * uPxlSweepBasis.x + position.y * uPxlSweepBasis.y + uPxlSweepBasis.z;
`;

/**
 * The boundary.
 *
 * `uPxlSweepEdge.x` travels from just past the bow to just past the transom;
 * everything ahead of it is already the new finish, everything behind it is
 * still the old one. `.y` is the softness — a few centimetres of hull, which is
 * enough to keep the line from aliasing along a chine and far too little to
 * read as a gradient.
 *
 * Note what is NOT here: no emissive term, no rim, no fresnel, nothing added to
 * the surface at the boundary. §67 asks for "minimal highlight, no glow", and
 * the temptation to put a bright line on the leading edge is exactly the thing
 * that would turn a material transition back into an effect.
 *
 * When no change is running the scene parks the edge below every coordinate the
 * hull contains, so the smoothstep resolves to 1 everywhere and the three mixes
 * are the identity. The branchless version costs less than the branch would.
 */
export const PXL_SWEEP_COLOUR = /* glsl */ `
#include <color_fragment>
pxlSweepEdge = smoothstep(
  uPxlSweepEdge.x - uPxlSweepEdge.y,
  uPxlSweepEdge.x + uPxlSweepEdge.y,
  vPxlSweep
);
diffuseColor.rgb = mix(uPxlSweepFrom, diffuseColor.rgb, pxlSweepEdge);
`;

/**
 * The surface parameters follow the same boundary as the colour.
 *
 * Not decoration. The gold study is a pigment with metallic flake — metalness
 * 0.34 against zero for every other finish — so a sweep that moved the colour
 * but faded the metalness globally would put a flat-looking bow on a
 * metallic-looking stern for a third of a second. Carrying roughness and
 * metalness across the same line is what makes the leading edge look like the
 * boundary of a coat of paint rather than a colour filter.
 *
 * Clearcoat is deliberately left to the uniform interpolation. The six finishes
 * span 0.58–0.70 and the difference is not resolvable on a moving boundary,
 * which makes patching a fourth chunk a cost with no picture to show for it.
 */
export const PXL_SWEEP_ROUGHNESS = /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor = mix(uPxlSweepFromSurface.x, roughnessFactor, pxlSweepEdge);
`;

export const PXL_SWEEP_METALNESS = /* glsl */ `
#include <metalnessmap_fragment>
metalnessFactor = mix(uPxlSweepFromSurface.y, metalnessFactor, pxlSweepEdge);
`;
