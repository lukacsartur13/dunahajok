/**
 * THE WINDSCREEN'S MATERIAL, AND THE MARK'S BASIS.  §7, §8, §9.
 *
 * ── WHAT THIS FILE STOPPED DOING IN PHASE 4.3 ─────────────────────────────
 *
 * It used to BUILD the screen. The delivered STL had no glazing, so Phase 4.1
 * authored one at runtime: a flat slab sized as a fraction of the console's
 * bounding box, standing on that box's crest. It was the honest move at the
 * time and it had two failures that only a three-quarter view shows.
 *
 * It was FLAT. A plane across the console has no side return, so it vanishes
 * edge-on and reads as a decal from anywhere off the beam — which is where the
 * cockpit and stern reference cameras both sit. §7 asks for a wraparound and no
 * amount of material work makes a plane into one.
 *
 * And it was MOUNTED ON A BOUNDING BOX. The console it measured was the STL's
 * wedge, whose highest point is its AFT face, so the screen stood behind the
 * driver's hands rather than in front of them, and the PXL mark stood in free
 * air above it.
 *
 * §7 of the 4.3 brief settles both: "It must have genuine 3D geometry. Do NOT
 * use a flat decorative plane." The screen is now built in Blender with the
 * console it belongs to — a front face, two side returns, a swept upper profile
 * and a 9.2° rake, all measured off the July plate — and arrives as the
 * `windshield` zone in the GLB. See `scripts/pxl/pxl_upper.py`.
 *
 * ── WHAT IS LEFT HERE, AND WHY IT IS STILL HERE ───────────────────────────
 *
 * Two things that cannot live in a GLB.
 *
 * THE MATERIAL. glTF can carry transmission, but the runtime promotes every
 * delivered material to `MeshPhysicalMaterial` and drives it from the finish
 * catalogue; a transmission material that arrived through that path would be
 * overwritten by the first `applyConfiguration`. So the glazing is installed
 * once, at index time, and no channel writes to it.
 *
 * THE MARK'S BASIS. §9 requires the PXL mark on the plexi, "attached correctly
 * at every camera angle", and re-projected onto the rebuilt surface rather than
 * kept at its old transform. `measureScreenFrame` fires a ray at the delivered
 * glazing and takes the surface point and normal from whatever it hits — the
 * same discipline `pxlDecals` uses for the hull marks, and the reason those
 * survived Phase 4.2's re-export without being touched.
 *
 * ── THE GLASS ─────────────────────────────────────────────────────────────
 *
 * §8 asks for marine tinted acrylic and rules out five specific failures:
 * opaque black, an invisible sheet, mirror glass, blue sci-fi glass, and no
 * thickness. Those are five mistakes with one common cause — reaching for
 * `transparent: true` and an opacity, which is an alpha blend rather than a
 * material.
 *
 * What this uses instead is three's transmission model: `transmission` 0.92
 * with `thickness` set to the real 9 mm, `ior` 1.49 (acrylic's, not glass's
 * 1.52 — the drawing shows plexi and the difference is measurable at a grazing
 * angle), and a restrained cool attenuation over that thickness rather than a
 * tinted base colour. A tint applied as albedo colours the reflection too,
 * which is exactly what produces "blue sci-fi glass"; attenuation colours only
 * what passes THROUGH, which is what real tinted acrylic does.
 *
 * The Fresnel is left where the IOR puts it. `reflectivity` is 0.5 — the
 * neutral value — because raising it is the usual way an "invisible sheet" gets
 * fixed and the direct cause of "mirror glass" one step later. What actually
 * makes the screen readable is that it has a FRAME and a THICKNESS, and both
 * are now geometry: a 24 mm dark cap along its top edge and two posts closing
 * the wings, in `console_detail`, plus 9 mm of real section on the glass.
 */

import {
  Box3,
  Color,
  DoubleSide,
  Mesh,
  MeshPhysicalMaterial,
  Raycaster,
  Vector3,
} from "three";
import { PXL_SCREEN } from "./pxlReference";

/* ── The measured console ─────────────────────────────────────────────────*/

export interface PxlScreenFrame {
  /** Centre of the screen's outer face, world metres. */
  centre: Vector3;
  /** Unit vector along the screen's width, +Z. */
  right: Vector3;
  /** Unit vector up the screen's face, tilted aft by the rake. */
  up: Vector3;
  /** Outward normal of the screen's forward face. */
  normal: Vector3;
  /** Face dimensions, metres. */
  width: number;
  height: number;
}

/**
 * The delivered glazing's own front face, found by ray rather than authored.
 *
 * §9 — "re-project/reposition the PXL branding onto the actual plexi surface.
 * It must remain attached correctly at every camera angle." A transform
 * remembered from the old runtime screen would satisfy neither half: the old
 * screen stood on a different console in a different place.
 *
 * So the frame is measured. A ray is fired aft along the centreline at the
 * screen's own mid-height; the first hit is the outside of the front face, and
 * its normal is that face's. Width comes from the mesh's beam and height from
 * the part of its box that stands above the hit — not from the whole box, which
 * includes the wings sweeping down and would make the mark a third too small.
 *
 * Returns null when there is no glazing, which is the honest outcome: a mark
 * placed at a fallback position is a mark in the wrong place, and an absent one
 * is something `npm run model` and the configurator tests can catch.
 */
