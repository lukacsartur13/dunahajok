/**
 * HERO — the authored numbers.
 *
 * Everything the sequence does is a keyframe in this file. No component below
 * invents a position, an angle, a colour or a duration; they interpolate what
 * is written here. That is the difference between a scene that can be
 * art-directed and one that can only be debugged.
 */

import { Color, Vector3 } from "three";

/* ── Palette ─────────────────────────────────────────────────────────────────
   Resolved from tokens.css, not approximated. `zenith` *is* `--depth`, which
   is also the hero section's background: above the horizon the canvas and the
   DOM are the same colour, so the band has no visible top edge.

   Colours are constructed through THREE.Color, which — with the colour
   management react-three-fiber enables by default — converts these sRGB hex
   values into the renderer's linear working space. The output transform puts
   them back. `--depth` in, `--depth` out.                                    */

export const PALETTE = {
  /** --depth */
  zenith: new Color("#0a0e0f"),
  /** Overcast lift at the horizon: the Danube's green-black, one step up. */
  horizon: new Color("#1d2725"),
  /** The far shore, standing on the horizon. Barely above the water itself. */
  bank: new Color("#0c1211"),
  /** Late-day key through cloud. Never warm, never bright. */
  key: new Color("#7d8a80"),
  /** The body of the river, looking straight down into it. */
  deep: new Color("#060a0b"),
  /** Light that comes back *out* of the water off a wave face. */
  scatter: new Color("#17211f"),
  /** Aerated water. Overcast, so it is bone rather than white. */
  foam: new Color("#c6cbc4"),
  /** --signal. The colour the wake becomes when it hands over to the DOM. */
  line: new Color("#f1f0eb"),
} as const;

/**
 * The key light direction.
 *
 * Low (y = 0.13) and behind the vessel's departure side, so its specular path
 * on the water runs from the horizon toward the camera through the area the
 * wake will open into. The sky's own broad lobe lifts that same quadrant, which
 * is what silhouettes the dark hull without lighting anything artificially.
 */
export const KEY_DIR = new Vector3(-0.45, 0.13, -0.88).normalize();

/* ── The vessel in the world ───────────────────────────────────────────────
   +X is downstream and screen-right; the vessel's bow points that way, which
   is the direction the studio plate was photographed facing. The wake
   therefore opens astern, to screen-left, across the frame the boat is
   leaving. The camera sits on +Z.                                            */

export const VESSEL = {
  /** Length overall of the photographed matte, metres. */
  length: 6.72,
  /** Transom inset from the matte's stern edge — where the wake is born. */
  transomInset: 0.28,
  /** Hull footprint on the water, half-extents along × across, metres. */
  hullHalf: [3.05, 1.12] as const,
  /** How deep the hull dissolves into the surface, metres. */
  waterline: 0.16,
  /** Sink the plate slightly so the surface closes over its cut edge. */
  drop: 0.05,
} as const;

/**
 * How far the camera may swing when the vessel is a photograph.
 *
 * A plate has one point of view baked into it. Authored azimuths below carry
 * the full cinematic intent — around 24° of travel — and are scaled by this
 * factor while the vessel is a plate, which lands them at roughly 8°: enough
 * that the camera is unmistakably moving relative to the water and the wake,
 * far short of the angle at which a flat element starts to shear.
 *
 * When `Duna61Cabin.glb` arrives, `VesselModel` reports `source: "model"` and
 * the scale becomes 1. Nothing else in the choreography changes.
 */
export const AZIMUTH_SCALE = { plate: 0.34, model: 1 } as const;

/* ── Camera states ──────────────────────────────────────────────────────────

   Authored in the terms a camera operator would use, not as raw matrices:
   where the camera stands (height above the water, distance out, angle round),
   what it is pointed at, and how long the lens is. Interpolating *these*
   is what keeps the boat's proportions believable — lerping two world-space
   positions and two look-at targets does not, because the distance to the
   subject drifts and the vessel breathes in and out of the frame.

   `hfov` is the HORIZONTAL field of view. The band is a 3.5:1 letterbox on a
   laptop and closer to 1.5:1 on a phone; locking the horizontal angle is what
   keeps a 6.72 m boat the same fraction of the frame's *width* on both, which
   is the dimension the eye judges a hull's length against.                    */

