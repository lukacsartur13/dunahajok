/**
 * THE REFERENCE PLATES, AS MEASUREMENTS.
 *
 * Phase 4.1 §2 promotes the delivered PXL renders from inspiration to product
 * reference, and §7 is explicit about what that has to mean in code: "Do not
 * place from memory." So every number in this file was read off a delivered
 * file by a script — `scripts/pxl/reference-qa.mjs` for the profile and the
 * dark band, `scripts/pxl/_mark.mjs` for the marks — and every one of them
 * carries the plate pixel it came from, so the next person can re-measure it
 * rather than trust it.
 *
 * IT IMPORTS NOTHING. Same reason `pxlPresets` and `pxlBranding` import
 * nothing: the calibration is the part worth asserting, `npm test` compiles the
 * pure modules and runs them on plain node, and a module that reaches for three
 * cannot be reached from there. `pxlModel` consumes these to author its mounts;
 * `pxlDecals` consumes those to place geometry.
 *
 * ── THE SIDE PLATE'S COORDINATE SYSTEM ─────────────────────────────────────
 *
 * `pxl-side-20240719.jpg` is the only delivered image that is a true profile —
 * the six colour studies are three-quarter views on water, where a hull's
 * apparent depth is a property of the lens. So it is the datum, and the mapping
 * between it and the model is two numbers:
 *
 *   model x = −LOA/2 + (plateX − TRANSOM_PX) / PX_PER_METRE
 *   model y = SHEER_Y − (plateY − SHEER_PX) / PX_PER_METRE
 *
 * `TRANSOM_PX` is NOT the aft-most pixel of the drawing, and the difference
 * matters enough to have cost a full measurement pass. The plate's stern rakes
 * hard: its aft-most extremity is a rubbing moulding some 790 mm abaft of where
 * the sheer ends. Aligning the plate's overall span to the model's LOA
 * therefore stretches the plate by the length of that rake and dumps the error
 * into DEPTH — the first pass reported the plate hull as 11% shallower than the
 * model, all of which was this. Aligning the two sheer termini instead brings
 * the hulls to within 2.6% on depth, 45 mm on the keel and 58 mm on the sheer,
 * which is the answer to §3's question: this is the same boat.
 */

/* ── The side plate ────────────────────────────────────────────────────────*/

export const PXL_SIDE_PLATE = {
  file: "assets/source/pxl/pxl-side-20240719.jpg",
  width: 3034,
  height: 1994,

  /**
   * Plate pixels per model metre, from the sheer-terminus alignment.
   * `scripts/pxl/reference-qa.mjs` prints this and the datums below.
   */
  pxPerMetre: 345.1,
  /** Column at which the plate's sheer ends — the transom, model x = −LOA/2. */
  transomPx: 699,
  /** Row of the plate's highest sheer — model y = the model's own sheer max. */
  sheerPx: 796,

  /**
   * Metres of stern moulding abaft the sheer terminus in the drawing.
   *
   * Recorded because the model does not have it: the delivered STL's transom is
   * vertical within 18 mm, and the drawing's rakes. It is the largest single
   * silhouette difference between the two and it is a GEOMETRY difference, so
   * §29 rules out papering over it — PXL_REFERENCE_QA.md carries it as the one
   * PARTIAL row that needs a revised source file rather than a code change.
   */
  sternRakeAftOfSheer: 0.774,
} as const;

/**
 * MEASURED AGREEMENT BETWEEN THE PLATE AND THE MODEL.
 *
 * Quoted in PXL_REFERENCE_QA.md and asserted by the configurator tests, so a
 * re-run of the asset pipeline that moved the hull would fail the build rather
 * than quietly invalidating a table in a document. Metres.
 */
