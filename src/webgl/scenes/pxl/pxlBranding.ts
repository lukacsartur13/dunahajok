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

/* ── Brushed metal, PHASE 4.6 §25 – §30 ────────────────────────────────────*/

/**
 * §28 — THE BADGE MATERIAL.
 *
 * §25 rejects what the hull marks were: "Not printed text. Not flat orange/black
 * paint. Not HTML-style logo decals." They were flat paint — a zero-thickness
 * `ShapeGeometry` carrying a colour and a clearcoat, offset 4 mm off the panel.
 * At any distance that is a sticker, because a sticker is exactly what it is.
 *
 * What replaces it has to be metal without becoming jewellery. §28 rules out
 * chrome, glitter and exaggerated normal maps and asks for "precision-machined /
 * finely brushed", which pins all four numbers:
 *
 *   METALNESS 1        a real conductor. Anything less reads as painted metal,
 *                      which is the thing being escaped.
 *   ROUGHNESS 0.30     the whole difference between brushed and mirror. Below
 *                      about 0.12 the badge reflects the backdrop sharply and
 *                      becomes chrome; above 0.45 it stops catching a highlight
 *                      at all and reads as grey plastic. 0.30 holds a soft
 *                      linear glint that travels as the boat turns, which is
 *                      §29's "especially visible when light moves across them".
 *   ANISOTROPY 0.65    the brushing itself, and the reason this is a
 *                      `MeshPhysicalMaterial` feature rather than a texture. A
 *                      normal map fine enough to read as brushing at 55 mm cap
 *                      height would alias the moment the camera moved; the
 *                      anisotropic BRDF stretches the highlight along one axis
 *                      analytically and cannot alias.
 *   CLEARCOAT 0        an emblem is lacquered on a car, not on a boat, and a
 *                      clearcoat over an anisotropic base adds an isotropic
 *                      second highlight that cancels the brushing.
 */
export interface PxlBadgeFinish {
  colour: string;
  roughness: number;
  metalness: number;
  anisotropy: number;
  /** Radians. 0 lays the brushing across the mark; π/2 runs it lengthwise. */
  anisotropyRotation: number;
}

/**
 * §30 — ONE TONE IN USE, AND A SECOND KEPT FOR A GROUND THAT COULD MOVE.
 *
 * §30 asks that the badging be tested on light, dark, navy, sage and warm/gold,
 * and allows "one consistent material if contrast remains acceptable". It does,
 * and for a structural reason rather than a lucky one: NEITHER HULL MARK SITS ON
 * A CONFIGURABLE SURFACE. The PXL lockup's ground is `transom_black` and the
 * Duna script's is `hull_accent`, and `pxlConfig` resolves both through
 * `sternMoulding`, which is deliberately constant — see the note there. Change
 * the hull to white or to gold and the two mouldings the marks are on stay the
 * same structural black, so the satin nickel reads identically on all six.
 *
 * `PXL_BADGE_DARK` is therefore UNREACHABLE TODAY, and it is kept anyway because
 * §30's last sentence asks for exactly that: "If the reference suggests separate
 * badge finishes, preserve the architecture for that later." The day somebody
 * makes the capping configurable, `badgeForInk` already resolves a second tone
 * on the same luminance threshold the ink uses, and nothing else has to change.
 *
 * Both are metal, both are brushed, and the difference between them is a
 * darkening rather than a different treatment: an anodised emblem and a bright
 * one are two finishes of one part.
 */
export const PXL_BADGE_BRIGHT: PxlBadgeFinish = {
  /* Satin nickel rather than aluminium. Aluminium's f0 is neutral and slightly
     blue, and against the sage and navy hulls a neutral badge reads cold; a
     trace of warmth is what makes it look like a fitted emblem. */
  colour: "#c8c6c0",
  roughness: 0.30,
  metalness: 1,
  anisotropy: 0.65,
  anisotropyRotation: 0,
};

export const PXL_BADGE_DARK: PxlBadgeFinish = {
  /* Anodised gunmetal, for the pale hulls. Still fully metallic — it separates
     from a white topside by specular behaviour rather than by being dark, which
     is why it can be this close to the ink's own black and still read as metal. */
  colour: "#6d7075",
  roughness: 0.34,
  metalness: 1,
  anisotropy: 0.6,
  anisotropyRotation: 0,
};