export interface CameraState {
  /** Where in the hero's 0–1 scroll range this composition is exact. */
  at: number;
  /** Degrees around the vessel. 0 is dead abeam; negative swings astern. */
  azimuth: number;
  /** Eye height above the waterline, metres. */
  height: number;
  /** Horizontal distance from the look-at point, metres. */
  distance: number;
  /** Horizontal field of view, degrees. */
  hfov: number;
  /** Look-at height above the waterline, metres. */
  targetY: number;
  /**
   * Look-at offset from the vessel along X, metres. Negative pushes the
   * vessel to the right of frame and opens the space its wake fills.
   */
  targetOffset: number;

  /** Vessel travel downstream from its opening position, metres. */
  vesselAlong: number;
  /** 0 at rest, 1 at cruising. Drives the entire wake, not just its size. */
  speed: number;
  /** Master water amplitude. 0.45 is close to glass; 1 is a working river. */
  waveAmp: number;
  /** Length of the wake behind the transom, metres. */
  wakeLength: number;
  /** Wake displacement amplitude, metres. */
  wakeLift: number;
  /** 0 physical wake, 1 graphic hairline. The handoff to the DOM. */
  lineify: number;
  /** Scene opacity. Ramps up over the photograph, and out at the very end. */
  fade: number;
}

/**
 * DESKTOP — the 3.5:1 river band.
 *
 * ENTRY      Almost nothing happens. A boat sitting on controlled water before
 *            anyone has touched the throttle. The camera is abeam and low, the
 *            water barely moving, no wake at all.
 * REVEAL     The stern begins to disturb. The camera lifts a few centimetres
 *            and drifts a degree. The lens has not changed.
 * PROFILE    The camera swings astern and up, and the hull turns from an
 *            elevation into a three-quarter view. The wake opens into the Duna
 *            geometry. This is the composition the section is really about.
 * DEPARTURE  The vessel leaves the opening frame entirely. What is left is the
 *            wake, and the wake is already becoming a drawing.
 */
export const DESKTOP_STATES: readonly CameraState[] = [
  {
    at: 0,
    azimuth: 6,
    height: 1.38,
    distance: 22.5,
    hfov: 43,
    targetY: 0.92,
    targetOffset: -2.4,
    vesselAlong: 0,
    speed: 0,
    waveAmp: 0.42,
    wakeLength: 10,
    wakeLift: 0.05,
    lineify: 0,
    fade: 1,
  },
  {
    at: 0.26,
    azimuth: 1,
    height: 1.95,
    distance: 20.8,
    hfov: 44,
    targetY: 1.05,
    targetOffset: -2.9,
    vesselAlong: 0.7,
    speed: 0.3,
    waveAmp: 0.72,
    wakeLength: 16,
    wakeLift: 0.11,
    lineify: 0,
    fade: 1,
  },
  {
    at: 0.6,
    azimuth: -9,
    height: 3.55,
    distance: 19.6,
    hfov: 46,
    targetY: 1.15,
    targetOffset: -3.6,
    vesselAlong: 3.4,
    speed: 0.8,
    waveAmp: 1,
    wakeLength: 26,
    wakeLift: 0.21,
    lineify: 0,
    fade: 1,
  },
  {
    at: 1,
    azimuth: -18,
    height: 5.8,
    distance: 21.5,
    hfov: 48,
    targetY: 1.05,
    targetOffset: -6.6,
    vesselAlong: 9.4,
    speed: 1,
    waveAmp: 1.05,
    wakeLength: 40,
    wakeLift: 0.24,
    lineify: 1,
    fade: 0.82,
  },
];

/**
 * MOBILE — a taller, much narrower frame.
 *
 * Not the desktop camera cropped. A phone gets one legible idea per frame, so
 * this composition is built around the silhouette: closer in, a longer lens, a
 * higher eye so the wake is read from above as a shape rather than edge-on as
 * a texture, and roughly half the camera travel. The vessel still departs, and
 * the wake still becomes the line — the choreography is identical, the framing
 * is redrawn.
 */
