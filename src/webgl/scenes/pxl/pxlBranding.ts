/**
 * PXL — THE BRANDING RULES, WITHOUT A RENDERER.
 *
 * Split from `pxlDecals` for the reason `pxlPresets` is split from `pxlCamera`
 * and `pxlCatalog` from `pxlPropulsion`: the *rules* are the part worth
 * asserting, and `npm test` compiles the pure modules to CommonJS and runs them
 * on plain node. A module that imports three cannot be reached from there, so
 * anything a test needs to see has to live on this side of the line.
 *
 * What is here: where the marks go, which ink a ground takes, and how much
 * branding the boat is allowed to carry. What is next door: the letterform
 * geometry, the surface raycast and the materials.
 *
 * §12's contrast rule in particular is worth having under test rather than
 * under review. It is a threshold with a warm mid-tone on one side of it, and a
 * change to either the ink or the moulding could quietly put a mark on a ground
 * it cannot be read against — which is the kind of thing nobody notices until a
 * customer sees it in the wrong finish.
 */

import { PXL_MARK_PLATE_INK, PXL_PLEXI_MARK } from "./pxlReference";

/* ── Ink ───────────────────────────────────────────────────────────────────*/

export interface PxlDecalInk {
  colour: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
}

/**
 * §12 — TWO INK TREATMENTS FOR THE HULL, AND NOTHING ELSE.
 *
 * §12 rules out the three usual fixes for a mark that has to work on six hull
 * colours: no outline, no drop shadow and no glow, because none of them is part
 * of the product design. What is left is the ink, so an ink treatment here is a
 * material — a colour and three surface parameters — and there is deliberately
 * no field on it that could carry an effect.
 */

/**
 * The reference's own cognac, for dark grounds.
 *
 * MEASURED IN PHASE 4.1 rather than matched by eye. `scripts/pxl/_mark.mjs`
 * isolates the 889 orange pixels of the lockup in the side plate and averages
 * them: #d6703c. Phase Four's #d9762c was close in hue and 8% too saturated,
 * which on a mark this small reads as a slightly hotter orange than the rails
 * beside it — and the rails are a different colour on purpose.
 */
export const PXL_INK_LIGHT: PxlDecalInk = {
  colour: PXL_MARK_PLATE_INK,
  roughness: 0.34,
  metalness: 0,
  clearcoat: 0.4,
};

/** For a ground light enough that the cognac would sink into it. */
export const PXL_INK_DARK: PxlDecalInk = {
  colour: "#191b1e",
  roughness: 0.3,
  metalness: 0,
  clearcoat: 0.45,
};

/**
 * The plexi mark's ink. §9, §12.
 *
 * A THIRD TREATMENT, AND IT IS NOT A THIRD OPTION. The two above are the two a
 * hull ground can take; this one belongs to a different surface, and the
 * surface is why it is different: the studies show the mark on the screen as a
 * cool light grey, not as the cognac. On dark tinted acrylic the cognac is
 * barely separable, and §12 has removed every way of helping it that is not the
 * ink itself.
 *
 * It is also not white. A white mark on glazing reads as an opaque sticker,
 * which is exactly what §9 says the mark must not look like; #c9d2d8 sits close
 * enough to the sky the screen is reflecting to read as printed ON it.
 */
export const PXL_INK_PLEXI: PxlDecalInk = {
  colour: PXL_PLEXI_MARK.ink,
  /* Higher than the hull inks'. A screen print on acrylic is a matte film, and
     giving it the hull mark's clearcoat puts a second specular highlight on a
     surface that already has one — which is the single fastest way to make a
     decal look like it is floating in front of the glass. */
  roughness: 0.52,
  metalness: 0,
  clearcoat: 0.08,
};

/**
 * Perceptual luminance of an sRGB hex, 0–1.
 *
 * Arithmetic rather than `THREE.Color`, which is what keeps this module pure —
 * and it is the same arithmetic three would do: decode the byte, apply the sRGB
 * transfer function, and weight the three linear channels by the Rec. 709
 * coefficients.
 */
