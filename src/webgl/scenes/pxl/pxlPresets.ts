/**
 * PXL — the camera preset table.
 *
 * PURE DATA, ON PURPOSE. This file imports nothing: no three, no gsap, no
 * React. `pxlCamera` holds the maths that turns these numbers into a camera and
 * imports both. The split exists because §89 asks for the preset contract to be
 * *tested*, and a test that has to boot a WebGL renderer to assert that a
 * preset exists is a test nobody runs. Here the assertions are arithmetic.
 *
 * Presets are authored the way `heroConfig` authors the hero: in the terms a
 * camera operator would use — where the camera stands relative to the boat,
 * what it looks at, and how long the lens is — rather than as world-space
 * matrices. Interpolating those keeps the vessel's proportions stable through a
 * move; interpolating two positions and two look-ats does not, because the
 * distance to the subject drifts and the boat breathes in and out of frame.
 *
 * `hfov` is HORIZONTAL, again as in the hero, and for the same reason: a
 * configurator viewport is a very different shape on a phone than on a desktop,
 * and it is the frame's *width* that the eye judges a hull's length against.
 * Locking the horizontal angle keeps a 5.25 m boat the same fraction of the
 * frame everywhere; the vertical angle falls out of the viewport.
 *
 * RESPONSIVE FRAMING IS AUTHORED, NOT DERIVED. §24 is explicit that mobile is
 * not the desktop composition scaled down, and it is right: a phone viewport is
 * roughly square with a UI tray to come, so the mobile variants sit lower, come
 * in closer and use a longer lens, which recovers the silhouette that a
 * scaled-down wide shot loses. The tablet band interpolates between them.
 */

export type PxlPresetId =
  | "free"
  | "hero_3q"
  | "side"
  | "bow_3q"
  | "stern_3q"
  | "interior"
  | "detail";

export interface PxlCameraState {
  /** Degrees around the vessel. 0 is dead abeam to starboard; +ve swings to the bow. */
  azimuth: number;
  /** Degrees above the waterline plane. */
  elevation: number;
  /** Distance from the look-at point, metres. */
  distance: number;
  /** Horizontal field of view, degrees. */
  hfov: number;
  /**
   * The vertical field of view this composition must not drop below, degrees.
   *
   * Locking the *horizontal* angle is right for a 5.25 m boat seen broadside —
   * the frame's width is what the eye measures a hull's length against — but it
   * is only right while the subject is wider than it is tall in the frame. The
   * cockpit view is not: it looks down at 40°, so the boat's projection is
   * nearly square, and on a slot that is wide and short the vertical angle
   * derived from a fixed hfov collapses and the bow and transom leave the frame
   * through the top and bottom.
   *
   * Measured, not guessed. At 390×844 the cockpit preset's slot is 358×205,
   * aspect 1.75, which turns hfov 34° into vfov 19.9° — and the vessel subtends
   * 21.7° there, so it covered 109% of the frame and clipped. The same happened
   * at 1920×1080, 768×1024 and 844×390. A floor of 29° gives ~75% coverage at
   * every one of them, and is inert at the aspects where the derived angle is
   * already wider.
   *
   * Zero means "no floor", which is the correct answer for every preset whose
   * subject is a hull seen from near its own level.
   */
  minVfov: number;
  /** Look-at point, metres, in the model's own frame. */
  target: [number, number, number];
}

export interface PxlPreset {
  id: PxlPresetId;
  /** Fallback label. The configurator prints a localised string instead. */
  label: string;
  desktop: PxlCameraState;
  /** Overrides applied at the mobile end of the range. */
  mobile: Partial<PxlCameraState>;
  /**
   * True for a preset with no authored composition of its own — it adopts
   * wherever the camera already is and stops re-resolving on resize. Exactly
   * one preset is derived, and it is FREE.
   */
  derived?: boolean;
}