export const PXL_PROFILE_AGREEMENT = {
  /** Sheer-to-keel at the deepest station. */
  depthPlate: 1.133,
  depthModel: 1.1634,
  /** Mean and worst absolute deviation of the sheer, over ten clear stations. */
  sheerMean: 0.0582,
  sheerMax: 0.1505,
  /** Mean and worst absolute deviation of the keel, over all twenty-one. */
  keelMean: 0.0452,
  keelMax: 0.0798,
  /**
   * Where the dark lower treatment's upper edge falls, as a fraction of the
   * local sheer-to-keel depth. §14's "exact perceived height", both sources.
   *
   * The two agree on the AVERAGE almost exactly — 71.4% against 72.1% — and
   * disagree by about 100 mm station by station over the aft half, where the
   * drawing's edge sits higher than the model's. That is the model's own chine:
   * `pxl_zones.py` splits the hull on the designer's crease rather than on a
   * threshold, so the boundary the configurator draws is the moulding line the
   * STL actually contains. Moving it to match the drawing would replace a
   * designed edge with a painted guess, which is the opposite of what §14 asks
   * for, so the 100 mm is documented rather than tuned away.
   */
  bandFractionPlate: 0.714,
  bandFractionModel: 0.721,
  bandMeanDeviation: 0.1107,
} as const;

/* ── The three marks ──────────────────────────────────────────────────────*/

/**
 * A mark's footprint on the side plate, in plate pixels.
 *
 * Stored as the pixel box rather than as model metres so that the measurement
 * and the derivation stay separate: the box is what a script read off the file
 * and can re-read; the metres are arithmetic on it, and `pxlModel` does that
 * arithmetic where the mount is authored. A number that is both a measurement
 * and a derived value is a number nobody can check.
 */
