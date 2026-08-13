/**
 * THE DUNA LINE, in screen space.
 *
 * Every image on the site is cut along one angle — `--rake`, taken from the
 * sheer of the 6.1 hull — and the hero's river plate is no exception: its
 * static art direction carries `clip-path: polygon(0 0, 100% var(--rake-cut),
 * 100% 100%, 0 100%)`, a top edge that falls away to the right.
 *
 * The WebGL band has to end on exactly that line, or the moment the live scene
 * crossfades in over the photograph the boundary would visibly straighten. So
 * the scene masks itself with the same diagonal, computed from `gl_FragCoord`
 * against the slot's own rectangle. Every material in a scene includes this and
 * multiplies its alpha by it — that is the entire integration.
 *
 * `uRake` is (slot left, slot top, slot width, rake drop), all in *device*
 * pixels and all in WebGL's bottom-left origin, so `y` decreases to the right.
 */

export const RAKE_GLSL = /* glsl */ `
uniform vec4 uRake;

float dunaRakeMask() {
  if (uRake.w < 0.5) return 1.0;
  float fx = clamp((gl_FragCoord.x - uRake.x) / max(uRake.z, 1.0), 0.0, 1.0);
  float edge = uRake.y - uRake.w * fx;
  return 1.0 - smoothstep(edge - 0.75, edge + 0.75, gl_FragCoord.y);
}
`;

/**
 * sRGB → linear, by hand.
 *
 * three does not patch texture sampling inside a ShaderMaterial the way it
 * does for its own materials, so an sRGB texture read with `texture2D` arrives
 * un-decoded. Rather than depend on which private chunk happens to be injected
 * in a given release, the plate's textures are flagged `NoColorSpace` and
 * decoded here, once, explicitly. The renderer's output transform then encodes
 * the result back exactly as it does for the rest of the frame.
 */
export const SRGB_GLSL = /* glsl */ `
vec3 dunaSrgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}
`;
