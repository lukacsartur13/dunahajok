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
  | "detail"
  /**
   * PHASE 4.1 §20 — THE REFERENCE COMPOSITIONS.
   *
   * Four presets that exist to be compared against a delivered plate rather
   * than to be offered to a customer. They are internal ids and they stay
   * internal: `PXL_CONFIGURATOR_VIEWS` does not list them, so the product's
   * view rail is unchanged and its labels stay simple — which is what §20 asks
   * for in as many words.
   *
   * They are not duplicates of the customer-facing shots. `side` is composed to
   * make a hull LOOK RIGHT in a configurator: eye at sheer height, a long lens,
   * the boat filling 80% of the frame. `reference_side` is composed to MATCH A
   * DRAWING: the drawing is very nearly orthographic, so the preset uses the
   * longest lens and the greatest stand-off the orbit allows and puts the eye on
   * the plate's own horizon. The difference between them is the difference
   * between a photograph and a measurement.
   */
  | "reference_side"
  | "reference_top_3q"
  /** PHASE 4.4 §6 — the plan. The only view a capping's width can be read in. */
  | "reference_plan"
  | "reference_stern_3q"
  | "reference_water_side";

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
  /* ── The reference compositions. §20. ─────────────────────────────────────
     Every one of these is authored against a specific delivered plate, named in
     `PXL_REFERENCE_PLATES`, and the numbers are chosen to reproduce THAT
     IMAGE'S geometry rather than to look good. Where a preset's distance is
     unusually large it is not a mistake: a design render drawn nearly
     orthographically can only be matched by a long lens far away, and matching
     it is the entire purpose. */
  {
    id: "reference_side",
    label: "Reference — profile",
    // `pxl-side-20240719.jpg`. Dead abeam and as close to orthographic as the
    // orbit's 26 m limit allows: at 24 m on a 14° lens the near and far ends of
    // a 5.25 m hull differ in scale by under 6%, which is inside the drawing's
    // own line weight. The eye sits a little above the waterline because the
    // drawing does — its keel line is visible for the full length.
    desktop: { azimuth: 0, elevation: 2.5, distance: 24, hfov: 14, minVfov: 0, target: [0, 0.36, 0] },
    mobile: { azimuth: 0, elevation: 2.5, distance: 24, hfov: 13, minVfov: 0, target: [0, 0.34, 0] },
  },
  {
    id: "reference_top_3q",
    label: "Reference — cockpit three-quarter",
    // The lower-left view of `pxl-views-20240815c.jpg`: high, well forward of
    // abeam, looking down into the open cockpit with the transom in frame. The
    // elevation is what the sheet shows rather than what flatters the boat —
    // 34° puts the sole and the liner in view together without foreshortening
    // the hull into a plan.
    desktop: { azimuth: 48, elevation: 34, distance: 13.4, hfov: 30, minVfov: 26, target: [-0.35, 0.30, 0] },
    mobile: { azimuth: 44, elevation: 38, distance: 15.0, hfov: 27, minVfov: 26, target: [-0.35, 0.28, 0] },
  },
  {
    id: "reference_plan",
    label: "Reference — plan",
    /* PHASE 4.4, §6 and §34. THE VIEW THE PHASE IS JUDGED IN.
       §6: "the current model was previously validated heavily from the side.
       That is no longer sufficient." A capping's width is invisible in profile
       and nearly invisible in a three-quarter — the one composition that shows
       it is looking straight down, where the top perimeter is a band with two
       edges and both of them can be measured against the reference's.
       Nearly orthographic for the same reason `reference_side` is: at 26 m on
       a 13° lens the bow and the stern of a 5.25 m hull differ in scale by
       under 6%, so the plan outline is an outline rather than a perspective. */
    // Measured: 80% of frame width, the whole boat inside it. `minVfov` is 0
    // rather than the interior presets' 26–30: those look down at a boat that
    // still has height, and this one does not — the beam is 2.09 m against a
    // 5.25 m length, so the long axis is the only one that needs framing and a
    // vertical floor here only pushes the camera back until the boat is a chip.
    desktop: { azimuth: 0, elevation: 88, distance: 26, hfov: 13.4, minVfov: 0, target: [0, 0.55, 0] },
    mobile: { azimuth: 0, elevation: 88, distance: 26, hfov: 13.4, minVfov: 0, target: [0, 0.55, 0] },
  },
  {
    id: "reference_stern_3q",
    label: "Reference — stern three-quarter",
    // The right-hand view of the same sheet: aft and low, with the drive, the
    // transom and the hull mark all in frame. Lower than the customer-facing
    // `stern_3q`, because the sheet is drawn from close to the water and the
    // motor's proportions read differently from above it.
    desktop: { azimuth: -58, elevation: 8, distance: 12.6, hfov: 28, minVfov: 0, target: [-1.15, 0.40, 0] },
    mobile: { azimuth: -54, elevation: 8, distance: 14.1, hfov: 25, minVfov: 0, target: [-1.05, 0.38, 0] },
  },
  {
    id: "reference_water_side",
    label: "Reference — on the water",
    // The six colour studies. All of them are the same base render: a shallow
    // bow-forward three-quarter from very slightly above the sheer, far enough
    // out that the hull side is almost a true profile while the foredeck is
    // still visible. This is the composition the FINISHES were graded in, so it
    // is the one a material judgement should be made in — and it is the only
    // reference preset the water backdrop is worth turning on for.
    desktop: { azimuth: 22, elevation: 6, distance: 18.6, hfov: 21, minVfov: 0, target: [0.1, 0.34, 0] },
    mobile: { azimuth: 20, elevation: 6, distance: 20.4, hfov: 19, minVfov: 0, target: [0.05, 0.32, 0] },
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
/**
 * Every preset a CUSTOMER-FACING surface may hold or name. §31.
 *
 * The reference compositions exist to be compared against a delivered drawing,
 * and §31 keeps every part of this phase's QA work off customer surfaces. This
 * type is that rule made structural rather than merely tested: `views` in the
 * locale table is keyed on it, the configurator's rail is typed with it, and a
 * reference camera added to either is a compile error rather than a thing a
 * reviewer has to spot.
 */
export type PxlCustomerPresetId = Exclude<PxlPresetId, `reference_${string}`>;

export const PXL_CONFIGURATOR_VIEWS: readonly PxlCustomerPresetId[] = [
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
export const PXL_CONFIGURATOR_VIEW_CONTROLS: readonly PxlCustomerPresetId[] =
  PXL_CONFIGURATOR_VIEWS.filter((id) => !PXL_PRESET_BY_ID.get(id)?.derived);

/**
 * THE REFERENCE COMPOSITIONS, AS A LIST THE QA SURFACES CAN ITERATE. §20, §21.
 *
 * Derived from the preset table by name rather than written out, so a fifth
 * reference camera appears in the comparison mode by being declared above. It is
 * deliberately DISJOINT from `PXL_CONFIGURATOR_VIEWS`: nothing a customer can
 * reach may end up here and nothing here may end up in the product's view rail,
 * and the configurator tests assert exactly that. §31 is the reason — these
 * presets exist to show a developer how far the model is from a drawing, and a
 * customer-facing control that framed the boat for measurement rather than for
 * looking at would be a strange thing to ship.
 */
export const PXL_REFERENCE_VIEWS: readonly PxlPresetId[] = PXL_PRESETS
  .map((p) => p.id)
  .filter((id) => id.startsWith("reference_"));

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

/* ── Subject compositions ──────────────────────────────────────────────────*/

/**
 * WHAT THE CAMERA SHOWS WHILE A DECISION IS BEING MADE.
 *
 * A composition per CONTROL, keyed on the control's own `labelKey` — the same
 * key `pxlStrings.controls` and `pxlStrings.controlNotes` use, so a control
 * gains a shot by being named rather than by anything being wired.
 *
 * NOT PRESETS, AND DELIBERATELY OUTSIDE `PxlPresetId`. A preset is a place the
 * camera can be PUT, by a person, from a rail of named views; these are places
 * the camera GOES on its own while the interface explains something. Keeping
 * them out of the union is what stops them appearing in the view rail, needing
 * localised names in `views`, or being reachable from a URL — and it is why
 * `PxlCustomerPresetId` did not have to change to add thirteen of them.
 *
 * COMPOSED FOR THE PART, NOT FOR THE BOAT. The six product presets all frame
 * the whole vessel, because that is what a product shot is. These frame the
 * surface the control repaints: the target sits on it, the distance is what
 * puts it across the frame, and the azimuth is the angle it is actually
 * legible from — a windscreen tint read from abeam is a dark line, and read
 * from forward of the bow it is a sheet of glass.
 *
 * THE EYE STAYS ABOVE THE WATER in every one of them. The lowest is the
 * waterline shot, whose whole point is a low eye: 1.5° at 12.5 m off a target
 * 0.30 m up puts it at 0.63 m, which is a person standing in a tender rather
 * than a diver.
 *
 * The mobile variants sit further back on a longer lens, for the reason the
 * product presets do: a short lens close in is what makes a hull look like a
 * bath toy, and a phone is where the temptation to move closer is strongest.
 */
export interface PxlSubjectShot {
  desktop: PxlCameraState;
  mobile: Partial<PxlCameraState>;
}

export const PXL_SUBJECT_SHOTS: Readonly<Record<string, PxlSubjectShot>> = {
  /* EXTERIOR. The subject is the whole boat, so this is the hero shot moved
     a little — closer and a few degrees round, enough that arriving at the
     section reads as an arrival rather than as nothing happening. */
  exteriorFinish: {
    desktop: { azimuth: 40, elevation: 13, distance: 13.0, hfov: 30, minVfov: 0, target: [0.15, 0.42, 0] },
    mobile: { azimuth: 34, elevation: 11, distance: 15.2, hfov: 26, minVfov: 0, target: [0.05, 0.38, 0] },
  },
  /* HULL. Where the topsides colour stops is a line along the hull, and a line
     is only a line from abeam. Low, because the boundary sits under the turn
     of the bilge and an eye above the sheer looks straight over it. */
  lowerTreatment: {
    // Measured the way the product presets are: W = 2·d·tan(hfov/2) against
    // the 5.76 m the boat subtends dead abeam. 12.5 m put that at 102% and cut
    // the bow off — the tightest angle on the boat is the one where the
    // arithmetic is least forgiving. 14.8 reads 86%.
    desktop: { azimuth: 4, elevation: 1.5, distance: 14.8, hfov: 26, minVfov: 0, target: [0, 0.30, 0] },
    mobile: { azimuth: 3, elevation: 1.5, distance: 17.2, hfov: 22, minVfov: 0, target: [0, 0.28, 0] },
  },

  /* INTERIOR. Five controls, five places to stand. */
  interiorPrimary: {
    // Down into the cockpit, closer than the `interior` preset: the subject is
    // the leather, and the leather is four cushions that have to be readable.
    // 92% of frame width: closer than the `interior` preset's 84%, and short
    // of the crop — a cockpit shot may lose the very ends of the boat, but
    // losing them by two per cent looks like an accident rather than a choice.
    desktop: { azimuth: 44, elevation: 44, distance: 10.6, hfov: 32, minVfov: 29, target: [-0.30, 0.35, 0] },
    mobile: { azimuth: 38, elevation: 47, distance: 12.3, hfov: 28, minVfov: 29, target: [-0.30, 0.32, 0] },
  },
  interiorSecondary: {
    // The console's aft panel, from forward of abeam and above — the angle the
    // panel faces, rather than the angle the helm is used from.
    desktop: { azimuth: 54, elevation: 24, distance: 6.4, hfov: 26, minVfov: 24, target: [-1.05, 0.78, 0] },
    mobile: { azimuth: 48, elevation: 26, distance: 7.6, hfov: 23, minVfov: 24, target: [-1.05, 0.75, 0] },
  },
  interiorSurface: {
    // Smooth against grained is a grazing-light difference, so the eye comes
    // down toward the moulding rather than looking onto it from above.
    desktop: { azimuth: 46, elevation: 30, distance: 7.0, hfov: 27, minVfov: 26, target: [-0.20, 0.58, 0] },
    mobile: { azimuth: 40, elevation: 33, distance: 8.2, hfov: 24, minVfov: 26, target: [-0.20, 0.55, 0] },
  },
  glazingTint: {
    // From forward and slightly above, which is the one place the screen is a
    // sheet of glass with a tint in it rather than a dark edge-on line.
    // Pulled back from 5.6: at that stand-off the screen was centre-frame and
    // the boat around it was gone, which reads as a photograph of a windscreen
    // rather than a windscreen on this boat.
    desktop: { azimuth: 62, elevation: 20, distance: 6.8, hfov: 25, minVfov: 24, target: [-1.15, 1.00, 0] },
    mobile: { azimuth: 56, elevation: 22, distance: 7.9, hfov: 22, minVfov: 24, target: [-1.15, 0.98, 0] },
  },
  railTreatment: {
    // Along the side deck rather than across it: the rails are a run of tube,
    // and a run reads as a run only when the eye is nearly on its line.
    desktop: { azimuth: 24, elevation: 13, distance: 8.6, hfov: 26, minVfov: 0, target: [-0.95, 0.84, 0] },
    mobile: { azimuth: 20, elevation: 14, distance: 10.0, hfov: 23, minVfov: 0, target: [-0.95, 0.82, 0] },
  },

  /* PROPULSION. Aft, low, and off the quarter — the angle a drive's own
     proportions read from, which is the only thing these proxies claim. */
  propulsion: {
    desktop: { azimuth: -62, elevation: 11, distance: 7.6, hfov: 28, minVfov: 0, target: [-2.30, 0.42, 0] },
    mobile: { azimuth: -56, elevation: 12, distance: 8.9, hfov: 24, minVfov: 0, target: [-2.30, 0.40, 0] },
  },

  /* EQUIPMENT. Each option is a part appearing or disappearing, so the camera
     stands where that part is — an option that toggles off-screen is an option
     the viewer has to take on trust. */
  boardingPlatform: {
    desktop: { azimuth: -56, elevation: 20, distance: 7.2, hfov: 28, minVfov: 0, target: [-2.60, 0.32, 0] },
    mobile: { azimuth: -50, elevation: 22, distance: 8.4, hfov: 24, minVfov: 0, target: [-2.60, 0.30, 0] },
  },
  bimini: {
    // The one option that adds height, so this is the one shot that has to
    // stand back: a top 1.9 m over the waterline needs the frame a whole boat
    // needs, and cropping it would be cropping the thing being chosen.
    desktop: { azimuth: -38, elevation: 19, distance: 11.8, hfov: 30, minVfov: 0, target: [-1.30, 1.00, 0] },
    mobile: { azimuth: -34, elevation: 20, distance: 13.7, hfov: 26, minVfov: 0, target: [-1.30, 0.96, 0] },
  },
  coolBox: {
    desktop: { azimuth: 50, elevation: 34, distance: 5.8, hfov: 26, minVfov: 26, target: [-0.66, 0.52, 0] },
    mobile: { azimuth: 44, elevation: 37, distance: 6.8, hfov: 23, minVfov: 26, target: [-0.66, 0.50, 0] },
  },
  audio: {
    desktop: { azimuth: 32, elevation: 26, distance: 6.4, hfov: 26, minVfov: 25, target: [-0.30, 0.60, 0] },
    mobile: { azimuth: 28, elevation: 28, distance: 7.5, hfov: 23, minVfov: 25, target: [-0.30, 0.58, 0] },
  },
  speakerLight: {
    // Closer and lower than the speakers themselves: a lit ring is read off
    // the grazing angle, and from above it is a bright dot.
    desktop: { azimuth: 27, elevation: 17, distance: 5.6, hfov: 24, minVfov: 24, target: [-0.30, 0.62, 0] },
    mobile: { azimuth: 24, elevation: 18, distance: 6.6, hfov: 21, minVfov: 24, target: [-0.30, 0.60, 0] },
  },
};