/**
 * The vessel is 5.25 m long — 5.76 m with the outboard, which is what actually
 * has to fit in frame — and its origin is amidships on the waterline, so every
 * target below is a small offset from (0, 0, 0). Raising the target above the
 * waterline is what stops the boat sitting on the bottom edge of the frame with
 * a third of the viewport full of empty water.
 *
 * Distances are not eyeballed, and they are not pure arithmetic either.
 *
 * The starting value comes from how much of the frame the vessel should occupy
 * at that angle — W = (LOA·|cos az| + beam·|sin az|) / fill, and
 * d = W / (2·tan(hfov/2)). That gets each preset into the right postcode. It is
 * not enough to trust, because it treats the boat as a flat rectangle: under
 * perspective, at a three-quarter angle, the near end of a 5.76 m hull subtends
 * noticeably more than the formula allows for, and the profile view — the one
 * where the estimate is most nearly right — was the one that cropped the bow.
 *
 * So every number below was then *measured*: `pxlTelemetry` projects the
 * vessel's bounding box through the live camera each frame and reports the
 * fraction of the frame it covers and whether any of it left the viewport. The
 * comments record what each preset actually reads. Re-tuning one means moving
 * the number until the readout says what it should — which is also how a future
 * preset should be added.
 *
 * The mobile variants sit *further* back than the desktop ones despite framing
 * tighter, because they also drop to a longer lens. That is the whole point: a
 * short lens close in is what makes a hull look like a bath toy, and a phone is
 * exactly where the temptation to move closer is strongest.
 */
const HERO: PxlCameraState = {
  // The angle both delivered design renders were composed from: forward of
  // abeam, a little above the sheer, far enough out that the bow does not
  // distort. This is the shot the product is *known by*, and the one the
  // real-time model has to be judged against first.
  // Measured: 79% of frame width, no clipping. See `pxlTelemetry`.
  azimuth: 34, elevation: 12, distance: 14.1, hfov: 30, minVfov: 0, target: [0.15, 0.42, 0],
};

const HERO_MOBILE: Partial<PxlCameraState> = {
  azimuth: 30, elevation: 10, distance: 16.4, hfov: 26, minVfov: 0, target: [0.05, 0.38, 0],
};

export const PXL_PRESETS: readonly PxlPreset[] = [
  {
    id: "hero_3q",
    label: "Hero three-quarter",
    desktop: HERO,
    mobile: HERO_MOBILE,
  },
  {
    id: "side",
    label: "Profile",
    // Dead abeam, eye at roughly sheer height. The sheer line, the chine and
    // the stern moulding's rake all read true only from here, which makes this
    // the view design decisions get checked in.
    // Measured: 80% of frame width. The longest view on the boat, and the one
    // that clipped the bow at the first pass — see PHASE_2_5_REPORT.md.
    desktop: { azimuth: 0, elevation: 3, distance: 16.4, hfov: 27, minVfov: 0, target: [0, 0.40, 0] },
    mobile: { azimuth: 0, elevation: 2, distance: 19.0, hfov: 23, minVfov: 0, target: [0, 0.36, 0] },
  },
  {
    id: "bow_3q",
    label: "Bow quarter",
    // Well forward, low, to put the bow volume and the flare against the sky.
    // Measured: 77% of frame width.
    desktop: { azimuth: 62, elevation: 8, distance: 11.4, hfov: 30, minVfov: 0, target: [0.9, 0.34, 0] },
    mobile: { azimuth: 56, elevation: 7, distance: 12.9, hfov: 26, minVfov: 0, target: [0.75, 0.32, 0] },
  },
  {
    id: "stern_3q",
    label: "Stern quarter",
    // Aft and slightly high: the transom, the black moulding that carries the
    // PXL mark, and the outboard, which is the one component the hull colour
    // must visibly *not* affect.
    // Measured: 80% of frame width.
    desktop: { azimuth: -54, elevation: 14, distance: 11.9, hfov: 31, minVfov: 0, target: [-1.0, 0.44, 0] },
    mobile: { azimuth: -50, elevation: 13, distance: 13.4, hfov: 27, minVfov: 0, target: [-0.9, 0.42, 0] },
  },
  {
    id: "interior",
    label: "Cockpit",
    // High and forward of abeam, looking down into the boat. The only preset
    // that shows the liner, the sole and the console together.
    // Measured: 84% wide by 66% tall — the tightest of the six, because looking
    // down at a boat uses both axes of the frame.
    desktop: { azimuth: 40, elevation: 40, distance: 12.1, hfov: 34, minVfov: 29, target: [-0.2, 0.30, 0] },
    mobile: { azimuth: 36, elevation: 44, distance: 13.8, hfov: 30, minVfov: 29, target: [-0.2, 0.28, 0] },
  },
  {
    id: "detail",
    label: "Console detail",
    // Close on the helm. NOT EXPOSED IN THE CONFIGURATOR — see
    // PXL_CONFIGURATOR_VIEWS below for why.
    desktop: { azimuth: 26, elevation: 14, distance: 4.4, hfov: 30, minVfov: 0, target: [-0.55, 0.72, 0] },
    mobile: { azimuth: 24, elevation: 12, distance: 3.9, hfov: 27, minVfov: 0, target: [-0.55, 0.70, 0] },
  },
  {
    id: "free",
    label: "Free",
    // §13's FREE, and it is a *mode* rather than a shot: entering it adopts
    // wherever the viewer has already turned the boat and stops the camera
    // re-resolving an authored composition underneath them. The values below
    // are only the cold-start position — the boat someone gets if they land on
    // `?view=free` without having moved anything — and hero framing is the
    // right thing to be looking at in that case.
    desktop: HERO,
    mobile: HERO_MOBILE,
    derived: true,
  },
] as const;