export function measureScreenFrame(screen: Mesh): PxlScreenFrame | null {
  const box = new Box3().setFromObject(screen);
  if (box.isEmpty()) return null;

  const width = box.max.z - box.min.z;
  if (width <= 0) return null;

  /* Aimed at the upper third rather than the middle. The wings descend to the
     dash, so a ray at the box's mid-height can pass under the front face
     entirely on a screen whose top sweeps as far as this one's does. */
  const aim = box.min.y + (box.max.y - box.min.y) * 0.66;
  const from = new Vector3(box.max.x + 1.5, aim, (box.min.z + box.max.z) / 2);
  const caster = new Raycaster(from, new Vector3(-1, 0, 0), 0, 4);
  const hit = caster.intersectObject(screen, false)[0];
  if (!hit) return null;

  const normal = (hit.normal ?? new Vector3(1, 0, 0)).clone();
  /* Face normals arrive in object space. The vessel is not rotated, so this is
     a copy rather than a transform — but it is written as one so that a scene
     which does rotate the boat keeps working. */
  normal.transformDirection(screen.matrixWorld).normalize();
  if (normal.x < 0) normal.negate();

  /* `up` is the screen's own rake: perpendicular to the face normal in the
     fore-aft plane, leaning aft as it rises. */
  const up = new Vector3(-normal.y, normal.x, 0).normalize();
  if (up.y < 0) up.negate();
  /* RIGHT × UP MUST EQUAL NORMAL. `Matrix4.makeBasis` followed by
     `Quaternion.setFromRotationMatrix` needs a right-handed basis; get the sign
     wrong and the matrix is a reflection, the extracted quaternion is
     meaningless, and the mark lies flat across the beam facing the camera from
     every angle. That is not hypothetical — it happened in Phase 4.1. */
  const right = new Vector3().crossVectors(up, normal).normalize();

  const height = Math.max((box.max.y - hit.point.y) * 2, 0.06);
  const centre = hit.point.clone();

  return { centre, right, up, normal, width, height };
}

/* ── Materials ────────────────────────────────────────────────────────────*/

/**
 * The plexi. §11.
 *
 * See the file note for why this is a transmission material rather than an
 * alpha blend, and why the tint is attenuation rather than albedo.
 */
export function createPlexiMaterial(): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({
    /* White, and it must stay white. Any colour here tints the REFLECTION as
       well as the transmission, which is the direct cause of §11's "excessive
       blue tint" — the sky comes back off the screen already blue and the eye
       reads it as a filter over the whole boat rather than as glazing. */
    color: new Color(1, 1, 1),
    metalness: 0,
    /* Not zero. A perfectly smooth screen mirrors the studio's key as a hard
       disc, which is §11's "mirror glass"; 0.06 keeps the highlight a highlight
       and is about right for cast acrylic, which is never optically flat. */
    roughness: 0.06,
    transmission: 0.92,
    /* The real section. `thickness` is what the transmission model integrates
       attenuation over, so a wrong number here is a wrong tint depth rather than
       a wrong silhouette. */
    thickness: PXL_SCREEN.thickness,
    ior: 1.49,
    /* Neutral. Raising it is the usual fix for an invisible sheet and the usual
       cause of a mirror one step later — see the file note. */
    reflectivity: 0.5,
    /* §8 — RESTRAINED TINT, AND THE OLD ONE WAS NOT RESTRAINED, IT WAS ABSENT.
       `attenuationDistance` is the distance at which the transmitted light
       reaches `attenuationColor`, so 90 mm on a 9 mm section applies a tenth of
       the tint: the screen returned #75797b in the side frame, which is the
       studio reflected off clear plastic. The colour studies show a screen you
       can see is tinted while still seeing the boat through it.

       14 mm over a 9 mm section lands about two thirds of the way to the
       attenuation colour — visible, and a long way short of the smoked-black
       §8 rules out. The colour itself stays a cool NEUTRAL rather than a blue,
       which is the difference between marine acrylic and "blue sci-fi glass". */
    attenuationColor: new Color("#8d9aa6"),
    attenuationDistance: 0.014,
    clearcoat: 0.25,
    clearcoatRoughness: 0.08,
    /* Both faces. The orbit crosses the screen's plane, and a single-sided
       screen vanishes for the half of the arc that sees its back. */
    side: DoubleSide,
    /* Transmission materials are not alpha-blended, so they can and should
       write depth: the mark in front of the screen has to depth-test against it
       or it will show through from behind. */
    transparent: false,
    depthWrite: true,
  });
  material.name = "pxl_plexi";
  material.envMapIntensity = 1.05;
  return material;
}

/* ── Installation ─────────────────────────────────────────────────────────*/

/**
 * Put the plexi on the delivered glazing, and hand back the mark's basis.
 *
 * Called once, from `indexZones`, before the material's program is first built.
 * Nothing else writes to this material: `windshield` is bound to the `glazing`
 * channel and the catalogue offers nothing on it, so a configuration change
 * cannot reach the glass.
 */
export function installGlazing(mesh: Mesh): PxlScreenFrame | null {
  const material = createPlexiMaterial();
  const previous = mesh.material;
  if (previous instanceof MeshPhysicalMaterial) previous.dispose();
  mesh.material = material;
  /* Drawn after the hull. A transmission material samples the frame buffer for
     what is behind it, so anything that should be visible THROUGH the screen has
     to have been drawn already — and the console directly behind it is the one
     object a viewer will check. */
  mesh.renderOrder = 2;
  mesh.frustumCulled = false;
  return measureScreenFrame(mesh);
}