export const MOBILE_STATES: readonly CameraState[] = [
  {
    at: 0,
    azimuth: 4,
    height: 1.5,
    distance: 15.5,
    hfov: 34,
    targetY: 1.0,
    targetOffset: -0.6,
    vesselAlong: 0,
    speed: 0,
    waveAmp: 0.42,
    wakeLength: 9,
    wakeLift: 0.05,
    lineify: 0,
    fade: 1,
  },
  {
    at: 0.26,
    azimuth: 1,
    height: 1.75,
    distance: 15,
    hfov: 35,
    targetY: 1.05,
    targetOffset: -1.1,
    vesselAlong: 0.5,
    speed: 0.2,
    waveAmp: 0.72,
    wakeLength: 16,
    wakeLift: 0.09,
    lineify: 0,
    fade: 1,
  },
  {
    at: 0.6,
    azimuth: -5,
    height: 2.7,
    distance: 14.6,
    hfov: 39,
    targetY: 1.08,
    targetOffset: -1.5,
    vesselAlong: 2.4,
    speed: 0.74,
    waveAmp: 1,
    wakeLength: 27,
    wakeLift: 0.18,
    lineify: 0,
    fade: 1,
  },
  {
    at: 1,
    azimuth: -10,
    height: 4.1,
    distance: 15.4,
    hfov: 40,
    targetY: 0.98,
    targetOffset: -3.6,
    vesselAlong: 6.6,
    speed: 1,
    waveAmp: 1.05,
    wakeLength: 38,
    wakeLift: 0.22,
    lineify: 1,
    fade: 0.82,
  },
];

/**
 * REDUCED MOTION — one frame, and it has to be the good one.
 *
 * Not "the sequence, paused at zero". Zero is deliberately the least
 * interesting composition in the sequence: it is stillness, and stillness only
 * means anything as the thing that gets broken. So the still frame is composed
 * at the point the sequence is *about* — the vessel abeam with the wake open —
 * with the water reduced to a slow, non-animating surface.
 */
export const STILL_STATE: CameraState = {
  at: 0,
  azimuth: -4,
  height: 1.75,
  distance: 21,
  hfov: 46,
  targetY: 1,
  targetOffset: -4.6,
  vesselAlong: 1.6,
  speed: 0.5,
  waveAmp: 0.34,
  wakeLength: 27,
  wakeLift: 0.13,
  lineify: 0,
  fade: 1,
};

export const STILL_STATE_MOBILE: CameraState = {
  ...STILL_STATE,
  azimuth: -3,
  height: 1.95,
  distance: 15,
  hfov: 36,
  targetOffset: -1.9,
  vesselAlong: 1.2,
  wakeLength: 21,
};

/* ── Water surface ───────────────────────────────────────────────────────── */

export const WATER = {
  /** Radius of the surface disc, metres. Beyond it the shader resolves to sky. */
  radius: 1500,
  /**
   * Radial distribution exponent. Rings are packed toward the centre so the
   * 60 m the composition actually contains gets the geometry, and the 1.4 km
   * behind it — which is at grazing incidence and analytically flattened by
   * the shader anyway — costs a handful of rings.
   */
  falloff: 3.6,
  /** Downstream drift of the whole field, metres per second. */
  drift: 0.16,
  /** How dark the hull's occlusion patch on the water gets, 0–1. */
  hullShade: 0.42,
} as const;

/**
 * On-screen weight of the graphic wake, in CSS pixels.
 *
 * Matched to the DOM WakeLine's 1px non-scaling stroke, plus the width the
 * gaussian falloff adds either side. The uniform the shader receives is
 * derived from this each frame against the live field of view — see
 * HeroVesselScene — so the hairline is the same weight in a 224 px laptop band
 * as in a 300 px phone one.
 */
export const LINE_WIDTH_PX = 1.7;

/** Per-metre atmospheric haze between the camera and the vessel. */
export const HAZE = 0.0042;

/* ── Timing ──────────────────────────────────────────────────────────────── */

export const TIMING = {
  /** Seconds the live scene takes to crossfade in over the photograph. */
  handover: 1.1,
  /** Frames rendered before the scene claims its slot, so it is never empty. */
  warmupFrames: 3,
} as const;