export function groundLuminance(hex: string): number {
  const channel = (offset: number): number => {
    const byte = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return byte <= 0.04045 ? byte / 12.92 : Math.pow((byte + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/**
 * The ink treatment for a ground.
 *
 * The threshold is 0.18 in LINEAR luminance rather than 0.5 in some perceptual
 * space, and the reason is the ink: the cognac is itself a mid-tone, so it
 * loses contrast against a light ground well before a pure light ink would.
 * The warm grey study is the marginal case and sits just under; the gold study
 * sits just over and correctly takes the dark treatment.
 */
export function inkForGround(hex: string): PxlDecalInk {
  return groundLuminance(hex) > 0.18 ? PXL_INK_DARK : PXL_INK_LIGHT;
}

/* ── Slots ─────────────────────────────────────────────────────────────────*/

/**
 * Which surface a mark is printed on, and therefore what governs its ink.
 *
 * A slot's ground is not always a configurable finish: the plexi is glazing,
 * whose colour no option changes, so its ink is fixed rather than resolved. The
 * distinction is in the data so that `inkWordmark` does not need a special case
 * per slot — it asks the slot what governs it.
 */
export type PxlDecalGround = "stern_moulding" | "gunwale_capping" | "glazing";

export interface PxlDecalSlot {
  id: string;
  /** The zone or authored part the mark is laid on. */
  zone: string;
  ground: PxlDecalGround;
  implemented: boolean;
  /** Where the artwork came from, and what it is not. */
  artwork: string;
}

/**
 * THE THREE MARKS THIS BOAT CARRIES, ALL OF THEM IMPLEMENTED.
 *
 * Phase Four declared two slots and left the Duna one empty on the grounds that
 * "approximating a script logotype by hand produces something recognisably meant
 * to be Duna's and recognisably not". That reasoning was sound and its conclusion
 * was wrong, and §4 says so plainly: an absent mark on the manufacturer's own
 * boat is not a neutral choice, it is a visibly unfinished product.
 *
 * What changed is the method rather than the standard. The mark is not
 * approximated by hand — it is threshold-traced off the highest-contrast
 * delivered instance by `scripts/pxl/build-duna-trace.mjs`, so its shape is the
 * plate's shape rather than anybody's idea of it, and it carries a disclaimer
 * that travels with the artwork. See `pxlScript` for the search that established
 * no official vector exists.
 */
export const PXL_DECAL_SLOTS: readonly PxlDecalSlot[] = [
  {
    id: "pxl_wordmark",
    zone: "transom_black",
    ground: "stern_moulding",
    implemented: true,
    artwork:
      "authored outlines, re-proportioned in Phase 4.1 from the plate's own " +
      "100 × 19 px lockup — see pxlLockup. Not official artwork; the vector is " +
      "an outstanding requirement.",
  },
  {
    id: "duna_script",
    zone: "hull_accent",
    ground: "gunwale_capping",
    implemented: true,
    artwork:
      "threshold trace of the 147 × 28 px instance in pxl-colours-04, rectified " +
      "to the side plate's aspect — see pxlDunaTrace.generated. PROVISIONAL " +
      "BRAND ARTWORK, not Duna's official logotype.",
  },
  {
    id: "pxl_plexi",
    zone: "pxl_screen_glass",
    ground: "glazing",
    implemented: true,
    artwork:
      "the same authored lockup as the hull mark, in the plexi ink and placed " +
      "against the screen's own face rather than the hull's — §9 requires a " +
      "separate instance and forbids reusing the side mark's transform.",
  },
] as const;

export const PXL_DECAL_SLOT_BY_ID = new Map(PXL_DECAL_SLOTS.map((s) => [s.id, s]));

/**
 * How much of the boat is branded, as a check on §12's restraint.
 *
 * TWO PER SIDE FROM PHASE 4.1, up from one, and the third mark does not count
 * against it: the plexi mark is on the screen's centreline and is one instance
 * rather than a mirrored pair, so a viewer standing off the beam sees two marks
 * on the hull and one on the glass. The number is here so that adding a fourth
 * slot is a decision somebody has to make against a stated limit rather than an
 * accretion nobody notices.
 */
export const PXL_MAX_HULL_MARKS_PER_SIDE = 2;

/** Marks that are placed once rather than mirrored. */
export const PXL_CENTRELINE_MARKS: readonly string[] = ["pxl_plexi"];