/**
 * §27 — THE SCRIPT'S OWN TONE, AND IT IS THE QUIET ONE.
 *
 * Added after looking at row C of `.qa/PHASE_4_6_details.png`, which is what
 * §41's iteration loop is for. On the delivered side plate the Duna script is
 * drawn ALMOST TONE ON TONE with the dark band it lies in — it is legible by
 * its edge rather than by its value — and the first build put satin nickel
 * there, which read as a chrome signature on a black panel and was the one
 * thing §27 warns against: "do not make it thick or chunky. The silhouette must
 * remain elegant."
 *
 * So the script takes a darker anodised tone than the lockup does on the same
 * ground. It is still fully metallic and still brushed, so it still does what
 * §46 requires — catches light differently from the moulding, rather than
 * looking painted into it — but at rest it sits where the reference puts it.
 */
export const PXL_BADGE_SCRIPT: PxlBadgeFinish = {
  colour: "#8d8b86",
  /* Slightly rougher than the lockup's. A fine script picks up a hard
     highlight along every stroke at 0.30, and on a 3 mm stroke that is a line
     of white rather than a sheen. */
  roughness: 0.38,
  metalness: 1,
  anisotropy: 0.7,
  /* Brushed ALONG the mark rather than across it — a script is read along its
     baseline, and brushing that runs the same way keeps the highlight
     continuous instead of banding each stroke separately. */
  anisotropyRotation: Math.PI / 2,
};

/** The badge finish for a ground, on the same threshold `inkForGround` uses. */
export function badgeForGround(hex: string, slot = "pxl_wordmark"): PxlBadgeFinish {
  if (groundLuminance(hex) > 0.18) return PXL_BADGE_DARK;
  return slot === "duna_script" ? PXL_BADGE_SCRIPT : PXL_BADGE_BRIGHT;
}

/**
 * The badge finish that goes with an ink — the same decision, arrived at from
 * the other end.
 *
 * `placeOnHull` is handed an ink rather than a ground, because until this phase
 * an ink was all a mark needed. Resolving the badge from the ink rather than
 * plumbing the ground through two more signatures keeps one rule in one place;
 * the comparison is INVERTED against `badgeForGround` and has to be, because
 * `inkForGround` already flipped once: a light ground takes the dark ink, and
 * the dark ink takes the dark badge.
 *
 * Asserted against `badgeForGround(ground)` in the configurator suite for every
 * published finish, so the two can never drift apart unnoticed.
 */
export function badgeForInk(ink: PxlDecalInk, slot = "pxl_wordmark"): PxlBadgeFinish {
  if (groundLuminance(ink.colour) <= 0.18) return PXL_BADGE_DARK;
  return slot === "duna_script" ? PXL_BADGE_SCRIPT : PXL_BADGE_BRIGHT;
}

/**
 * §26, §27, §29 — HOW FAR THE TWO MARKS STAND PROUD, IN METRES.
 *
 * §29 wants a badge that reads as typography from a distance and reveals
 * thickness up close, which is a constraint on the RATIO of relief to stroke
 * width rather than on the relief alone. The PXL lockup's strokes are about
 * 9 mm wide at a 0.290 m overall length; the Duna script's are nearer 3 mm.
 *
 * So the two are not the same number, and §27 says why: "Because it is finer
 * script typography: do not make it thick or chunky. Use extremely restrained
 * depth. The silhouette must remain elegant." A 1.6 mm relief on a 3 mm stroke
 * is a bar; 0.7 mm is a crease that catches light. The bevel is a third of the
 * relief on each, which is a machined edge break rather than a rounded-over one.
 */
export const PXL_BADGE_RELIEF = {
  /** The PXL lockup on the stern moulding. 1.6 mm on a 9 mm stroke. */
  wordmark: 0.0016,
  /** The Duna script on the capping. 0.7 mm on a 3 mm stroke — §27. */
  script: 0.0007,
  /** Edge break, as a fraction of the relief. */
  bevel: 0.34,
} as const;

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
