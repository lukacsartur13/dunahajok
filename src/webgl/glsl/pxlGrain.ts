/**
 * THE INTERIOR GRAIN — §A9's micro-normal, on a model with no UVs.
 *
 * §A9 asks that the interior respond like upholstery rather than like painted
 * metal, and lists a subtle micro-normal among the four things that requires.
 * The obvious implementation is a normal map, and it is unavailable: the PXL
 * GLB carries `position` and `normal` and nothing else — no UV set, on any
 * mesh, because the source is an STL and an STL has no texture coordinates to
 * export. See the attribute table in PXL_CONFIGURATOR_MODEL_MAP.md.
 *
 * There were three ways out.
 *
 *   1. GENERATE UVs at load. Wrong for this shape: the cockpit liner is one
 *      mesh containing a horizontal sole, near-vertical inner shell faces and
 *      the seat boxes between them, so any single planar projection stretches
 *      the grain to streaks on two thirds of it, and an unwrap computed at
 *      runtime is a second geometry pipeline nobody can inspect.
 *   2. RE-EXPORT the asset with UVs. Correct, and the right long-term answer —
 *      it is filed as an asset requirement. It is not available this phase and
 *      it would make the grain depend on a pipeline run.
 *   3. TRIPLANAR PROJECTION. Sample the same map three times, once down each
 *      object axis, and blend by the surface normal. No UVs, no seams, no
 *      stretching on any face orientation, and no dependency on the export.
 *
 * This is (3). It costs three texture fetches on the two interior zones — the
 * liner and the console — and nothing at all on the other eleven, because the
 * injection is only installed on materials whose zone asks for it.
 *
 * WHAT IT DOES NOT DO. It does not claim a weave, a hide or a stitch. It is a
 * fine isotropic grain of the kind a moulding tool leaves, and §A8's two
 * characters differ only in how much of it is applied — see the note on
 * `PXL_SURFACE_CHARACTER`. Nothing here is capable of representing two
 * different physical upholstery products, which is exactly why it is honest to
 * offer the two characters it does offer.
 *
 * NO RECOMPILE ON CHANGE. Installed once, at load, before the material is first
 * compiled. Changing the interior colour or the surface character writes
 * uniforms; the program is built with these injections in it from the start and
 * is never rebuilt, which is what keeps §A3's guarantee true across a category
 * the sweep does not touch.
 */

/**
 * Object-space position and normal, carried to the fragment stage.
 *
 * Object space rather than world space on purpose. The vessel is placed at the
 * origin today, but a scene that moved or rotated it — the river composition
 * does neither, an editorial one might — would drag a world-space projection
 * across the surface and make the grain crawl. Object space is nailed to the
 * boat.
 */
export const PXL_GRAIN_VERTEX_COMMON = /* glsl */ `
#include <common>
varying vec3 vPxlGrainPos;
varying vec3 vPxlGrainNrm;
`;

export const PXL_GRAIN_VERTEX = /* glsl */ `
#include <begin_vertex>
vPxlGrainPos = position;
vPxlGrainNrm = normal;
`;

export const PXL_GRAIN_FRAGMENT_COMMON = /* glsl */ `
#include <common>
varying vec3 vPxlGrainPos;
varying vec3 vPxlGrainNrm;
uniform sampler2D uPxlGrainMap;
/** (tiles per metre, strength). Strength 0 makes the whole block the identity. */
uniform vec2 uPxlGrain;
/**
 * THE NORMAL MATRIX, DECLARED HERE BECAUSE THREE DOES NOT DECLARE IT HERE.
 *
 * three puts "uniform mat3 normalMatrix" in the default VERTEX prefix only, and
 * the fragment prefix gets viewMatrix and cameraPosition and nothing else. The
 * first version of this file used the name in the fragment stage anyway, on the
 * reasonable assumption that a built-in is a built-in; the program failed to
 * link with "undeclared identifier" on every material carrying the grain, and
 * the failure was INVISIBLE for a full phase because a scene nobody could render
 * is a scene whose shader errors nobody reads. It was found the hour the
 * deterministic frame mode in pxlQa first drew a frame. See PHASE_4_1_REPORT.md.
 *
 * Declaring it is sufficient — no CPU wiring, no varying. The renderer uploads
 * the common matrices by looking their names up in the linked program's ACTIVE
 * uniform map, which is stage-agnostic: WebGLRenderer.setProgram does
 * "p_uniforms.setValue(gl, 'normalMatrix', object.normalMatrix)" for any program
 * that declares the name anywhere, and renderObject has already computed
 * object.normalMatrix from the current modelViewMatrix by the time it runs. So
 * this is the same value the vertex stage sees, one frame current, per object.
 *
 * A varying would also have worked and costs three interpolators to carry a
 * value that is uniform across the primitive. This costs nothing.
 *
 * IF A FUTURE THREE ADDS normalMatrix TO THE FRAGMENT PREFIX this line becomes a
 * duplicate declaration and the program fails to compile — loudly, at the first
 * frame, with the identifier named. That is the right failure mode, and
 * scripts/check-glsl.mjs now asserts the assumption directly against the
 * installed three so the break is caught by npm run typecheck instead.
 */
uniform mat3 normalMatrix;
`;

/**
 * The perturbation, injected in place of `normal_fragment_maps`.
 *
 * That chunk is where three applies a normal map, and on a material with no
 * map it expands to nothing — so replacing it is taking an empty slot rather
 * than displacing behaviour. `normal` is in VIEW space by the time this runs
 * (`normal_fragment_begin` has already put it there), which is why the result
 * has to come back through `normalMatrix`.
 *
 * THE BLEND IS THE WHITEOUT FORM, and it is worth naming because the naive
 * alternative is wrong in a way that is easy to miss. Simply averaging three
 * tangent-space samples flattens the result toward (0,0,1) wherever two
 * projections disagree — which on a curved liner is most of it — and the grain
 * fades out exactly where the surface is most interesting. The whiteout blend
 * adds the sampled XY to the surface normal's own components before
 * re-normalising, so detail survives the blend instead of cancelling in it.
 *
 * The weights are the normal's components raised to a power and normalised.
 * Cubed rather than squared: a higher exponent narrows the band where two
 * projections overlap, and it is inside that band that a triplanar projection
 * shows its only artefact.
 */
export const PXL_GRAIN_NORMAL = /* glsl */ `
#include <normal_fragment_maps>
{
  vec3 gn = normalize(vPxlGrainNrm);
  vec3 gp = vPxlGrainPos * uPxlGrain.x;

  vec3 w = abs(gn);
  w = w * w * w;
  w /= max(w.x + w.y + w.z, 1e-4);

  vec3 tx = texture2D(uPxlGrainMap, gp.zy).xyz * 2.0 - 1.0;
  vec3 ty = texture2D(uPxlGrainMap, gp.xz).xyz * 2.0 - 1.0;
  vec3 tz = texture2D(uPxlGrainMap, gp.xy).xyz * 2.0 - 1.0;

  tx = vec3(tx.xy + gn.zy, abs(tx.z) * gn.x);
  ty = vec3(ty.xy + gn.xz, abs(ty.z) * gn.y);
  tz = vec3(tz.xy + gn.xy, abs(tz.z) * gn.z);

  vec3 objectNormal = normalize(tx.zyx * w.x + ty.xzy * w.y + tz.xyz * w.z);
  vec3 grained = normalize(normalMatrix * objectNormal);
  normal = normalize(mix(normal, grained, uPxlGrain.y));
}
`;