export const PXL_PRESET_BY_ID = new Map(PXL_PRESETS.map((p) => [p.id, p]));
export const PXL_DEFAULT_PRESET: PxlPresetId = "hero_3q";

/**
 * The views the CONFIGURATOR offers, in order.
 *
 * A subset of the preset table, and the omission is the interesting part.
 * `detail` frames the helm console — which is geometry from the STL revision
 * and *not* what the colour studies show (see `PXL_CONSOLE_REVISION`). A close
 * shot is the one composition where that discrepancy is unmissable, so putting
 * it in a product-facing view selector would be showing a customer, at maximum
 * magnification, the part of the boat we know to be superseded. It stays in the
 * table because the development bench still wants it; §13 says not to expose a
 * detail view without a subject, and a subject we know to be wrong is worse
 * than none.
 */
export const PXL_CONFIGURATOR_VIEWS: readonly PxlPresetId[] = [
  "hero_3q",
  "side",
  "bow_3q",
  "stern_3q",
  "interior",
  "free",
] as const;

/**
 * The views offered as CONTROLS, as opposed to the views the camera can be in.
 *
 * FREE is in the list above because it is a state the camera reaches and the
 * interface has to be able to name — the moment someone drags the boat, no
 * authored composition is being held any more and saying "Three-quarter" would
 * be a lie. It is not in this list because it is not an instruction anybody
 * would give: "put me in free mode" is not a thing a customer wants, and a
 * button that appears to do nothing when pressed is worse than no button.
 *
 * So the rail renders these five, and none of them is selected while the
 * viewer has the camera. Choosing one is how you hand it back.
 *
 * Derived rather than written out, so a preset that is added as a mode rather
 * than a shot cannot accidentally become a chip.
 */
export const PXL_CONFIGURATOR_VIEW_CONTROLS: readonly PxlPresetId[] =
  PXL_CONFIGURATOR_VIEWS.filter((id) => !PXL_PRESET_BY_ID.get(id)?.derived);

/* ── Responsive resolution ─────────────────────────────────────────────────*/

/** Below this the mobile composition applies in full. */
export const MOBILE_MAX = 640;
/** Above this the desktop composition applies in full. */
export const DESKTOP_MIN = 1024;

/* ── Orbit ─────────────────────────────────────────────────────────────────*/

/**
 * How far a viewer may move the camera themselves.
 *
 * §19: premium product inspection, not a viewport. The polar limits stop short
 * of both poles so the boat can never appear upside down or be looked at
 * edge-on from directly overhead; the lower limit stays a few degrees above the
 * waterline so the camera cannot submerge; and the zoom range is bounded so the
 * vessel cannot be pushed into the near plane or lost in the distance.
 */
export const PXL_ORBIT_LIMITS = {
  minElevation: -4,
  maxElevation: 62,
  // Bracketing the authored range (4.4 m at the closest preset, 19.0 m at the
  // furthest) with about half a stop either side. Closer than 3.6 m and a
  // 5.76 m boat no longer fits at any angle; further than 26 m and it is a
  // detail in an empty room.
  minDistance: 3.6,
  maxDistance: 26,
  /** Metres the target may be nudged along the hull. Zero: it stays centred. */
  targetPan: 0,
} as const;

/**
 * Near and far planes.
 *
 * Near is 0.12 m rather than the hero's 0.4: the closest preset stands 3.9 m off
 * a boat that is 2 m wide, and an orbit that has been zoomed in and tipped over
 * can legitimately get within half a metre of the gunwale. Far is 400 m, which
 * is generous for a 5 m object and cheap — the depth precision that matters is
 * set by the *ratio*, and 0.12:400 is a comfortable one.
 */
export const PXL_NEAR = 0.12;
export const PXL_FAR = 400;