export interface PxlPlateBox {
  /** Left, right, top, bottom in plate pixels. Inclusive. */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/**
 * §8's fidelity pass, as the numbers it produced.
 *
 * The orange lockup on the black stern panel, isolated by hue: r > 150,
 * r − b > 70, in the stern quadrant. 889 pixels, and its mean colour is
 * #d6703c — which is where `PXL_INK_LIGHT` comes from and why it is not simply
 * the rails' own cognac.
 *
 * WHAT THIS CHANGED. Phase Four authored the mark at a 92 mm cap height, two
 * thirds of the way forward along the panel and a little above its mid-height.
 * Measured, it is a 55 mm cap height, 51% across the panel and 45% down it — so
 * the mark was 67% too large and 111 mm too high. §8 asks not to accept "inside
 * the panel" as sufficient, and that is exactly the error it was describing.
 */
export const PXL_MARK_PLATE: PxlPlateBox = { x0: 622, x1: 721, y0: 942, y1: 960 };

/** The mean ink colour of the lockup in the delivered plate. */
export const PXL_MARK_PLATE_INK = "#d6703c";

/**
 * The stern panel the mark sits on, per row, in plate pixels.
 *
 * Measured rather than assumed because the panel is a parallelogram raking aft
 * as it descends — 1.41 px aft per px down, about 55° off vertical — so "half
 * way across the panel" is a different column at every height. Two rows are
 * enough to define it: the fractions in `PXL_MARK_ON_PANEL` are taken against
 * the interpolated span at the mark's own row.
 */
export const PXL_STERN_PANEL_PLATE = {
  /** Topmost and bottommost rows at which the panel's outer face is visible. */
  top: 865,
  bottom: 1055,
  /** Aft and forward edge at the mark's own row (951). */
  aftAtMark: 565,
  forwardAtMark: 774,
} as const;

/**
 * Where the mark sits within the panel, as fractions of the panel's own extent.
 *
 * THE FRACTIONS ARE THE PLACEMENT, NOT THE PIXELS. A pixel box is a fact about
 * one drawing at one scale; a fraction of the part the mark is printed on
 * survives the model being re-exported, the panel being re-cut, or the boat
 * being scaled — which is the whole reason §7 asks for placement to be derived
 * from geometry rather than remembered.
 */
export const PXL_MARK_ON_PANEL = {
  /** Across the panel from its aft edge, at the mark's own height. */
  across: 0.509,
  /** Down the panel from its top edge. */
  down: 0.453,
  /** Cap height as a fraction of the panel's visible height. */
  capHeight: 0.100,
} as const;

/**
 * THE DUNA SCRIPT'S FOOTPRINT. §4, §7 — and the reason the slot is no longer
 * empty.
 *
 * 146 × 27 plate pixels on the gunwale capping, just aft of amidships. At
 * 345.1 px/m that is 423 mm long and 78 mm tall, centred at model x +0.213,
 * y 0.785 — which the capping's own raycast confirms is on its outer face: the
 * dark strip the drawing prints the script on runs from y 0.740 to y 0.879 at
 * that station, and the model's `hull_accent` outer face spans very nearly the
 * same band.
 */
export const PXL_DUNA_PLATE: PxlPlateBox = { x0: 1606, x1: 1752, y0: 837, y1: 864 };

/**
 * The capping's visible dark band at the script's station, in plate rows.
 *
 * Measured at five columns across the mark (1560–1820) and consistent to within
 * six rows, which is what makes it a band rather than a shadow. The script's
 * 27 rows sit inside its 48, with roughly a third of the band clear above and
 * below — the proportion §4 asks be reproduced.
 */
export const PXL_DUNA_BAND_PLATE = { top: 818, bottom: 866 } as const;

/**
 * THE PLEXI MARK. §9, §10.
 *
 * Measured on `pxl-colours-02.jpg` rather than on the side plate, and the
 * reason is not convenience: in the profile drawing the screen is edge-on and
 * the mark is four pixels of grey, while every one of the six water studies
 * shows it square-on at usable size. The colour studies are all the same base
 * render recoloured, so the mark is in the same place in all six and the
 * measurement is corroborated six times.
 *
 * The numbers are therefore expressed as FRACTIONS OF THE SCREEN'S OWN FACE
 * rather than as plate pixels — a three-quarter view cannot give a metric
 * length along the screen, but it gives a proportion perfectly well, and a
 * proportion is what a decal placement needs.
 */
export const PXL_PLEXI_MARK = {
  file: "assets/source/pxl/pxl-colours-02.jpg",
  /**
   * Across the screen's face from its forward edge, to the mark's centre.
   *
   * RE-CENTRED IN PHASE 4.3. 0.62 was calibrated against the flat runtime
   * screen, whose whole face was flat. The rebuilt plexi wraps: its front face
   * is 0.38 m across the beam but only the middle 0.21 m is flat, the rest
   * being the two corner radii turning aft. An off-centre mark ran onto the
   * starboard radius and the last letter bent away from the camera — visible in
   * the very first `detail` frame of the rebuild.
   */
  across: 0.50,
  /** Down the screen's face from its top edge, to the mark's centre. */
  down: 0.55,
  /**
   * Cap height as a fraction of the screen's own height.
   *
   * REDUCED WITH THE RE-CENTRING, AND FOR THE SAME REASON. At 0.20 the lockup
   * resolves to 0.253 m on this screen, which is wider than the flat middle it
   * has to sit inside. 0.15 puts it at 0.184 m with 13 mm of flat glass either
   * side, so the mark stays on one plane at every camera angle — which is what
   * §9 actually asks for.
   */
  capHeight: 0.15,
  /**
   * The mark reads as a light grey rather than as the cognac.
   *
   * §12 rules out an outline, a shadow and a glow, so contrast has to come from
   * the ink alone — and on a dark tinted screen the cognac is barely separable
   * while a cool light grey reads cleanly without becoming a white sticker.
   * That is what the studies show and it is what is implemented.
   */
  ink: "#c9d2d8",
} as const;

/* ── The screen itself ────────────────────────────────────────────────────*/

/**
 * THE WINDSCREEN, AS THE DRAWING DIMENSIONS IT.
 *
 * §9 requires the plexi mark, the mark requires a plexi, and the delivered STL
 * does not contain one — `PXL_UNSUPPORTED_CHANNELS.glazing` has recorded that
 * since Phase Four. §29 forbids replacing accurate geometry with generic
 * geometry; it does not forbid adding geometry that is missing, and §34 is
 * explicit that a PXL-specific implementation beats a generic component when
 * accuracy is at stake. So the screen is authored, here, from the drawing.
 *
 * MEASURED OFF THE SIDE PLATE'S SCREEN, IN THE CONSOLE'S OWN TERMS. The plate
 * shows a raked screen standing on the console's top edge, its top edge running
 * aft as it rises at very nearly the console's own rake. Both are expressed
 * relative to `console_body`'s measured bounding box rather than as world
 * coordinates, so a revised console — `PXL_CONSOLE_PRODUCTION`, when it comes —
 * carries the screen with it instead of leaving it floating where the old one
 * used to be.
 */
export const PXL_SCREEN = {
  /**
   * Height, as a fraction of the console's own height.
   *
   * The plate's screen measures 101 plate rows at its forward edge and 93 at its
   * aft one — 0.29 m and 0.27 m — over a console this model measures at 0.756 m.
   * 0.37 puts it at 0.280 m, between the two.
   */
  height: 0.37,
  /** Width, as a fraction of the console's beam. Narrower than the box. */
  width: 0.86,
  /**
   * Rake aft from vertical, degrees.
   *
   * MEASURED, AND SMALLER THAN IT LOOKS. The console's own forward face rakes
   * 14.7° — rays fired at it from the bow put its surface at x −0.994 at y 0.50
   * and x −1.138 at y 1.05 — and the obvious move is to give the screen the same
   * angle so the two read as one plane. The plate says otherwise: its screen's
   * forward post falls 5.8 plate pixels over 101, which is 3.3°, and its aft post
   * leans the other way. The screen is very nearly upright and the console is
   * not. 4° is the plate's own figure, rounded.
   */
  rake: 4,
  /** Corner radius as a fraction of the screen's height. */
  radius: 0.16,
  /** Frame depth, metres. The dark surround the drawing shows on three sides. */
  frame: 0.020,
  /** Glass thickness, metres. Plexi at this size is 8–10 mm. */
  thickness: 0.009,
} as const;

/**
 * WHERE THE PLATES DISAGREE WITH EACH OTHER, AND WITH THE MODEL. §17.
 *
 * §17 asks for the console to be compared against the references and for any
 * mismatch to be documented precisely rather than fixed by moving geometry. The
 * comparison turned up something the phase brief did not anticipate: THE PLATES
 * DO NOT AGREE AMONG THEMSELVES.
 *
 * Measured as a fraction of LOA from the transom, the helm console sits at:
 *
 *   pxl-side-20240719  (July)    u ≈ 0.47 – 0.55
 *   pxl-views-20240815 (August)  u ≈ 0.25 – 0.35
 *   the delivered STL             u = 0.240 – 0.317
 *
 * So the July profile drawing puts the console very nearly amidships, and the
 * August views sheet moves it aft by about a fifth of the boat's length — a
 * metre and a bit — into a layout with a long open cockpit forward of the helm.
 * The STL agrees with August to within 30 mm.
 *
 * THE MODEL IS THEREFORE NOT WRONG ABOUT THIS, and it matters because the
 * opposite conclusion was very nearly reached: measured against the July plate
 * alone the console looks 1.2 m out of place, which is exactly the kind of
 * finding that gets "fixed" by dragging geometry. What the August sheet and the
 * STL agree on is the current design; the July plate is a superseded revision,
 * and it is still the right source for the hull profile — which the two plates
 * do agree about — and for the two hull marks, which are in the same place in
 * both.
 *
 * The console's SHAPE is a separate question and still an open one; see
 * `PXL_CONSOLE_REVISION`. This constant only settles where it sits.
 */
export const PXL_CONSOLE_STATION = {
  /** Fraction of LOA from the transom, in each source. */
  julyPlate: [0.47, 0.55],
  augustPlate: [0.25, 0.35],
  model: [0.240, 0.317],
  /** Which the model follows. */
  follows: "pxl-views-20240815c.jpg",
} as const;

/* ── Reference compositions ───────────────────────────────────────────────*/

/**
 * WHICH PLATE EACH REFERENCE CAMERA IS FOR. §20, §21.
 *
 * The pairing is data because the comparison mode has to offer it: a developer
 * picks a plate and the camera that matches it, and nothing in a component
 * should know that the stern three-quarter shot lives in the lower right of the
 * views sheet.
 *
 * `crop` is the plate's own region for that view, as fractions of the file, so
 * the overlay can show the relevant part of a multi-view sheet rather than the
 * whole sheet. Measured on the delivered files.
 */
export interface PxlReferencePlate {
  id: string;
  /** Repository path of the DELIVERED file every number here was measured on. */
  file: string;
  /** The camera preset authored to match it. */
  preset: string;
  /** Region of the file this view occupies: x, y, width, height, fractions. */
  crop: readonly [number, number, number, number];
  /** What a developer is meant to be checking in this pairing. */
  checks: string;
  /**
   * The PUBLIC derivative the comparison bench actually loads.
   *
   * NOT `file`. An earlier draft of this interface said the delivered plates
   * were "copied into public/media/pxl/reference/ at build", and Phase 4.1
   * deliberately did not build that step: `next.config.ts` exports this site
   * statically to GitHub Pages, so anything under `public/` is a URL on the open
   * web, and §31 keeps the PXL unpublished. Copying six full-resolution
   * unreleased design renders there to serve a development tool would publish
   * the product by the back door.
   *
   * The derivatives in `PXL_MEDIA` are the same renders, cropped and reduced,
   * and they are ALREADY public — Phase Four ships them as the configurator's
   * no-WebGL fallback. Using them adds no exposure that does not already exist.
   *
   * The cost is that `crop` above does not apply to them: they are pre-cropped
   * by `build-pxl-media.mjs` on its own fractions. That is what `calibration`
   * is for, and why the bench has nudge controls — see PxlReferenceBench.
   */
  media: string;
  /**
   * Where the derivative sits under the live frame, as authored starting values.
   *
   * `scale` is the plate's width as a fraction of the frame's; `x`/`y` offset
   * its centre, in fractions of the frame. Authored by eye against a rendered
   * frame and then recorded, which is exactly what §22 asks for: alignment by
   * authored calibration, never by distorting the model to make one screenshot
   * agree.
   */
  calibration: { scale: number; x: number; y: number };
}

export const PXL_REFERENCE_PLATES: readonly PxlReferencePlate[] = [
  {
    id: "side",
    file: "assets/source/pxl/pxl-side-20240719.jpg",
    preset: "reference_side",
    crop: [0.10, 0.24, 0.78, 0.36],
    checks:
      "silhouette, sheer, bow, stern rake, the dark lower treatment's edge, " +
      "the Duna script and the PXL hull mark",
    media: "pxl-hero-side",
    calibration: { scale: 0.98, x: 0, y: 0.01 },
  },
  {
    id: "top_3q",
    file: "assets/source/pxl/pxl-views-20240815c.jpg",
    preset: "reference_top_3q",
    crop: [0.03, 0.38, 0.60, 0.58],
    checks: "cockpit layout, interior colour distribution, rails, console mass",
    /* The whole views sheet. The bench shows it uncropped and the developer
       nudges to the quadrant, because the sheet's three views are at three
       different scales and a single authored crop would be right for one. */
    media: "pxl-views",
    calibration: { scale: 1.6, x: -0.16, y: 0.12 },
  },
  {
    id: "stern_3q",
    file: "assets/source/pxl/pxl-views-20240815c.jpg",
    preset: "reference_stern_3q",
    crop: [0.58, 0.36, 0.42, 0.42],
    checks: "transom, motor scale, the PXL hull mark from aft, rail geometry",
    media: "pxl-views",
    calibration: { scale: 1.9, x: 0.34, y: 0.1 },
  },
  {
    id: "water_side",
    file: "assets/source/pxl/pxl-colours-02.jpg",
    preset: "reference_water_side",
    crop: [0.05, 0.02, 0.90, 0.46],
    checks:
      "flotation line, hull attitude, finish response, the plexi mark, and the " +
      "relationship of the black lower section to the water",
    /* THE ONE PLATE THAT FOLLOWS THE CONFIGURATION. There is a delivered water
       study per exterior finish, so the bench swaps this for the study matching
       the finish on screen — which is what makes §27's material comparison a
       comparison rather than a look. See `plateMediaId`. */
    media: "pxl-water-sage",
    calibration: { scale: 1.0, x: 0, y: 0 },
  },
] as const;

/**
 * The public derivative to show for a plate, given the finish on screen.
 *
 * Only `water_side` varies: the studies are one render per colour, and comparing
 * a navy hull against the sage study would be comparing two different questions.
 * Every other plate is a single delivered view and ignores the finish.
 */
export function plateMediaId(plateId: string, finishSlug: string): string {
  if (plateId !== "water_side") {
    return PXL_REFERENCE_PLATE_BY_ID.get(plateId)?.media ?? "pxl-hero-side";
  }
  return `pxl-water-${finishSlug}`;
}

export const PXL_REFERENCE_PLATE_BY_ID = new Map(
  PXL_REFERENCE_PLATES.map((p) => [p.id, p]),
);
