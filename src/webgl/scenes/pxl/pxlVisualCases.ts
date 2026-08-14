/**
 * WHAT A CONFIGURATION CHANGE HAS TO LOOK LIKE.  PHASE 4.3, §36.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 *
 * §36 is written from a specific failure. Phase 4.1 shipped three interior
 * finishes that rendered to identical pixels: the schema was valid, the URL
 * round-tripped, `npm test` was green at 1,800 checks, and the boat ignored the
 * control. The zone the finishes were addressed to was not the zone the mesh
 * drew with, and no state test can see that — a state test asks what the store
 * holds, and the store held the right thing.
 *
 * The only assertion that could have caught it is "these two configurations
 * must not produce the same image". So that is what this file declares, and
 * §36 is explicit about the failure condition: a pixel diff of zero must fail.
 *
 * ── WHY THE CASES ARE DATA AND THE COMPARISON IS NOT ──────────────────────
 *
 * Rendering needs a GPU. `npm test` runs on plain node against the pure module
 * set and has no renderer, and adding one would make the fastest check in this
 * project the slowest. Splitting it is what keeps both halves honest:
 *
 *   • THIS FILE is data, imports nothing, and is asserted by `npm test` —
 *     every §36 case is present, names two genuinely different configurations
 *     and declares a threshold. A case cannot be quietly deleted.
 *   • THE COMPARISON runs in the browser, through `window.__pxlQa.visual()`,
 *     which draws both frames deterministically and counts differing pixels.
 *     Its results are recorded in PXL_REFERENCE_QA.md with the build they came
 *     from.
 *
 * ── WHAT THE THRESHOLD MEANS ──────────────────────────────────────────────
 *
 * `minChanged` is the fraction of the frame's pixels that must differ by more
 * than `TOLERANCE` per channel. It is not "greater than zero": an anti-aliasing
 * difference of a few dozen pixels along one edge would satisfy that and would
 * still be a boat ignoring its own configurator.
 *
 * The numbers are floors, set well under what each change actually produces so
 * that a legitimate re-composition of a camera does not break them, and well
 * over what noise produces. They are calibrated against a measured run, and the
 * measured values are in the QA document beside them.
 *
 * ── THE FIRST RUN FAILED, WHICH IS THE ARGUMENT FOR THE WHOLE FILE ────────
 *
 * Both drive cases returned a diff of EXACTLY zero on the first execution. The
 * cause was in the cases rather than in the boat — they were written against
 * `?drive=…` and the parameter is `?propulsion=…`, so `parseConfiguration`
 * discarded the value and both frames drew the default standard drive.
 *
 * That is worth recording rather than quietly fixing, because it is the same
 * shape as the defect §36 exists to catch: a configuration that is syntactically
 * fine, parses without error, and produces no change on screen. The difference
 * is that this time something was looking.
 */

/** How far a channel must move for a pixel to count as changed, 0–255. */
export const PXL_VISUAL_TOLERANCE = 6;

export interface PxlVisualCase {
  id: string;
  /** Which §36 requirement this is. */
  requirement: string;
  /** The camera both frames are drawn from. */
  camera: string;
  /** Two configurator query strings. */
  a: string;
  b: string;
  /** Minimum fraction of the frame that must differ, 0–1. */
  minChanged: number;
  /** What a viewer should actually see change. */
  expect: string;
}

export const PXL_VISUAL_CASES: readonly PxlVisualCase[] = [
  {
    id: "exterior-sage-vs-navy",
    requirement: "default vs navy",
    camera: "reference_side",
    a: "",
    b: "exterior=navy",
    /* The topsides and the liner together are most of the frame's boat. */
    minChanged: 0.06,
    expect: "topsides, cockpit liner and console panel all take the navy",
  },
  {
    id: "lower-dark-vs-body",
    requirement: "default vs full-body lower treatment",
    camera: "reference_side",
    a: "lower=dark",
    b: "lower=body",
    /* The bottom is a smaller share of the frame than the topsides, and the
       change is black → sage rather than one colour to another, so this is the
       highest-contrast case in the list over the smallest area. */
    minChanged: 0.02,
    expect: "the hull bottom leaves black and takes the topsides finish; the " +
      "stern moulding does NOT, so the PXL mark keeps its ground",
  },
  {
    id: "interior-cognac-vs-dark",
    requirement: "cognac vs dark interior",
    camera: "reference_top_3q",
    a: "interior=cognac",
    b: "interior=black",
    /* THE CASE THE PHASE EXISTS FOR. This is the pair that rendered identically
       in Phase 4.1, and §15 is the reason the area is what it is: the cushions
       and nothing else. If this ever binds wider the number goes UP and the
       case still passes — which is why the QA document records the measured
       value and not only the pass. */
    minChanged: 0.012,
    expect: "every cushion changes; the sole, the liner, the console, the " +
      "rails and the windscreen do not",
  },
  {
    id: "drive-compact-vs-large",
    requirement: "compact vs large motor",
    camera: "reference_stern_3q",
    a: "propulsion=compact",
    b: "propulsion=large",
    minChanged: 0.004,
    expect: "cowling, shaft and lower unit all grow; nothing on the boat moves",
  },
  {
    id: "drive-combustion-vs-electric",
    requirement: "combustion vs electric",
    camera: "reference_stern_3q",
    a: "propulsion=standard",
    b: "propulsion=electric",
    minChanged: 0.003,
    expect: "a different cowling mass and a different leg; the transom is " +
      "untouched, because both hang off the same mount",
  },
  /* ── PHASE 4.4 ────────────────────────────────────────────────────────────
     §34's fourth pair, and the first case in this file whose difference is
     GEOMETRY rather than a material. That makes it the strictest test the
     mechanism has had: a finish change can fail by binding to the wrong zone,
     and a visibility change can additionally fail by the zone not being in the
     asset at all, by `visibleByDefault` being wrong, or by the equipment
     registry never reaching `applyConfiguration`. */
  {
    id: "platform-off-vs-on",
    requirement: "§34 — aft boarding platform, off against on",
    camera: "reference_stern_3q",
    a: "platform=none",
    b: "platform=on",
    /* Smaller than the drive cases look, and for a reason worth writing down:
       the platform is a wide, flat object seen nearly edge-on from the stern
       quarter, so it covers less of the frame than its size suggests. The floor
       is set well under the measured value and well over anti-aliasing. */
    minChanged: 0.004,
    expect:
      "a teak tread on a dark frame appears aft of the transom; the hull, the " +
      "capping, the cushions and the drive are pixel-identical",
  },
  {
    id: "platform-teak-ignores-exterior",
    requirement: "§33 — an exterior change does not recolour the teak",
    camera: "reference_stern_3q",
    a: "platform=on",
    b: "platform=on&exterior=navy",
    /* THE INVERSE ASSERTION, and it needs care: this case must PASS on a
       difference, because the hull genuinely changes. What it proves is bounded
       by `zonesForChannel` in the state tests, which is where "and the teak did
       not" is actually asserted. It is here so that a build which somehow
       painted the tread navy would show up in the same sweep as everything
       else, rather than only in a number. */
    /* 0.03 against a measured 0.045. The floor was first written at 0.05 by
       analogy with `exterior-sage-vs-navy`, which measures 0.106 — and that was
       an assumption rather than a calibration: the side view is most topsides,
       and the stern quarter is mostly the black transom and the drive, so the
       same paint change reaches less than half as many pixels from here. The
       first run failed on it, which is the calibration working. */
    minChanged: 0.03,
    expect:
      "the topsides, the liner and the capping take the navy; the teak tread " +
      "and its frame do not move at all",
  },
] as const;
